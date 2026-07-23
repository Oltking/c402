/**
 * xCAT CDE API — "pay-per-confidential-decision".
 *
 * POST /v1/decide is gated by x402: the caller must pay in Circle Sepolia USDC
 * (settled by our self-hosted facilitator on eip155:11155111). Once paid, the API
 * runs a REAL confidential decision on-chain: it encrypts the caller's market
 * signal + portfolio exposure via the Nox gateway, calls CDE.decide() on Sepolia,
 * then ACL-decrypts the action and public-decrypts the confidence bucket.
 * No mock data anywhere on this path.
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
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

const NETWORK = "eip155:11155111";
const EXPLORER = "https://sepolia.etherscan.io";
const PORT = Number(process.env.CDE_API_PORT ?? 4021);
const RPC = requireEnv("SEPOLIA_RPC_URL");
const USDC = requireEnv("USDC_ADDRESS") as Address;
const CDE_ADDRESS = requireEnv("CDE_ADDRESS") as Address;
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? "http://localhost:4022";
const PRICE_ATOMIC = process.env.CDE_PRICE_ATOMIC ?? "10000"; // 0.01 USDC (6 decimals)
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
      // Both resolve within a few seconds — retry on either.
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

  const action = await withRetry(() => h.decrypt(actionHandle));
  const confidence = await withRetry(() => h.publicDecrypt(confHandle));
  const actionName = ["HOLD", "HEDGE", "ACCUMULATE"][Number(action.value)] ?? "UNKNOWN";

  return {
    decisionId: id.toString(),
    action: actionName,
    actionCode: Number(action.value),
    confidence: Number(confidence.value),
    decideTx,
    explorer: `${EXPLORER}/tx/${decideTx}`,
    cde: `${EXPLORER}/address/${CDE_ADDRESS}`,
  };
}

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

const app = express();
app.use(express.json());

// Public, unpaid metadata.
app.get("/health", (_req, res) => res.json({ ok: true, network: NETWORK, cde: CDE_ADDRESS, priceAtomic: PRICE_ATOMIC, asset: USDC }));

// Payment gate for the paid decision endpoint.
app.use(
  paymentMiddleware(
    {
      "POST /v1/decide": {
        accepts: {
          scheme: "exact",
          network: NETWORK,
          payTo: PAY_TO,
          // explicit USDC asset + atomic amount; extra carries the EIP-712 domain
          // (name/version) since Circle's Sepolia USDC proxy doesn't expose eip712Domain().
          price: { asset: USDC, amount: PRICE_ATOMIC, extra: { name: "USDC", version: "2" } },
        },
        description: "Confidential treasury decision (CDE) — pay-per-confidential-decision",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(NETWORK, new ExactEvmScheme()),
  ),
);

app.post("/v1/decide", async (req, res) => {
  try {
    const exposure = BigInt(req.body?.exposure ?? 0);
    const signal = BigInt(req.body?.signal ?? 0);
    const decision = await runConfidentialDecision(exposure, signal);
    res.json({ ok: true, ...decision });
  } catch (error) {
    console.error("[cde-api] decide error:", error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 xCAT CDE API on http://localhost:${PORT}`);
  console.log(`   paid route : POST /v1/decide  (price ${PRICE_ATOMIC} atomic USDC → ${PAY_TO})`);
  console.log(`   facilitator: ${FACILITATOR_URL}`);
  console.log(`   CDE        : ${CDE_ADDRESS}`);
});
