/**
 * xCAT CDE API - the first c402 server.
 *
 * POST /v1/decide is a c402 confidential-compute endpoint: on an unpaid request it returns
 * HTTP 402 with the x402 PAYMENT-REQUIRED header AND the c402 COMPUTE-REQUIRED header; on a paid
 * request it runs a REAL confidential decision inside the iExec Nox TEE (encrypt market signal +
 * exposure → CDE.decide() on Sepolia → ACL-decrypt the action, public-decrypt the confidence),
 * records a public commitment, and returns the decision with an X-ATTESTATION header.
 *
 * The x402 payment, 402/attestation headers, and settlement are all handled by @c402/server -
 * this file only supplies the confidential computation. No mock data anywhere on this path.
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import express from "express";
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient, NotYetComputedHandleError } from "@iexec-nox/handle";
import { c402 } from "@c402/server";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

const NETWORK = "eip155:11155111";
const EXPLORER = "https://sepolia.etherscan.io";
const PORT = Number(process.env.CDE_API_PORT ?? 4021);
const RPC = requireEnv("SEPOLIA_RPC_URL");
const USDC = requireEnv("USDC_ADDRESS") as Address;
const CDE_ADDRESS = requireEnv("CDE_ADDRESS") as Address;
const REGISTRY = requireEnv("DECISION_REGISTRY_ADDRESS") as Address;
const NOX_COMPUTE = process.env.NOX_COMPUTE_ADDRESS as Address | undefined;
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? "http://localhost:4022";
const PRICE = process.env.CDE_PRICE_USDC ?? "0.01"; // human-readable USDC price per call
let PK = requireEnv("SEPOLIA_PRIVATE_KEY");
if (!PK.startsWith("0x")) PK = "0x" + PK;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

const account = privateKeyToAccount(PK as Hex);
const PAY_TO = (process.env.CDE_PAY_TO ?? account.address) as Address;
const transport = http(RPC);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ account, chain: sepolia, transport });

const cdeArtifact = JSON.parse(
  readFileSync(resolve(__dirname, "../../contracts/artifacts/contracts/CDE.sol/CDE.json"), "utf8"),
);
const CDE_ABI = cdeArtifact.abi as Abi;
const registryArtifact = JSON.parse(
  readFileSync(resolve(__dirname, "../../contracts/artifacts/contracts/DecisionRegistry.sol/DecisionRegistry.json"), "utf8"),
);
const REGISTRY_ABI = registryArtifact.abi as Abi;

let handleClientPromise: ReturnType<typeof createViemHandleClient> | null = null;
function handle() {
  if (!handleClientPromise) handleClientPromise = createViemHandleClient(walletClient);
  return handleClientPromise;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 30, delayMs = 6000): Promise<T> {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      // Right after decide(), the TEE may not have computed the handle yet AND the
      // ACL grant may not have propagated to the gateway (transient 403 "not a viewer").
      // Both resolve within a few seconds - retry on either.
      const msg = e instanceof Error ? e.message : "";
      const transient =
        e instanceof NotYetComputedHandleError ||
        /access_denied|not a viewer|status:\s*403|not yet computed/i.test(msg);
      if (transient && i < tries) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw new Error("exhausted retries waiting for TEE computation / ACL propagation");
}

async function runConfidentialDecision(exposure: bigint, signal: bigint) {
  const h = await handle();
  const exp = await h.encryptInput(exposure, "uint256", CDE_ADDRESS);
  const sig = await h.encryptInput(signal, "uint256", CDE_ADDRESS);

  const decideTx = await walletClient.writeContract({
    address: CDE_ADDRESS, abi: CDE_ABI, functionName: "decide",
    args: [exp.handle, exp.handleProof, sig.handle, sig.handleProof], account, chain: sepolia,
  });
  await publicClient.waitForTransactionReceipt({ hash: decideTx });

  const id = (await publicClient.readContract({ address: CDE_ADDRESS, abi: CDE_ABI, functionName: "decisionCount" })) as bigint;
  const actionHandle = (await publicClient.readContract({ address: CDE_ADDRESS, abi: CDE_ABI, functionName: "actionOf", args: [id] })) as Hex;
  const confHandle = (await publicClient.readContract({ address: CDE_ADDRESS, abi: CDE_ABI, functionName: "confidenceOf", args: [id] })) as Hex;
  const decision = (await publicClient.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "getDecision", args: [id] })) as { commitment: Hex };

  const action = await withRetry(() => h.decrypt(actionHandle));
  const confidence = await withRetry(() => h.publicDecrypt(confHandle));
  const actionName = ["HOLD", "HEDGE", "ACCUMULATE"][Number(action.value)] ?? "UNKNOWN";

  return {
    decisionId: id.toString(),
    action: actionName,
    actionCode: Number(action.value),
    confidence: Number(confidence.value),
    decideTx,
    commitment: decision.commitment,
    actionHandle,
    confHandle,
    explorer: `${EXPLORER}/tx/${decideTx}`,
    cde: `${EXPLORER}/address/${CDE_ADDRESS}`,
  };
}

const app = express();
app.use(express.json());

// Public, unpaid metadata.
app.get("/health", (_req, res) => res.json({ ok: true, network: NETWORK, cde: CDE_ADDRESS, price: PRICE, asset: USDC }));

// The c402 confidential-compute endpoint. One declaration: the payment gate, the 402 +
// COMPUTE-REQUIRED / X-ATTESTATION headers, and settlement are all handled by @c402/server;
// we only supply `compute` - the actual confidential decision.
app.post(
  "/v1/decide",
  c402({
    price: PRICE,
    token: USDC,
    tokenDomain: { name: "USDC", version: "2" },
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    payTo: PAY_TO,
    contract: CDE_ADDRESS,
    coordinator: NOX_COMPUTE,
    schema: { input: "euint256", output: "treasury-action" },
    description: "Confidential treasury decision (CDE) - pay-per-confidential-decision",
    compute: async (input) => {
      const body = (input ?? {}) as { exposure?: string | number; signal?: string | number };
      const decision = await runConfidentialDecision(BigInt(body.exposure ?? 0), BigInt(body.signal ?? 0));
      return {
        result: { ok: true, ...decision },
        decisionId: decision.decisionId,
        commitment: decision.commitment,
        registry: REGISTRY,
        tx: decision.decideTx,
        outputHandles: { action: decision.actionHandle, confidence: decision.confHandle },
      };
    },
  }),
);

app.listen(PORT, () => {
  console.log(`🚀 xCAT CDE API (c402 server) on http://localhost:${PORT}`);
  console.log(`   c402 route : POST /v1/decide  (price ${PRICE} USDC → ${PAY_TO})`);
  console.log(`   facilitator: ${FACILITATOR_URL}`);
  console.log(`   CDE        : ${CDE_ADDRESS}`);
});
