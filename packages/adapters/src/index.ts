export * from "./uniswap.ts";
export * from "./safe.ts";

/** Map a CDE decision action → a treasury swap intent. */
export type ActionName = "HOLD" | "HEDGE" | "ACCUMULATE";

export interface SwapIntent {
  direction: "USDC->WETH" | "WETH->USDC";
}

/**
 * ACCUMULATE → buy the risk asset (USDC→WETH).
 * HEDGE      → de-risk to stablecoin (WETH→USDC).
 * HOLD       → no swap.
 */
export function intentForAction(action: ActionName): SwapIntent | null {
  if (action === "ACCUMULATE") return { direction: "USDC->WETH" };
  if (action === "HEDGE") return { direction: "WETH->USDC" };
  return null;
}
