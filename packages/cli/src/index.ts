#!/usr/bin/env node
import { Command } from "commander";
import c from "picocolors";
import ora from "ora";
import { parseAbi, type Address } from "viem";
import {
  loadConfig,
  makeClients,
  readMarketState,
  verifyDecision,
  ABIS,
  EXPLORER,
} from "@xcat/sdk";
import { runTreasuryLoop } from "@xcat/runtime";

const ERC20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

function banner() {
  console.log(c.cyan(c.bold("\n  xCAT")) + c.dim("  · confidential autonomous treasury  · Ethereum Sepolia\n"));
}
function kv(k: string, v: string) {
  console.log("  " + c.dim(k.padEnd(16)) + v);
}
function head(t: string) {
  console.log(c.bold(c.white("\n  " + t)));
}

const program = new Command();
program.name("xcat").description("Confidential autonomous treasury for Safe (iExec Nox + x402 + Uniswap)").version("0.1.0");

program
  .command("status")
  .description("Show workspace addresses, service health, and live on-chain state")
  .action(async () => {
    banner();
    const cfg = loadConfig();
    const clients = makeClients(cfg);

    head("Contracts (Sepolia)");
    kv("CDE", c.cyan(cfg.addr.cde));
    kv("Registry", c.cyan(cfg.addr.registry));
    kv("PaymentMeter", c.cyan(cfg.addr.meter));
    kv("EventBus", c.cyan(cfg.addr.eventBus));
    kv("Safe", c.cyan(cfg.addr.safe));

    head("Services");
    for (const [name, url] of [["facilitator", cfg.facilitatorUrl], ["cde-api", cfg.cdeApiUrl]] as const) {
      const ok = await fetch(`${url}/health`).then((r) => r.ok).catch(() => false);
      kv(name, ok ? c.green("● up   ") + c.dim(url) : c.red("● down ") + c.dim(url));
    }

    const s = ora("reading on-chain state").start();
    const [decisions, events, market, safeUsdc, safeWeth] = await Promise.all([
      clients.publicClient.readContract({ address: cfg.addr.cde, abi: ABIS.cde(), functionName: "decisionCount" }) as Promise<bigint>,
      clients.publicClient.readContract({ address: cfg.addr.eventBus, abi: ABIS.eventBus(), functionName: "eventCount" }) as Promise<bigint>,
      readMarketState(clients, cfg),
      clients.publicClient.readContract({ address: cfg.addr.usdc, abi: ERC20, functionName: "balanceOf", args: [cfg.addr.safe] }) as Promise<bigint>,
      clients.publicClient.readContract({ address: cfg.addr.weth, abi: ERC20, functionName: "balanceOf", args: [cfg.addr.safe] }) as Promise<bigint>,
    ]);
    s.stop();

    head("Live state");
    kv("decisions", c.yellow(decisions.toString()));
    kv("events", c.yellow(events.toString()));
    kv("market", `${c.yellow(Math.round(market.priceUsdcPerWeth).toString())} USDC/WETH  ` + c.dim(`exposure ${market.exposureBps}bps · signal ${market.signal}`));
    kv("Safe holds", `${c.green((Number(safeUsdc) / 1e6).toFixed(2))} USDC  ${c.green((Number(safeWeth) / 1e18).toFixed(6))} WETH`);
    console.log();
  });

program
  .command("market")
  .description("Show current real market state (Uniswap pool + Safe exposure)")
  .action(async () => {
    banner();
    const cfg = loadConfig();
    const clients = makeClients(cfg);
    const s = ora("reading Uniswap pool").start();
    const m = await readMarketState(clients, cfg);
    s.succeed("market state");
    kv("pool", c.cyan(m.pool));
    kv("price", `${c.yellow(Math.round(m.priceUsdcPerWeth).toString())} USDC/WETH`);
    kv("tick", m.tick.toString());
    kv("exposure", `${m.exposureBps} bps`);
    kv("signal", m.signal.toString());
    console.log();
  });

program
  .command("run")
  .description("Run one full confidential treasury cycle hands-free")
  .action(async () => {
    banner();
    head("Running confidential treasury loop");
    console.log();
    const trace = await runTreasuryLoop(loadConfig(), (m) => console.log("  " + c.dim(m)));
    head("Result");
    kv("decision", `#${trace.observation.decision.decisionId} ${c.green(trace.observation.decision.action)} ` + c.dim(`(confidence ${trace.observation.decision.confidence})`));
    kv("event", `#${trace.observation.eventId}`);
    const ex = trace.treasury.execution;
    kv("executed", ex.executed ? c.green(ex.direction!) : c.yellow(ex.note ?? "—"));
    if (ex.swapExplorer) kv("swap tx", c.cyan(ex.swapExplorer));
    kv("commitment", c.dim(trace.commitment));
    console.log();
  });

program
  .command("verify <decisionId>")
  .description("Verify a decision commitment on-chain (the no-mock-data proof)")
  .action(async (decisionId: string) => {
    banner();
    const cfg = loadConfig();
    const clients = makeClients(cfg);
    const s = ora(`verifying decision #${decisionId}`).start();
    try {
      const r = await verifyDecision(clients, cfg, BigInt(decisionId));
      s.succeed(`decision #${decisionId} is committed on-chain`);
      kv("commitment", c.green(r.commitment));
      kv("cde", c.cyan(r.cde));
      kv("caller", c.cyan(r.caller));
      kv("block", r.blockNumber.toString());
      kv("registry", c.dim(`${EXPLORER}/address/${cfg.addr.registry}`));
      console.log();
    } catch (e) {
      s.fail(`could not verify decision #${decisionId}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("deploy")
  .description("Check the workspace contracts are deployed on the target network")
  .option("-n, --network <network>", "target network", "sepolia")
  .action(async (opts: { network: string }) => {
    banner();
    if (opts.network !== "sepolia") {
      console.log(c.red(`  Only 'sepolia' is supported (got '${opts.network}')`));
      process.exitCode = 1;
      return;
    }
    const cfg = loadConfig();
    const clients = makeClients(cfg);
    head("Contracts on Sepolia");
    const entries: [string, Address][] = [
      ["CDE", cfg.addr.cde], ["Registry", cfg.addr.registry], ["PaymentMeter", cfg.addr.meter], ["EventBus", cfg.addr.eventBus], ["Safe", cfg.addr.safe],
    ];
    for (const [name, addr] of entries) {
      const code = await clients.publicClient.getCode({ address: addr });
      const deployed = !!code && code !== "0x";
      kv(name, (deployed ? c.green("● deployed ") : c.red("● missing  ")) + c.dim(`${EXPLORER}/address/${addr}`));
    }
    console.log(c.dim("\n  Run ") + c.bold("xcat run") + c.dim(" to execute one confidential treasury cycle.\n"));
  });

program.parseAsync().catch((e) => {
  console.error(c.red("error:"), e instanceof Error ? e.message : e);
  process.exit(1);
});
