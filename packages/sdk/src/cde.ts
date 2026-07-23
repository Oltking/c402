import { privateKeyToAccount } from "viem/accounts";
import { c402Fetch, type Attestation, type VerifyResult } from "@c402/client";
import type { XcatConfig } from "./config.ts";

export interface Decision {
  ok: boolean;
  decisionId: string;
  action: "HOLD" | "HEDGE" | "ACCUMULATE";
  actionCode: number;
  confidence: number;
  decideTx: string;
  commitment?: string;
  explorer: string;
  /** TEE attestation for this confidential decision (c402). */
  attestation?: Attestation;
  /** On-chain re-verification of the attestation (c402). */
  verified?: VerifyResult;
}

/**
 * Pay the CDE — a c402 confidential-compute endpoint — and return the attested decision.
 * The agent "buys its intelligence": @c402/client reads COMPUTE-REQUIRED, pays via x402,
 * reads X-ATTESTATION, and re-verifies the attestation on-chain — all invisibly.
 */
export async function payForDecision(cfg: XcatConfig, exposure: bigint, signal: bigint): Promise<Decision> {
  const call = c402Fetch({
    signer: privateKeyToAccount(cfg.privateKey),
    network: "eip155:11155111",
    rpcUrl: cfg.rpc,
  });

  const res = await call<Decision>(`${cfg.cdeApiUrl}/v1/decide`, {
    body: { exposure: exposure.toString(), signal: signal.toString() },
  });

  if (!res.ok || !res.result?.ok) {
    throw new Error(`CDE c402 call failed (status ${res.status}): ${JSON.stringify(res.result)}`);
  }
  return { ...res.result, attestation: res.attestation, verified: res.verified };
}
