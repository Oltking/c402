// c402 example: CONFIDENTIAL PAYROLL - a second, genuinely different app on the same protocol.
// A manager submits an encrypted remaining budget + an encrypted requested raise; the TEE decides
// APPROVE / DEFER / REJECT against an encrypted policy cap, and nobody - not even the server host -
// sees the numbers. Same c402 wiring as the treasury CDE; entirely different computation.
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createWalletClient, createPublicClient, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient } from "@iexec-nox/handle";
import { c402 } from "@c402/server";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });
const pk = (process.env.SEPOLIA_PRIVATE_KEY!.startsWith("0x") ? "" : "0x") + process.env.SEPOLIA_PRIVATE_KEY!;
const account = privateKeyToAccount(pk as Hex);
const transport = http(process.env.SEPOLIA_RPC_URL!);
const wallet = createWalletClient({ account, chain: sepolia, transport });
const pub = createPublicClient({ chain: sepolia, transport });
const handleP = createViemHandleClient(wallet);
const PAYROLL = process.env.PAYROLL_CDE_ADDRESS as Address;
const REGISTRY = process.env.PAYROLL_REGISTRY_ADDRESS as Address;
const abi = parseAbi([
  "function decide(bytes32,bytes,bytes32,bytes) returns (uint256)",
  "function decisionCount() view returns (uint256)",
  "function actionOf(uint256) view returns (bytes32)",
  "struct Decision { uint256 id; bytes32 commitment; address cde; address caller; uint64 timestamp; uint256 blockNumber; }",
  "function getDecision(uint256) view returns (Decision)",
]);
const ACTIONS = ["APPROVE", "DEFER", "REJECT"];

const app = express();
app.use(express.json());
app.post("/decide", c402({
  price: "0.005",
  token: process.env.USDC_ADDRESS as Address,
  tokenDomain: { name: "USDC", version: "2" },
  network: "eip155:11155111",
  facilitator: process.env.FACILITATOR_URL ?? "http://localhost:4022",
  payTo: account.address,
  contract: PAYROLL,
  coordinator: "0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf",
  schema: { input: "euint256", output: "payroll-action" },
  description: "Confidential payroll raise decision - approve/defer/reject without revealing budgets.",
  compute: async (input) => {
    const { budget = 100000, requested = 5000 } = (input ?? {}) as { budget?: number; requested?: number };
    const handle = await handleP;
    const b = await handle.encryptInput(BigInt(budget), "uint256", PAYROLL);
    const r = await handle.encryptInput(BigInt(requested), "uint256", PAYROLL);
    const tx = await wallet.writeContract({ address: PAYROLL, abi, functionName: "decide", args: [b.handle, b.handleProof, r.handle, r.handleProof] });
    await pub.waitForTransactionReceipt({ hash: tx });
    const id = await pub.readContract({ address: PAYROLL, abi, functionName: "decisionCount" }) as bigint;
    const actionHandle = await pub.readContract({ address: PAYROLL, abi, functionName: "actionOf", args: [id] }) as Hex;
    const d = await pub.readContract({ address: REGISTRY, abi, functionName: "getDecision", args: [id] }) as { commitment: Hex };
    // The action is ACL-gated to the payroll runtime; decrypt it as that runtime.
    const action = await retry(() => handle.decrypt(actionHandle));
    return {
      result: { decisionId: id.toString(), action: ACTIONS[Number(action.value)] ?? "UNKNOWN" },
      decisionId: id, commitment: d.commitment, registry: REGISTRY, tx, outputHandles: { action: actionHandle },
    };
  },
}));
app.listen(4026, () => console.log("c402 payroll server on http://localhost:4026  (POST /decide)"));

async function retry<T>(fn: () => Promise<T>, tries = 30, delayMs = 6000): Promise<T> {
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (/access_denied|not a viewer|status:\s*403|not yet computed/i.test(m) && i < tries) { await new Promise((r) => setTimeout(r, delayMs)); continue; }
      throw e;
    }
  }
  throw new Error("exhausted retries");
}
