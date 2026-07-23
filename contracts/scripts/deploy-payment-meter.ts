/** Deploy PaymentMeter to Sepolia and authorize the facilitator wallet as recorder. */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Abi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

const RPC = process.env.SEPOLIA_RPC_URL!;
let PK = process.env.SEPOLIA_PRIVATE_KEY!;
if (!PK.startsWith("0x")) PK = "0x" + PK;
const account = privateKeyToAccount(PK as Hex);
const transport = http(RPC);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ account, chain: sepolia, transport });
const EXPLORER = "https://sepolia.etherscan.io";

// Recorder = facilitator settler wallet (same key in this single-wallet demo).
const RECORDER = (process.env.FACILITATOR_ADDRESS ?? account.address) as `0x${string}`;

async function main() {
  const art = JSON.parse(readFileSync(resolve(__dirname, "../artifacts/contracts/PaymentMeter.sol/PaymentMeter.json"), "utf8"));
  const abi = art.abi as Abi;
  const bytecode = art.bytecode as Hex;

  const hash = await walletClient.deployContract({ abi, bytecode, args: [], account, chain: sepolia });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  const address = rcpt.contractAddress!;
  console.log(`PaymentMeter deployed: ${address}  ${EXPLORER}/tx/${hash}`);

  const setTx = await walletClient.writeContract({ address, abi, functionName: "setRecorder", args: [RECORDER, true], account, chain: sepolia });
  await publicClient.waitForTransactionReceipt({ hash: setTx });
  console.log(`Authorized recorder ${RECORDER}`);
  console.log(`\nAdd to .env:\nPAYMENT_METER_ADDRESS=${address}`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
