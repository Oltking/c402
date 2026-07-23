import { loadConfig, makeClients, verifyDecision, EXPLORER, type XcatConfig } from "@xcat/sdk";
import { MarketAgent, TreasuryAgent, type MarketObservation, type TreasuryAction } from "./agents.ts";

export * from "./agents.ts";

export interface LoopTrace {
  observation: MarketObservation;
  treasury: TreasuryAction;
  commitment: string;
  registryExplorer: string;
}

/**
 * Run one full confidential-treasury cycle:
 *   market read → x402-paid confidential decision → encrypted event →
 *   Treasury Agent decrypts → executes swap via Safe → on-chain commitment verified.
 */
export async function runTreasuryLoop(cfg: XcatConfig = loadConfig(), log: (m: string) => void = console.log): Promise<LoopTrace> {
  const clients = makeClients(cfg);
  const subscriber = clients.account.address;

  const market = new MarketAgent(clients, cfg, log);
  const treasury = new TreasuryAgent(clients, cfg, log);

  const observation = await market.observe(subscriber);
  const treasuryAction = await treasury.act(observation.eventId);

  const record = await verifyDecision(clients, cfg, BigInt(observation.decision.decisionId));
  log(`[verify] decision #${record.id} commitment ${record.commitment} @ block ${record.blockNumber}`);

  return {
    observation,
    treasury: treasuryAction,
    commitment: record.commitment,
    registryExplorer: `${EXPLORER}/address/${cfg.addr.registry}`,
  };
}
