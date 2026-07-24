/**
 * @c402/server - one function to publish a confidential, pay-per-call compute endpoint.
 *
 *   app.post("/decide", c402({ price, token, network, facilitator, contract, schema, compute }))
 *
 * The middleware:
 *   1. Attaches the COMPUTE-REQUIRED header (so the 402 advertises the confidential contract).
 *   2. Gates the route behind x402 (payment settled by the configured facilitator).
 *   3. On a paid request, runs `compute(...)` and returns { result, attestation } with X-ATTESTATION.
 *
 * It wraps @x402/express (payment) + @c402/spec (headers). It does NOT reimplement x402.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { x402ResourceServer, paymentMiddleware, type Network } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  type Attestation,
  type ComputeRequired,
  type TeeStandard,
  C402_VERSION,
  COMPUTE_REQUIRED_HEADER,
  ATTESTATION_HEADER,
  encodeComputeRequired,
  encodeAttestation,
} from "@c402/spec";

export interface C402Config {
  /** Human-readable price, e.g. "0.01" - converted to atomic units with `decimals`. */
  price: string;
  /** ERC-20 (EIP-3009) settlement token address, e.g. Circle Sepolia USDC. */
  token: `0x${string}`;
  /** Token decimals (USDC = 6). Default 6. */
  decimals?: number;
  /** EIP-712 domain of the token, needed when the token doesn't expose eip712Domain(). */
  tokenDomain?: { name: string; version: string };
  /** CAIP-2 network, e.g. "eip155:11155111". */
  network: string;
  /** URL of the x402 facilitator that settles payment. */
  facilitator: string;
  /** Address that receives payment. Defaults to the facilitator's configured payTo. */
  payTo: `0x${string}`;
  /** On-chain confidential-compute contract the input is encrypted against (e.g. CDE). */
  contract: `0x${string}`;
  /** TEE standard. Default "iexec-nox/intel-tdx". */
  tee?: TeeStandard;
  /** Nox on-chain TEE coordinator (NoxCompute) - included in the attestation. */
  coordinator?: `0x${string}`;
  /** What the client provides and what comes back. */
  schema: {
    input: string;
    inputEncoding?: "nox-handle" | "plaintext";
    output: string;
  };
  description?: string;
  /**
   * The confidential computation. Receives the parsed request body and a context with the
   * declared contract + network. Return the result plus the on-chain artifacts that make the
   * attestation verifiable (decisionId / commitment / tx / handles).
   */
  compute: (input: unknown, ctx: ComputeContext) => Promise<ComputeResult>;
}

export interface ComputeContext {
  contract: `0x${string}`;
  network: string;
  req: Request;
}

export interface ComputeResult {
  /** The result payload returned to the client under `result`. */
  result: unknown;
  /** On-chain artifacts proving the TEE ran - surfaced in X-ATTESTATION. */
  decisionId?: string | number | bigint;
  commitment?: string;
  registry?: string;
  tx?: string;
  outputHandles?: Record<string, string>;
}

function toAtomic(price: string, decimals: number): string {
  const [whole, frac = ""] = price.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0")).toString();
}

export function c402(config: C402Config): RequestHandler[] {
  const decimals = config.decimals ?? 6;
  const tee: TeeStandard = config.tee ?? "iexec-nox/intel-tdx";
  const amount = toAtomic(config.price, decimals);

  const computeRequired: ComputeRequired = {
    version: C402_VERSION,
    tee,
    network: config.network,
    contract: config.contract,
    input: { schema: config.schema.input, encoding: config.schema.inputEncoding ?? "plaintext" },
    output: { schema: config.schema.output },
    description: config.description,
  };
  const computeHeaderValue = encodeComputeRequired(computeRequired);

  const facilitatorClient = new HTTPFacilitatorClient({ url: config.facilitator });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(config.network as Network, new ExactEvmScheme());

  // 1) Advertise the confidential contract on every response to this route (meaningful on the 402).
  const advertise: RequestHandler = (_req, res, next) => {
    res.setHeader(COMPUTE_REQUIRED_HEADER, computeHeaderValue);
    next();
  };

  // 2) x402 gate. Built per-request so the route key always matches the mounted path -
  //    no need to make the caller repeat the path in config.
  const gate: RequestHandler = (req, res, next) => {
    const key = `${req.method} ${req.path}`;
    const routes: RoutesConfig = {
      [key]: {
        accepts: {
          scheme: "exact",
          network: config.network as Network,
          payTo: config.payTo,
          price: { asset: config.token, amount, extra: config.tokenDomain },
        },
        description: config.description ?? "c402 confidential computation",
        mimeType: "application/json",
      },
    } as unknown as RoutesConfig;
    return paymentMiddleware(routes, resourceServer)(req, res, next);
  };

  // 3) Run the confidential computation and attach the attestation.
  const run: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await config.compute(req.body, { contract: config.contract, network: config.network, req });
      const attestation: Attestation = {
        version: C402_VERSION,
        standard: tee,
        network: config.network,
        contract: config.contract,
        coordinator: config.coordinator,
        decisionId: out.decisionId !== undefined ? String(out.decisionId) : undefined,
        commitment: out.commitment,
        registry: out.registry,
        tx: out.tx,
        outputHandles: out.outputHandles,
        issuedAt: Date.now(),
      };
      res.setHeader(ATTESTATION_HEADER, encodeAttestation(attestation));
      res.json({ result: out.result, attestation });
    } catch (e) {
      next(e);
    }
  };

  return [advertise, gate, run];
}

export type { Attestation, ComputeRequired } from "@c402/spec";
