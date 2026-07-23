/**
 * xCAT self-hosted x402 facilitator for Ethereum Sepolia (eip155:11155111).
 *
 * The hosted x402 facilitators do NOT support Ethereum Sepolia, so we run our own —
 * which is also exactly where xCAT's confidential payment metering lives: the
 * `onAfterSettle` hook records each settlement into the Nox-encrypted PaymentMeter,
 * so per-caller amounts stay confidential while the settlement itself is public.
 *
 * Settlement uses EIP-3009 `transferWithAuthorization` on Circle's Sepolia USDC.
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import express from "express";
import { createWalletClient, http, publicActions, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient } from "@iexec-nox/handle";
import { x402Facilitator } from "@x402/core/facilitator";
import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "@x402/core/types";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

const NETWORK = "eip155:11155111";
const PORT = Number(process.env.FACILITATOR_PORT ?? 4022);
const RPC = requireEnv("SEPOLIA_RPC_URL");
let PK = requireEnv("SEPOLIA_PRIVATE_KEY");
if (!PK.startsWith("0x")) PK = "0x" + PK;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

const account = privateKeyToAccount(PK as `0x${string}`);
const viemClient = createWalletClient({ account, chain: sepolia, transport: http(RPC) }).extend(publicActions);
console.info(`[facilitator] settler/relayer account: ${account.address}`);

const evmSigner = toFacilitatorEvmSigner({
  address: account.address,
  getCode: (args) => viemClient.getCode(args),
  readContract: (args) => viemClient.readContract({ ...args, args: args.args ?? [] }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifyTypedData: (args) => viemClient.verifyTypedData(args as any),
  writeContract: (args) => viemClient.writeContract({ ...args, args: args.args ?? [], account, chain: sepolia }),
  sendTransaction: (args) => viemClient.sendTransaction({ ...args, account, chain: sepolia }),
  waitForTransactionReceipt: (args) => viemClient.waitForTransactionReceipt(args),
});

// ---- Confidential metering (PaymentMeter) ----
const PAYMENT_METER = process.env.PAYMENT_METER_ADDRESS as `0x${string}` | undefined;
const meterAbi: Abi | null = PAYMENT_METER
  ? (JSON.parse(readFileSync(resolve(__dirname, "../../contracts/artifacts/contracts/PaymentMeter.sol/PaymentMeter.json"), "utf8")).abi as Abi)
  : null;
let handleClientPromise: ReturnType<typeof createViemHandleClient> | null = null;
function handle() {
  if (!handleClientPromise) handleClientPromise = createViemHandleClient(viemClient);
  return handleClientPromise;
}
async function meter(payer: `0x${string}`, amount: bigint) {
  if (!PAYMENT_METER || !meterAbi) return;
  try {
    const h = await handle();
    const enc = await h.encryptInput(amount, "uint256", PAYMENT_METER);
    const tx = await viemClient.writeContract({
      address: PAYMENT_METER, abi: meterAbi, functionName: "record",
      args: [payer, enc.handle, enc.handleProof], account, chain: sepolia,
    });
    await viemClient.waitForTransactionReceipt({ hash: tx });
    console.info(`[facilitator] metered ${payer} (amount encrypted) — tx ${tx}`);
  } catch (e) {
    // Metering must never break settlement — log and move on.
    console.warn("[facilitator] metering skipped:", e instanceof Error ? e.message : e);
  }
}

const facilitator = new x402Facilitator()
  .onAfterSettle(async (ctx) => {
    const payer = ctx.result?.payer as `0x${string}` | undefined;
    const amount = ctx.requirements?.amount;
    const tx = ctx.result?.transaction;
    console.info(`[facilitator] settled on ${NETWORK}${tx ? ` — tx ${tx}` : ""}`);
    if (ctx.result?.success && payer && amount) {
      void meter(payer, BigInt(amount)); // fire-and-forget encrypted metering
    }
  })
  .onSettleFailure(async (ctx) => {
    console.warn("[facilitator] settle failure:", JSON.stringify(ctx)?.slice(0, 300));
  });

facilitator.register(NETWORK, new ExactEvmScheme(evmSigner, { eip6492AllowedFactories: [] }));

const app = express();
app.use(express.json());

app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };
    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: "Missing paymentPayload or paymentRequirements" });
    }
    const response: VerifyResponse = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(response);
  } catch (error) {
    console.error("[facilitator] verify error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };
    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: "Missing paymentPayload or paymentRequirements" });
    }
    const response: SettleResponse = await facilitator.settle(paymentPayload, paymentRequirements);
    res.json(response);
  } catch (error) {
    console.error("[facilitator] settle error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/supported", async (_req, res) => {
  try {
    res.json(facilitator.getSupported());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, network: NETWORK, settler: account.address }));

app.listen(PORT, () => {
  console.log(`🚀 xCAT facilitator on http://localhost:${PORT} (network ${NETWORK})`);
});
