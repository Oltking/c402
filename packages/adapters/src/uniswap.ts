/**
 * UniswapAdapter — builds the calldata to swap through the UNMODIFIED Uniswap v3
 * SwapRouter02 (exactInputSingle). Returned as MetaTransactions so a Safe can execute
 * them as a batch (approve + swap), with the output token sent to `recipient`.
 */
import { encodeFunctionData, type Address, type Hex } from "viem";

export interface MetaTx {
  to: Address;
  value: string;
  data: Hex;
}

export interface SwapParams {
  router: Address; // SwapRouter02
  tokenIn: Address;
  tokenOut: Address;
  fee: number; // pool fee tier, e.g. 500
  recipient: Address; // where output lands (the Safe)
  amountIn: bigint;
  amountOutMinimum: bigint; // slippage floor (0 = accept any — testnet demo only)
}

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// SwapRouter02 exactInputSingle — note: NO `deadline` field (differs from SwapRouter v1).
const SWAP_ROUTER02_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

/** Build [approve(tokenIn→router), exactInputSingle] to run as one Safe batch. */
export function buildSwapBatch(p: SwapParams): MetaTx[] {
  const approve = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [p.router, p.amountIn],
  });
  const swap = encodeFunctionData({
    abi: SWAP_ROUTER02_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: p.tokenIn,
        tokenOut: p.tokenOut,
        fee: p.fee,
        recipient: p.recipient,
        amountIn: p.amountIn,
        amountOutMinimum: p.amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return [
    { to: p.tokenIn, value: "0", data: approve },
    { to: p.router, value: "0", data: swap },
  ];
}
