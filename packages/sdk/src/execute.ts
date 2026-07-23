import { parseAbi, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { buildSwapBatch, execSafeBatch, intentForAction, type ActionName } from "@xcat/adapters";
import type { Clients, XcatConfig } from "./config.ts";
import { EXPLORER } from "./config.ts";

const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
]);

export interface ExecutionResult {
  executed: boolean;
  action: ActionName;
  direction?: string;
  swapTx?: Hex;
  swapExplorer?: string;
  note?: string;
}

/**
 * Execute a decision: map action → swap intent and run it FROM the Safe through
 * the unmodified Uniswap router. Ensures the Safe holds the input token first.
 */
export async function executeDecision(
  clients: Clients,
  cfg: XcatConfig,
  action: ActionName,
  amountIn = 1_000_000n, // 1 USDC (or equivalent) per rebalance step
): Promise<ExecutionResult> {
  const intent = intentForAction(action);
  if (!intent) return { executed: false, action, note: "HOLD — no swap" };

  const { safe, usdc, weth, router, uniswapPoolFee } = cfg.addr;
  const [tokenIn, tokenOut] = intent.direction === "USDC->WETH" ? [usdc, weth] : [weth, usdc];

  // Ensure the Safe can fund this swap; top up USDC from the operator if needed.
  if (intent.direction === "USDC->WETH") {
    const safeUsdc = (await clients.publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [safe] })) as bigint;
    if (safeUsdc < amountIn) {
      const top = amountIn - safeUsdc + 1_000_000n;
      const h = await clients.walletClient.writeContract({ address: usdc, abi: ERC20_ABI, functionName: "transfer", args: [safe, top], account: clients.account, chain: sepolia });
      await clients.publicClient.waitForTransactionReceipt({ hash: h });
    }
  } else {
    const safeWeth = (await clients.publicClient.readContract({ address: weth, abi: ERC20_ABI, functionName: "balanceOf", args: [safe] })) as bigint;
    if (safeWeth < amountIn) {
      return { executed: false, action, direction: intent.direction, note: "Safe has insufficient WETH to hedge; skipping swap" };
    }
  }

  const batch = buildSwapBatch({ router, tokenIn: tokenIn as Address, tokenOut: tokenOut as Address, fee: uniswapPoolFee, recipient: safe, amountIn, amountOutMinimum: 0n });
  const swapTx = await execSafeBatch({ provider: cfg.rpc, signer: cfg.privateKey }, safe, batch);
  await clients.publicClient.waitForTransactionReceipt({ hash: swapTx });

  return { executed: true, action, direction: intent.direction, swapTx, swapExplorer: `${EXPLORER}/tx/${swapTx}` };
}
