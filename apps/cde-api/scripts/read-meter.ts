/**
 * Proves the PaymentMeter is confidential and owner-only:
 *  - as the meter OWNER, decrypts grandTotal / per-payer count & total (succeeds);
 *  - as a random NON-owner wallet, attempts the same decrypt (must be denied by ACL).
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient } from "@iexec-nox/handle";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const RPC = process.env.SEPOLIA_RPC_URL!;
let PK = process.env.SEPOLIA_PRIVATE_KEY!;
if (!PK.startsWith("0x")) PK = "0x" + PK;
const METER = process.env.PAYMENT_METER_ADDRESS as Address;

const transport = http(RPC);
const publicClient = createPublicClient({ chain: sepolia, transport });
const abi = JSON.parse(readFileSync(resolve(__dirname, "../../../contracts/artifacts/contracts/PaymentMeter.sol/PaymentMeter.json"), "utf8")).abi as Abi;

async function readHandle(fn: string, args: unknown[] = []): Promise<Hex> {
  return (await publicClient.readContract({ address: METER, abi, functionName: fn, args })) as Hex;
}

async function main() {
  const owner = privateKeyToAccount(PK as Hex);
  const ownerWallet = createWalletClient({ account: owner, chain: sepolia, transport });
  const ownerHandle = await createViemHandleClient(ownerWallet);

  const grand = await readHandle("grandTotal");
  const cnt = await readHandle("countOf", [owner.address]);
  const tot = await readHandle("totalOf", [owner.address]);

  console.log(`Meter: ${METER}`);
  console.log("\n── As OWNER (should decrypt) ──");
  const g = await ownerHandle.decrypt(grand);
  const c = await ownerHandle.decrypt(cnt);
  const t = await ownerHandle.decrypt(tot);
  console.log(`grandTotal (atomic USDC): ${g.value}  (= ${Number(g.value) / 1e6} USDC)`);
  console.log(`count for ${owner.address}: ${c.value}`);
  console.log(`total for payer (atomic): ${t.value}  (= ${Number(t.value) / 1e6} USDC)`);

  console.log("\n── As RANDOM NON-OWNER (should be DENIED) ──");
  const stranger = privateKeyToAccount(generatePrivateKey());
  const strangerWallet = createWalletClient({ account: stranger, chain: sepolia, transport });
  const strangerHandle = await createViemHandleClient(strangerWallet);
  try {
    const leaked = await strangerHandle.decrypt(grand);
    console.log(`❌ LEAK: non-owner decrypted grandTotal = ${leaked.value}`);
    process.exit(1);
  } catch (e) {
    console.log(`✅ non-owner denied: ${(e instanceof Error ? e.message : String(e)).slice(0, 110)}`);
  }
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
