#!/usr/bin/env node
/**
 * c402 — a generic CLI for the confidential-compute-over-x402 protocol.
 *
 *   c402 inspect <url>                 decode the 402 handshake (no wallet needed)
 *   c402 call <url> --key <k> ...      pay with your wallet + verify the attestation
 *   c402 verify <attestation.json>     re-verify an attestation on-chain, standalone
 *
 * Works against ANY c402 server — this repo's treasury/payroll endpoints or someone else's.
 */
import { readFileSync } from "node:fs";
import { Command } from "commander";
import c from "picocolors";
import ora from "ora";
import { privateKeyToAccount } from "viem/accounts";
import { COMPUTE_REQUIRED_HEADER, decodeComputeRequired, type Attestation } from "@c402/spec";
import { c402Fetch } from "@c402/client";
import { verifyAttestation } from "@c402/verify";

const DEFAULT_NETWORK = "eip155:11155111";

function head(t: string) { console.log(c.bold(c.white("\n  " + t))); }
function kv(k: string, v: string) { console.log("  " + c.dim(k.padEnd(14)) + v); }
function checkline(name: string, ok: boolean, detail?: string) {
  console.log("    " + (ok ? c.green("✓") : c.red("✗")) + " " + name.padEnd(22) + (detail ? c.dim(detail) : ""));
}
function resolveKey(opt?: string): `0x${string}` {
  let k = opt || process.env.C402_KEY || process.env.SEPOLIA_PRIVATE_KEY || "";
  if (!k) throw new Error("no wallet key — pass --key, or set C402_KEY / SEPOLIA_PRIVATE_KEY");
  if (!k.startsWith("0x")) k = "0x" + k;
  return k as `0x${string}`;
}
function resolveRpc(opt?: string): string {
  const r = opt || process.env.SEPOLIA_RPC_URL;
  if (!r) throw new Error("no RPC — pass --rpc, or set SEPOLIA_RPC_URL");
  return r;
}
function parseBody(opts: { body?: string; bodyFile?: string }): unknown {
  const raw = opts.bodyFile ? readFileSync(opts.bodyFile, "utf8") : (opts.body ?? "{}");
  try { return JSON.parse(raw); } catch { throw new Error("--body is not valid JSON"); }
}

const program = new Command();
program.name("c402").description("Call any c402 confidential-compute endpoint from the terminal").version("0.1.0");

program
  .command("inspect")
  .argument("<url>", "c402 endpoint URL")
  .description("Decode the 402 handshake (Compute-Required + PAYMENT-REQUIRED) — no wallet needed")
  .action(async (url: string) => {
    const spin = ora("fetching 402 handshake…").start();
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const crRaw = r.headers.get(COMPUTE_REQUIRED_HEADER);
      const prRaw = r.headers.get("payment-required");
      spin.stop();
      if (!crRaw) {
        console.log(c.yellow(`\n  Not a c402 endpoint — no Compute-Required header (HTTP ${r.status}).`));
        return;
      }
      const cr = decodeComputeRequired(crRaw);
      head(`c402 endpoint · HTTP ${r.status}`);
      kv("TEE", c.cyan(cr.tee));
      kv("network", cr.network);
      kv("contract", c.cyan(cr.contract));
      kv("input", `${cr.input.schema} · ${cr.input.encoding}`);
      kv("output", cr.output.schema);
      if (cr.description) kv("about", c.dim(cr.description));
      if (prRaw) {
        try {
          const pr = JSON.parse(Buffer.from(prRaw, "base64").toString("utf8")) as { accepts?: { amount?: string; asset?: string; network?: string }[] };
          const a = pr.accepts?.[0];
          if (a) { head("payment"); kv("amount", `${a.amount} (atomic)`); kv("asset", c.cyan(a.asset ?? "")); kv("network", a.network ?? ""); }
        } catch { /* ignore */ }
      }
      console.log(c.dim(`\n  Pay it:  c402 call ${url} --body '{…}'\n`));
    } catch (e) {
      spin.fail(e instanceof Error ? e.message : "inspect failed");
      process.exit(1);
    }
  });

program
  .command("call")
  .argument("<url>", "c402 endpoint URL")
  .option("--key <hex>", "payer wallet private key (or env C402_KEY / SEPOLIA_PRIVATE_KEY)")
  .option("--rpc <url>", "RPC URL (or env SEPOLIA_RPC_URL)")
  .option("--network <caip2>", "CAIP-2 network id", DEFAULT_NETWORK)
  .option("--body <json>", "request body as JSON", "{}")
  .option("--body-file <path>", "read request body from a JSON file")
  .option("--no-verify", "skip on-chain attestation re-verification")
  .option("--json", "print raw JSON only")
  .description("Pay a c402 endpoint with your wallet and print the attested result")
  .action(async (url: string, opts: { key?: string; rpc?: string; network: string; body?: string; bodyFile?: string; verify?: boolean; json?: boolean }) => {
    const spin = opts.json ? null : ora("paying + computing in the TEE…").start();
    try {
      const signer = privateKeyToAccount(resolveKey(opts.key));
      const rpcUrl = resolveRpc(opts.rpc);
      const body = parseBody(opts);
      const call = c402Fetch({ signer, network: opts.network, rpcUrl, verify: opts.verify !== false });
      const res = await call(url, { body });

      if (opts.json) { console.log(JSON.stringify(res, null, 2)); return; }
      spin!.succeed("done");

      head("result");
      console.log("  " + JSON.stringify(res.result));
      if (res.attestation) {
        head("attestation");
        kv("standard", c.cyan(res.attestation.standard));
        if (res.attestation.decisionId) kv("decisionId", res.attestation.decisionId);
        if (res.attestation.commitment) kv("commitment", res.attestation.commitment);
        if (res.attestation.tx) kv("tx", c.cyan(res.attestation.tx));
      }
      if (res.verified) {
        head(`verified on-chain: ${res.verified.valid ? c.green("YES") : c.red("NO")}`);
        for (const ch of res.verified.checks) checkline(ch.name, ch.ok, ch.detail);
      }
      console.log();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "call failed";
      if (spin) spin.fail(msg); else console.error(msg);
      process.exit(1);
    }
  });

program
  .command("verify")
  .argument("<attestation.json>", "path to an attestation JSON (as printed by `c402 call --json` → .attestation)")
  .option("--rpc <url>", "RPC URL (or env SEPOLIA_RPC_URL)")
  .description("Re-verify a c402 attestation on-chain, standalone — no server needed")
  .action(async (path: string, opts: { rpc?: string }) => {
    const spin = ora("re-reading commitment from chain…").start();
    try {
      const att = JSON.parse(readFileSync(path, "utf8")) as Attestation;
      const result = await verifyAttestation(att, { rpcUrl: resolveRpc(opts.rpc) });
      spin.stop();
      head(`verified on-chain: ${result.valid ? c.green("YES") : c.red("NO")}`);
      for (const ch of result.checks) checkline(ch.name, ch.ok, ch.detail);
      console.log();
      process.exit(result.valid ? 0 : 1);
    } catch (e) {
      spin.fail(e instanceof Error ? e.message : "verify failed");
      process.exit(1);
    }
  });

program.parseAsync();
