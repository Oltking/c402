// hello-c402 client — call the confidential endpoint like a normal fetch.
// c402Fetch reads COMPUTE-REQUIRED, pays via x402, reads X-ATTESTATION, and
// re-verifies the attestation on-chain — all invisibly.
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";
import { c402Fetch } from "@c402/client";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });
const pk = (process.env.SEPOLIA_PRIVATE_KEY!.startsWith("0x") ? "" : "0x") + process.env.SEPOLIA_PRIVATE_KEY!;

const call = c402Fetch({
  signer: privateKeyToAccount(pk as `0x${string}`),
  network: "eip155:11155111",
  rpcUrl: process.env.SEPOLIA_RPC_URL,
});

const res = await call("http://localhost:4025/decide", { body: { exposure: 6000, signal: 50 } });
console.log("result     :", res.result);
console.log("attestation:", res.attestation?.decisionId, res.attestation?.commitment);
console.log("verified   :", res.verified?.valid, res.verified?.checks.map((c) => `${c.name}:${c.ok}`).join(" "));
