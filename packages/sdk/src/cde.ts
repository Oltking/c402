import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import type { XcatConfig } from "./config.ts";

export interface Decision {
  ok: boolean;
  decisionId: string;
  action: "HOLD" | "HEDGE" | "ACCUMULATE";
  actionCode: number;
  confidence: number;
  decideTx: string;
  explorer: string;
}

/**
 * Pay the CDE API via x402 (USDC, exact EVM scheme) and return the confidential decision.
 * This is the agent "buying its intelligence through a privacy-wrapped payment".
 */
export async function payForDecision(cfg: XcatConfig, exposure: bigint, signal: bigint): Promise<Decision> {
  const signer = privateKeyToAccount(cfg.privateKey);
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer, { rpcUrl: cfg.rpc }));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);

  const response = await fetchWithPayment(`${cfg.cdeApiUrl}/v1/decide`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ exposure: exposure.toString(), signal: signal.toString() }),
  });
  const result = (await httpClient.processResponse(response)) as { body?: Decision; status?: number };
  if (!result.body?.ok) throw new Error(`CDE API error (status ${result.status}): ${JSON.stringify(result.body)}`);
  return result.body;
}
