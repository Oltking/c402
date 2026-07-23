/** Deploy EventBus to Sepolia. Prints the address to add to .env. */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Abi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

let PK = process.env.SEPOLIA_PRIVATE_KEY!;
if (!PK.startsWith("0x")) PK = "0x" + PK;
const account = privateKeyToAccount(PK as Hex);
const transport = http(process.env.SEPOLIA_RPC_URL!);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ account, chain: sepolia, transport });

async function main() {
  const art = JSON.parse(readFileSync(resolve(__dirname, "../artifacts/contracts/EventBus.sol/EventBus.json"), "utf8"));
  const hash = await walletClient.deployContract({ abi: art.abi as Abi, bytecode: art.bytecode as Hex, args: [], account, chain: sepolia });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`EventBus deployed: ${rcpt.contractAddress}  https://sepolia.etherscan.io/tx/${hash}`);
  console.log(`\nAdd to .env:\nEVENT_BUS_ADDRESS=${rcpt.contractAddress}`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
