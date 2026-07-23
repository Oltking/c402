/**
 * @c402/spec — the c402 protocol, in code.
 *
 * c402 sits on top of x402 the same way x402 sits on top of HTTP:
 *   x402  = "pay to access a resource"        (HTTP 402 + PAYMENT-REQUIRED)
 *   c402  = "pay to access a private thought"  (adds two headers on top of x402)
 *
 * A c402 server is any HTTP server that, on an unpaid request, returns 402 with BOTH
 * the standard x402 PAYMENT-REQUIRED header AND a c402 COMPUTE-REQUIRED header describing
 * the confidential computation. On a paid request it runs the computation inside a TEE
 * and returns the result plus an X-ATTESTATION header proving the TEE executed it.
 *
 * Everything else — what the computation means — is up to the server. Two headers. That's it.
 */

export const C402_VERSION = "c402/1" as const;

/** Header carrying the confidential-compute contract (present on the 402 alongside PAYMENT-REQUIRED). */
export const COMPUTE_REQUIRED_HEADER = "Compute-Required";
/** Header carrying the TEE attestation on a successful (paid) response. */
export const ATTESTATION_HEADER = "X-Attestation";

/** Attestation standards a c402 server may declare. */
export type TeeStandard = "iexec-nox/intel-tdx";

/**
 * COMPUTE-REQUIRED — the confidential-compute contract a server publishes on its 402.
 * A client reads this to know what to encrypt, which on-chain TEE contract executes,
 * and what shape of output to expect.
 */
export interface ComputeRequired {
  version: typeof C402_VERSION;
  /** TEE attestation standard this endpoint uses. */
  tee: TeeStandard;
  /** CAIP-2 network the compute contract lives on, e.g. "eip155:11155111". */
  network: string;
  /** On-chain confidential-compute contract (e.g. the CDE) the input is encrypted against. */
  contract: string;
  /** Input the client provides. `encoding` says whether the client or server encrypts it. */
  input: {
    /** Solidity/Nox type or named schema, e.g. "euint256". */
    schema: string;
    /** "nox-handle" = client encrypts to a Nox handle; "plaintext" = server encrypts inside the TEE boundary. */
    encoding: "nox-handle" | "plaintext";
  };
  /** Named schema of the returned result, e.g. "treasury-action". */
  output: { schema: string };
  /** Human description of what the computation does. */
  description?: string;
}

/**
 * X-ATTESTATION — proof the confidential computation actually ran in the TEE.
 * Every field is a real, independently re-verifiable on-chain artifact — no fabricated
 * quotes. A verifier re-reads the decision commitment from chain and checks it matches.
 */
export interface Attestation {
  version: typeof C402_VERSION;
  standard: TeeStandard;
  network: string;
  /** The confidential-compute contract that executed (e.g. CDE). */
  contract: string;
  /** The Nox on-chain TEE coordinator (NoxCompute) this network runs against. */
  coordinator?: string;
  /** Monotonic id of this computation in its registry. */
  decisionId?: string;
  /** On-chain commitment recorded for this computation (checked by @c402/verify). */
  commitment?: string;
  /** Registry contract holding the commitment. */
  registry?: string;
  /** Transaction that performed the confidential computation. */
  tx?: string;
  /** Nox handles of the encrypted outputs (bytes32), decryptable only by ACL-authorized parties. */
  outputHandles?: Record<string, string>;
  issuedAt: number;
}

const b64 = {
  encode: (o: unknown) => Buffer.from(JSON.stringify(o), "utf8").toString("base64"),
  decode: <T>(s: string): T => JSON.parse(Buffer.from(s, "base64").toString("utf8")) as T,
};

export const encodeComputeRequired = (c: ComputeRequired) => b64.encode(c);
export const decodeComputeRequired = (s: string) => b64.decode<ComputeRequired>(s);
export const encodeAttestation = (a: Attestation) => b64.encode(a);
export const decodeAttestation = (s: string) => b64.decode<Attestation>(s);

/** Envelope every c402 server returns on a paid request. */
export interface C402Envelope<T = unknown> {
  result: T;
  attestation: Attestation;
}
