import { parseAbi, getAddress, type Address } from "viem";
import type { Clients, XcatConfig } from "./config.ts";

const FACTORY_ABI = parseAbi(["function getPool(address,address,uint24) view returns (address)"]);
const POOL_ABI = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)",
]);
const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export interface MarketState {
  pool: Address;
  tick: number;
  priceUsdcPerWeth: number;
  /** portfolio exposure to the risk asset (WETH), in basis points 0..10000 */
  exposureBps: bigint;
  /** market signal proxy fed to the CDE (here: the on-chain WETH price in whole USDC) */
  signal: bigint;
}

/** Read REAL market state: Uniswap pool price + the Safe's actual portfolio exposure. */
export async function readMarketState(clients: Clients, cfg: XcatConfig): Promise<MarketState> {
  const factory = getAddress(process.env.UNISWAP_V3_FACTORY!);
  const { usdc, weth, uniswapPoolFee, safe } = cfg.addr;

  const pool = (await clients.publicClient.readContract({
    address: factory, abi: FACTORY_ABI, functionName: "getPool", args: [weth, usdc, uniswapPoolFee],
  })) as Address;

  const slot0 = (await clients.publicClient.readContract({ address: pool, abi: POOL_ABI, functionName: "slot0" })) as readonly [bigint, number, number, number, number, number, boolean];
  const sqrtPriceX96 = slot0[0];
  const tick = Number(slot0[1]);

  // token0 = USDC (lower address), token1 = WETH → priceRaw = WETH_raw / USDC_raw
  const sqrtP = Number(sqrtPriceX96) / 2 ** 96;
  const priceRaw = sqrtP * sqrtP;
  const priceUsdcPerWeth = priceRaw > 0 ? 1e12 / priceRaw : 0; // decimals: USDC 6, WETH 18

  const [usdcBal, wethBal] = (await Promise.all([
    clients.publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [safe] }),
    clients.publicClient.readContract({ address: weth, abi: ERC20_ABI, functionName: "balanceOf", args: [safe] }),
  ])) as [bigint, bigint];

  const usdcValue = Number(usdcBal) / 1e6;
  const wethValue = (Number(wethBal) / 1e18) * priceUsdcPerWeth;
  const total = usdcValue + wethValue;
  const exposureBps = total > 0 ? BigInt(Math.round((wethValue / total) * 10000)) : 0n;

  return {
    pool,
    tick,
    priceUsdcPerWeth,
    exposureBps,
    signal: BigInt(Math.max(0, Math.round(priceUsdcPerWeth))),
  };
}
