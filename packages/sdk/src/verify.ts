import { type Address } from "viem";
import type { Clients, XcatConfig } from "./config.ts";
import { ABIS, EXPLORER } from "./config.ts";

export interface DecisionRecord {
  id: bigint;
  commitment: Hex2;
  cde: Address;
  caller: Address;
  timestamp: bigint;
  blockNumber: bigint;
  explorer: string;
}
type Hex2 = `0x${string}`;

/** Read a decision commitment from the on-chain DecisionRegistry (the `xcat verify` proof). */
export async function verifyDecision(clients: Clients, cfg: XcatConfig, id: bigint): Promise<DecisionRecord> {
  const abi = ABIS.registry();
  const d = (await clients.publicClient.readContract({ address: cfg.addr.registry, abi, functionName: "getDecision", args: [id] })) as {
    id: bigint; commitment: Hex2; cde: Address; caller: Address; timestamp: bigint; blockNumber: bigint;
  };
  return {
    id: d.id,
    commitment: d.commitment,
    cde: d.cde,
    caller: d.caller,
    timestamp: d.timestamp,
    blockNumber: d.blockNumber,
    explorer: `${EXPLORER}/address/${cfg.addr.registry}`,
  };
}
