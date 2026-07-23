/**
 * SafeAdapter — thin wrapper over the UNMODIFIED Safe protocol-kit. Deploys a demo
 * Safe (single-owner, threshold 1) and executes batched MetaTransactions from it, so
 * the treasury lives in a standard Safe and our runtime proposes + executes swaps.
 */
import Safe from "@safe-global/protocol-kit";
import type { Address, Hex } from "viem";
import type { MetaTx } from "./uniswap.ts";

export interface SafeCtx {
  provider: string; // RPC URL
  signer: string; // owner private key (0x…)
}

/** Predict + deploy a new Safe. Returns the address; caller sends the deployment tx. */
export async function deploySafe(
  ctx: SafeCtx,
  owners: Address[],
  threshold: number,
  sendTx: (tx: { to: string; value: string; data: string }) => Promise<Hex>,
): Promise<{ address: Address; deployTx?: Hex }> {
  const safe = await Safe.init({
    provider: ctx.provider,
    signer: ctx.signer,
    predictedSafe: { safeAccountConfig: { owners, threshold } },
  });
  const address = (await safe.getAddress()) as Address;
  if (await safe.isSafeDeployed()) return { address };
  const deploymentTx = await safe.createSafeDeploymentTransaction();
  const deployTx = await sendTx({ to: deploymentTx.to, value: deploymentTx.value, data: deploymentTx.data });
  return { address, deployTx };
}

/** Execute a batch of MetaTransactions from the Safe (signs with the single owner). */
export async function execSafeBatch(ctx: SafeCtx, safeAddress: Address, txs: MetaTx[]): Promise<Hex> {
  const safe = await Safe.init({ provider: ctx.provider, signer: ctx.signer, safeAddress });
  const safeTx = await safe.createTransaction({
    transactions: txs.map((t) => ({ to: t.to, value: t.value, data: t.data })),
  });
  const signed = await safe.signTransaction(safeTx);
  const result = await safe.executeTransaction(signed);
  return result.hash as Hex;
}
