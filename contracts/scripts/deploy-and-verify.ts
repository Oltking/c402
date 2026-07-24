/**
 * Phase 1 Sepolia gate: deploy CDE + DecisionRegistry to Ethereum Sepolia, then run
 * the full encrypt -> confidential decide -> ACL-gated decrypt roundtrip against the
 * REAL Nox stack using the @iexec-nox/handle SDK. Prints Etherscan links and writes
 * deployed addresses to docs/deployments.sepolia.json. No mock data.
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient, NotYetComputedHandleError } from "@iexec-nox/handle";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

const RPC = requireEnv("SEPOLIA_RPC_URL");
let PK = requireEnv("SEPOLIA_PRIVATE_KEY");
if (!PK.startsWith("0x")) PK = "0x" + PK;

const account = privateKeyToAccount(PK as Hex);
const transport = http(RPC);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ account, chain: sepolia, transport });

const EXPLORER = "https://sepolia.etherscan.io";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

function loadArtifact(name: string, file: string): { abi: Abi; bytecode: Hex } {
  const p = resolve(__dirname, `../artifacts/contracts/${file}.sol/${name}.json`);
  const a = JSON.parse(readFileSync(p, "utf8"));
  return { abi: a.abi as Abi, bytecode: a.bytecode as Hex };
}

async function deploy(name: string, file: string, args: unknown[]): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name, file);
  const hash = await walletClient.deployContract({ abi, bytecode, args, account, chain: sepolia });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  if (!rcpt.contractAddress) throw new Error(`${name} deploy produced no address`);
  console.log(`  ✔ ${name.padEnd(17)} ${rcpt.contractAddress}   ${EXPLORER}/tx/${hash}`);
  return { address: rcpt.contractAddress, abi };
}

async function send(c: { address: Address; abi: Abi }, functionName: string, args: unknown[]): Promise<Hex> {
  const hash = await walletClient.writeContract({ address: c.address, abi: c.abi, functionName, args, account, chain: sepolia });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function read<T>(c: { address: Address; abi: Abi }, functionName: string, args: unknown[] = []): Promise<T> {
  return publicClient.readContract({ address: c.address, abi: c.abi, functionName, args }) as Promise<T>;
}

// The TEE computes asynchronously after the on-chain decide() tx; poll until ready.
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 30, delayMs = 6000): Promise<T> {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof NotYetComputedHandleError && i < tries) {
        process.stdout.write(`    …${label} not computed yet (attempt ${i}/${tries}), waiting ${delayMs / 1000}s\n`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${label}: exhausted retries`);
}

async function main() {
  console.log(`\nDeployer: ${account.address}`);
  const bal = await publicClient.getBalance({ address: account.address });
  console.log(`Balance : ${Number(bal) / 1e18} ETH\n`);
  if (bal === 0n) throw new Error("Deployer has 0 ETH - fund it before deploying.");

  console.log("Deploying to Ethereum Sepolia:");
  const registry = await deploy("DecisionRegistry", "DecisionRegistry", []);
  const treasuryRuntime = account.address; // demo: deployer doubles as the runtime that decrypts
  const cde = await deploy("CDE", "CDE", [registry.address, treasuryRuntime]);

  console.log("\nAuthorizing CDE as registry recorder…");
  await send(registry, "setRecorder", [cde.address, true]);

  console.log("Creating Nox handle client (auto-configured for Sepolia)…");
  const handle = await createViemHandleClient(walletClient);

  console.log("Setting encrypted policy (hedgeThreshold=5000, signalThreshold=100)…");
  const hedge = await handle.encryptInput(5000n, "uint256", cde.address);
  const signalT = await handle.encryptInput(100n, "uint256", cde.address);
  await send(cde, "setPolicy", [hedge.handle, hedge.handleProof, signalT.handle, signalT.handleProof]);

  console.log("Submitting encrypted decision (exposure=6000 > threshold → expect HEDGE)…");
  const exposure = await handle.encryptInput(6000n, "uint256", cde.address);
  const signal = await handle.encryptInput(50n, "uint256", cde.address);
  const decideTx = await send(cde, "decide", [exposure.handle, exposure.handleProof, signal.handle, signal.handleProof]);
  console.log(`  decide tx: ${EXPLORER}/tx/${decideTx}`);

  const id = await read<bigint>(cde, "decisionCount");
  const actionHandle = await read<Hex>(cde, "actionOf", [id]);
  const confHandle = await read<Hex>(cde, "confidenceOf", [id]);

  console.log(`\nDecrypting decision #${id} via Nox (ACL-gated action + public confidence)…`);
  const action = await withRetry(() => handle.decrypt(actionHandle), "action");
  const confidence = await withRetry(() => handle.publicDecrypt(confHandle), "confidence");

  const decision = await read<{ commitment: Hex; caller: Address; blockNumber: bigint }>(registry, "getDecision", [id]);

  const actionName = ["HOLD", "HEDGE", "ACCUMULATE"][Number(action.value)] ?? "UNKNOWN";
  console.log("\n──────── RESULT ────────");
  console.log(`decision id   : ${id}`);
  console.log(`action (ACL)  : ${action.value} (${actionName})`);
  console.log(`confidence    : ${confidence.value}`);
  console.log(`commitment    : ${decision.commitment}`);
  console.log(`CDE           : ${EXPLORER}/address/${cde.address}`);
  console.log(`Registry      : ${EXPLORER}/address/${registry.address}`);
  console.log("────────────────────────");

  if (action.value !== 1n) throw new Error(`Expected HEDGE (1) but got ${action.value}`);
  if (confidence.value !== 100n) throw new Error(`Expected confidence 100 but got ${confidence.value}`);

  const out = {
    network: "ethereum-sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    treasuryRuntime,
    contracts: { DecisionRegistry: registry.address, CDE: cde.address },
    firstDecision: {
      id: id.toString(),
      action: actionName,
      confidence: confidence.value.toString(),
      commitment: decision.commitment,
      decideTx,
    },
  };
  const outPath = resolve(__dirname, "../../docs/deployments.sepolia.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n✅ Phase 1 Sepolia gate PASSED. Wrote ${outPath}`);
}

main().catch((e) => {
  console.error("\n❌ Failed:", e);
  process.exit(1);
});
