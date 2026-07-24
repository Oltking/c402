// hello-c402 server - a confidential, pay-per-call endpoint in one c402() call.
// The protocol boilerplate is the c402({...}) block; everything inside `compute`
// is the confidential computation itself (a real Nox round-trip against the CDE).
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
const CDE = process.env.CDE_ADDRESS as Address;
const REGISTRY = process.env.DECISION_REGISTRY_ADDRESS as Address;
const abi = parseAbi([
  "function decide(bytes32,bytes,bytes32,bytes) returns (uint256)",
  "function decisionCount() view returns (uint256)",
  "function actionOf(uint256) view returns (bytes32)",
  "struct Decision { uint256 id; bytes32 commitment; address cde; address caller; uint64 timestamp; uint256 blockNumber; }",
  "function getDecision(uint256) view returns (Decision)",
]);

const app = express();
app.use(express.json());
app.post("/decide", c402({
  price: "0.01",
  token: process.env.USDC_ADDRESS as Address,
  tokenDomain: { name: "USDC", version: "2" },
  network: "eip155:11155111",
  facilitator: process.env.FACILITATOR_URL ?? "http://localhost:4022",
  payTo: account.address,
  contract: CDE,
  coordinator: "0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf",
  schema: { input: "euint256", output: "treasury-action" },
  description: "Confidential treasury decision - pay per confidential thought.",
  compute: async (input) => {
    const { exposure = 6000, signal = 50 } = (input ?? {}) as { exposure?: number; signal?: number };
    const handle = await handleP;
    const exp = await handle.encryptInput(BigInt(exposure), "uint256", CDE);
    const sig = await handle.encryptInput(BigInt(signal), "uint256", CDE);
    const tx = await wallet.writeContract({ address: CDE, abi, functionName: "decide", args: [exp.handle, exp.handleProof, sig.handle, sig.handleProof] });
    await pub.waitForTransactionReceipt({ hash: tx });
    const id = await pub.readContract({ address: CDE, abi, functionName: "decisionCount" }) as bigint;
    const d = await pub.readContract({ address: REGISTRY, abi, functionName: "getDecision", args: [id] }) as { commitment: Hex };
    const actionHandle = await pub.readContract({ address: CDE, abi, functionName: "actionOf", args: [id] }) as Hex;
    return { result: { decisionId: id.toString() }, decisionId: id, commitment: d.commitment, registry: REGISTRY, tx, outputHandles: { action: actionHandle } };
  },
}));
app.listen(4025, () => console.log("hello-c402 server on http://localhost:4025  (POST /decide)"));
