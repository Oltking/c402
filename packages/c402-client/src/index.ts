/**
 * @c402/client — call a confidential endpoint as if it were a normal fetch.
 *
 *   const fetch = c402Fetch({ signer, network });
 *   const res = await fetch("http://cde/decide", { method: "POST", body: { ... } });
 *   res.result       // the computation output
 *   res.attestation  // the TEE proof
 *   res.verified     // re-checked on-chain (when rpcUrl is provided)
 *
 * Under the hood it reads COMPUTE-REQUIRED, pays via x402 (@x402/fetch + ExactEvmScheme),
 * reads X-ATTESTATION, and optionally re-verifies the attestation on-chain via @c402/verify.
 */
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import type { LocalAccount } from "viem";
import {
  type Attestation,
  type ComputeRequired,
  ATTESTATION_HEADER,
  COMPUTE_REQUIRED_HEADER,
  decodeAttestation,
  decodeComputeRequired,
} from "@c402/spec";
import { verifyAttestation, type VerifyResult } from "@c402/verify";

export interface C402FetchOptions {
  /** The account that pays (viem LocalAccount, e.g. privateKeyToAccount(key)). */
  signer: LocalAccount;
  /** CAIP-2 network the endpoint settles on, e.g. "eip155:11155111". */
  network: string;
  /** RPC for payment (and, if `verify` is on, for attestation re-verification). */
  rpcUrl?: string;
  /** Re-verify the attestation on-chain after each call. Needs rpcUrl. Default true when rpcUrl set. */
  verify?: boolean;
}

export interface C402Response<T = unknown> {
  ok: boolean;
  status: number;
  /** The computation result. */
  result: T;
  /** The compute contract the server advertised on its 402. */
  computeRequired?: ComputeRequired;
  /** The TEE attestation returned with the paid response. */
  attestation?: Attestation;
  /** On-chain re-verification result (when enabled). */
  verified?: VerifyResult;
}

export interface C402RequestInit extends Omit<RequestInit, "body"> {
  /** Plain object body — JSON-encoded automatically. */
  body?: unknown;
}

export function c402Fetch(opts: C402FetchOptions) {
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(opts.signer, opts.rpcUrl ? { rpcUrl: opts.rpcUrl } : undefined));
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);
  const shouldVerify = opts.verify ?? !!opts.rpcUrl;

  return async function c402<T = unknown>(url: string, init: C402RequestInit = {}): Promise<C402Response<T>> {
    const { body, headers, ...rest } = init;
    const response = await fetchWithPayment(url, {
      ...rest,
      method: init.method ?? "POST",
      headers: { "content-type": "application/json", ...(headers as Record<string, string> | undefined) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Headers are readable on the final (paid) response too — the server sets COMPUTE-REQUIRED
    // on every response, and X-ATTESTATION on success.
    const crHeader = response.headers.get(COMPUTE_REQUIRED_HEADER);
    const atHeader = response.headers.get(ATTESTATION_HEADER);
    const computeRequired = crHeader ? safe(() => decodeComputeRequired(crHeader)) : undefined;

    const processed = (await httpClient.processResponse(response)) as { body?: unknown; status?: number };
    const status = processed.status ?? response.status;
    const envelope = processed.body as { result?: T; attestation?: Attestation } | undefined;

    const attestation =
      envelope?.attestation ?? (atHeader ? safe(() => decodeAttestation(atHeader)) : undefined);

    let verified: VerifyResult | undefined;
    if (shouldVerify && attestation && opts.rpcUrl) {
      verified = await verifyAttestation(attestation, { rpcUrl: opts.rpcUrl }).catch(() => undefined);
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      result: (envelope?.result ?? envelope) as T,
      computeRequired,
      attestation,
      verified,
    };
  };
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export type { Attestation, ComputeRequired } from "@c402/spec";
export type { VerifyResult } from "@c402/verify";
