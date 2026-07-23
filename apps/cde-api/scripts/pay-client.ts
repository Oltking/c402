/**
 * Phase 2 paying client: calls the x402-gated CDE API, auto-pays in USDC via the
 * exact EVM scheme (EIP-3009), and prints the confidential decision it received.
 * This is the "agent buys its intelligence" leg of xCAT.
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const RPC = process.env.SEPOLIA_RPC_URL;
let PK = process.env.SEPOLIA_PRIVATE_KEY ?? "";
if (PK && !PK.startsWith("0x")) PK = "0x" + PK;
const API = process.env.CDE_API_URL ?? "http://localhost:4021";

async function main() {
  if (!PK) throw new Error("Missing SEPOLIA_PRIVATE_KEY");
  const signer = privateKeyToAccount(PK as `0x${string}`);

  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer, RPC ? { rpcUrl: RPC } : undefined));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);

  const url = `${API}/v1/decide`;
  const body = JSON.stringify({ exposure: 6000, signal: 50 }); // exposure > 5000 → expect HEDGE
  console.log(`Paying + calling ${url} …`);

  const response = await fetchWithPayment(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const result = await httpClient.processResponse(response);
  console.log("\n──────── CDE decision (paid) ────────");
  console.dir(result, { depth: null });
  console.log("─────────────────────────────────────");
}

main().catch((e) => {
  console.error("❌", e?.response?.data?.error ?? e);
  process.exit(1);
});
