/**
 * @c402/verify — anyone can independently check a c402 attestation.
 *
 * The attestation is not a trust-us blob: it points at an on-chain commitment. This verifier
 * re-reads that commitment from the registry contract on the declared network and confirms it
 * matches, and that the compute transaction exists. No server cooperation required.
 */
import { createPublicClient, http, parseAbi, getAddress, type Address, type Chain, type Hex } from "viem";
import * as chains from "viem/chains";
import { type Attestation } from "@c402/spec";

const REGISTRY_ABI = parseAbi([
  "struct Decision { uint256 id; bytes32 commitment; address cde; address caller; uint64 timestamp; uint256 blockNumber; }",
  "function getDecision(uint256) view returns (Decision)",
]);

export interface VerifyOptions {
  /** RPC URL for the attestation's network. Required. */
  rpcUrl: string;
}

export interface VerifyResult {
  valid: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  onChainCommitment?: string;
}

/** Resolve a viem chain from a CAIP-2 id like "eip155:11155111". */
function chainForCaip2(network: string): Chain {
  const id = Number(network.split(":")[1]);
  const list = Object.values(chains) as unknown as Chain[];
  const match = list.find((c) => c && typeof c === "object" && c.id === id);
  return match ?? chains.sepolia;
}

export async function verifyAttestation(att: Attestation, opts: VerifyOptions): Promise<VerifyResult> {
  const checks: VerifyResult["checks"] = [];
  const push = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

  push("standard", att.standard === "iexec-nox/intel-tdx", att.standard);
  push("has-contract", !!att.contract);

  if (!att.registry || att.decisionId === undefined) {
    push("on-chain-commitment", false, "attestation has no registry/decisionId to verify against");
    return { valid: false, checks };
  }

  const client = createPublicClient({ chain: chainForCaip2(att.network), transport: http(opts.rpcUrl) });

  let onChainCommitment: string | undefined;
  try {
    const d = await client.readContract({
      address: getAddress(att.registry) as Address,
      abi: REGISTRY_ABI,
      functionName: "getDecision",
      args: [BigInt(att.decisionId)],
    });
    onChainCommitment = (d as { commitment: Hex }).commitment;
    const cde = getAddress((d as { cde: Address }).cde);
    push("registry-has-decision", !!onChainCommitment && onChainCommitment !== "0x" + "0".repeat(64));
    if (att.commitment) {
      push("commitment-matches", onChainCommitment.toLowerCase() === att.commitment.toLowerCase(), onChainCommitment);
    }
    push("contract-matches", cde.toLowerCase() === getAddress(att.contract).toLowerCase(), cde);
  } catch (e) {
    push("registry-read", false, e instanceof Error ? e.message : "read failed");
  }

  if (att.tx) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: att.tx as Hex });
      push("compute-tx-mined", receipt.status === "success", att.tx);
    } catch {
      push("compute-tx-mined", false, "receipt not found");
    }
  }

  const valid = checks.every((c) => c.ok);
  return { valid, checks, onChainCommitment };
}
