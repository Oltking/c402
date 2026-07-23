/**
 * Deploy the PayrollCDE (the SECOND c402 confidential app) to Ethereum Sepolia with its
 * OWN DecisionRegistry (the registry is keyed by id, so each engine needs its own), set the
 * encrypted policy cap, and run a real encrypt -> confidential decide -> ACL-gated decrypt
 * roundtrip against the live Nox stack. Writes docs/payroll.sepolia.json. No mock data.
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem";
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
  const a = JSON.parse(readFileSync(resolve(__dirname, `../artifacts/contracts/${file}.sol/${name}.json`), "utf8"));
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
async function send(c: { address: Address; abi: Abi }, fn: string, args: unknown[]): Promise<Hex> {
  const hash = await walletClient.writeContract({ address: c.address, abi: c.abi, functionName: fn, args, account, chain: sepolia });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
async function read<T>(c: { address: Address; abi: Abi }, fn: string, args: unknown[] = []): Promise<T> {
  return publicClient.readContract({ address: c.address, abi: c.abi, functionName: fn, args }) as Promise<T>;
}
async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 30, delayMs = 6000): Promise<T> {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if ((e instanceof NotYetComputedHandleError || /access_denied|not a viewer|status:\s*403|not yet computed/i.test(msg)) && i < tries) {
        process.stdout.write(`    …${label} not ready (attempt ${i}/${tries}), waiting ${delayMs / 1000}s\n`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`exhausted retries: ${label}`);
}

async function main() {
  console.log(`Deployer ${account.address}`);
  const runtime = (process.env.TREASURY_RUNTIME_ADDRESS as Address) ?? account.address;

  console.log("\nDeploying PayrollCDE stack…");
  const registry = await deploy("DecisionRegistry", "DecisionRegistry", []);
  const payroll = await deploy("PayrollCDE", "PayrollCDE", [registry.address, runtime]);
  await send(registry, "setRecorder", [payroll.address, true]);
  console.log(`  ✔ registry authorized PayrollCDE as recorder`);

  const handle = await createViemHandleClient(walletClient);

  console.log("\nSetting encrypted policy cap (20000)…");
  const cap = await handle.encryptInput(20000n, "uint256", payroll.address);
  await send(payroll, "setPolicy", [cap.handle, cap.handleProof]);

  console.log("\nRunning confidential decision: budget=100000, requested=5000 (expect APPROVE / conf 100)…");
  const budget = await handle.encryptInput(100000n, "uint256", payroll.address);
  const requested = await handle.encryptInput(5000n, "uint256", payroll.address);
  await send(payroll, "decide", [budget.handle, budget.handleProof, requested.handle, requested.handleProof]);

  const id = await read<bigint>(payroll, "decisionCount");
  const actionHandle = await read<Hex>(payroll, "actionOf", [id]);
  const confHandle = await read<Hex>(payroll, "confidenceOf", [id]);
  const action = await withRetry(() => handle.decrypt(actionHandle), "action");
  const conf = await withRetry(() => handle.publicDecrypt(confHandle), "confidence");
  const actionName = ["APPROVE", "DEFER", "REJECT"][Number(action.value)] ?? "UNKNOWN";
  console.log(`\n  → decision #${id}: ${actionName} (confidence ${conf.value})`);

  const out = {
    network: "ethereum-sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    contracts: { DecisionRegistry: registry.address, PayrollCDE: payroll.address },
    firstDecision: { id: id.toString(), action: actionName, confidence: conf.value.toString() },
  };
  writeFileSync(resolve(__dirname, "../../docs/payroll.sepolia.json"), JSON.stringify(out, null, 2));
  console.log(`\n✅ Wrote docs/payroll.sepolia.json`);
  console.log(`   PayrollCDE      : ${payroll.address}`);
  console.log(`   DecisionRegistry: ${registry.address}`);
  if (actionName !== "APPROVE") throw new Error(`expected APPROVE, got ${actionName}`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
