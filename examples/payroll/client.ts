// c402 payroll client - a manager's tool that pays for a confidential raise decision.
// Same @c402/client as the treasury agent; different endpoint, different meaning. The client
// doesn't know or care that the computation is payroll rather than treasury - that's the point.
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

const res = await call("http://localhost:4026/decide", { body: { budget: 100000, requested: 5000 } });
console.log("decision   :", res.result);
console.log("attestation:", res.attestation?.decisionId, res.attestation?.commitment);
console.log("verified   :", res.verified?.valid, res.verified?.checks.map((c) => `${c.name}:${c.ok}`).join(" "));
