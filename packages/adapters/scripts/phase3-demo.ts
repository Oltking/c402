/**
 * Phase 3 gate: a CDE decision drives a REAL Uniswap swap executed BY a Safe, whose
 * output lands in the Safe. Deploys a demo Safe, funds it with USDC, then executes
 * [approve, exactInputSingle] as a Safe batch through the unmodified SwapRouter02.
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, getAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { buildSwapBatch, deploySafe, execSafeBatch, intentForAction, type ActionName } from "../src/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const RPC = process.env.SEPOLIA_RPC_URL!;
let PK = process.env.SEPOLIA_PRIVATE_KEY!;
if (!PK.startsWith("0x")) PK = "0x" + PK;
const USDC = getAddress(process.env.USDC_ADDRESS!);
const WETH = getAddress(process.env.WETH9_ADDRESS!);
const ROUTER = getAddress(process.env.UNISWAP_SWAP_ROUTER02!);
const FEE = 500;
const EXPLORER = "https://sepolia.etherscan.io";

const account = privateKeyToAccount(PK as Hex);
const transport = http(RPC);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ account, chain: sepolia, transport });
const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
]);

async function bal(token: Address, who: Address) {
  return (await publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [who] })) as bigint;
}

async function main() {
  // The "decision JSON" - action produced by the CDE (Phase 2). Default ACCUMULATE.
  const action = ((process.argv[2] as ActionName) || "ACCUMULATE") as ActionName;
  const intent = intentForAction(action);
  console.log(`Decision action: ${action} → ${intent ? intent.direction : "no swap (HOLD)"}`);
  if (!intent) return;

  const ctx = { provider: RPC, signer: PK };

  // 1) Deploy (or reuse) the demo Safe.
  console.log("\nDeploying demo Safe (owner=deployer, threshold=1)…");
  const { address: safe, deployTx } = await deploySafe(
    ctx,
    [account.address],
    1,
    async (tx) => {
      const h = await walletClient.sendTransaction({ to: tx.to as Address, data: tx.data as Hex, value: BigInt(tx.value) });
      await publicClient.waitForTransactionReceipt({ hash: h });
      return h;
    },
  );
  console.log(`  Safe: ${safe}${deployTx ? `  (deploy ${EXPLORER}/tx/${deployTx})` : "  (already deployed)"}`);

  // 2) Fund the Safe with USDC so it can trade (treasury holds USDC).
  const amountIn = 1_000_000n; // 1 USDC (6 decimals)
  const need = 3_000_000n; // keep 3 USDC in the Safe
  const safeUsdc = await bal(USDC, safe);
  if (safeUsdc < need) {
    const top = need - safeUsdc;
    console.log(`Funding Safe with ${Number(top) / 1e6} USDC…`);
    const h = await walletClient.writeContract({ address: USDC, abi: erc20, functionName: "transfer", args: [safe, top], account, chain: sepolia });
    await publicClient.waitForTransactionReceipt({ hash: h });
  }

  // 3) Build the swap batch (tokenIn per intent) and execute it FROM the Safe.
  const [tokenIn, tokenOut] = intent.direction === "USDC->WETH" ? [USDC, WETH] : [WETH, USDC];
  const wethBefore = await bal(WETH, safe);
  const usdcBefore = await bal(USDC, safe);
  console.log(`\nSafe before - USDC ${Number(usdcBefore) / 1e6}, WETH ${Number(wethBefore) / 1e18}`);

  const batch = buildSwapBatch({ router: ROUTER, tokenIn, tokenOut, fee: FEE, recipient: safe, amountIn, amountOutMinimum: 0n });
  console.log(`Executing Safe batch: approve + exactInputSingle (${Number(amountIn) / 1e6} ${intent.direction})…`);
  const swapTx = await execSafeBatch(ctx, safe, batch);
  await publicClient.waitForTransactionReceipt({ hash: swapTx });

  const wethAfter = await bal(WETH, safe);
  const usdcAfter = await bal(USDC, safe);
  console.log(`Safe after  - USDC ${Number(usdcAfter) / 1e6}, WETH ${Number(wethAfter) / 1e18}`);
  console.log(`Swap tx: ${EXPLORER}/tx/${swapTx}`);

  const gainedWeth = wethAfter - wethBefore;
  if (gainedWeth <= 0n) throw new Error("Swap did not increase Safe WETH balance");
  console.log(`\n✅ Phase 3 gate PASSED - Safe received ${Number(gainedWeth) / 1e18} WETH from a Uniswap swap it executed.`);
  console.log(`Safe: ${EXPLORER}/address/${safe}`);

  writeFileSync(
    resolve(__dirname, "../../../docs/safe.sepolia.json"),
    JSON.stringify({ safe, owner: account.address, threshold: 1, fundedWith: "USDC", lastSwapTx: swapTx, action, direction: intent.direction }, null, 2),
  );
  console.log(`\nAdd to .env:\nSAFE_ADDRESS=${safe}`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
