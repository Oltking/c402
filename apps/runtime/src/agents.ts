import {
  type Clients,
  type XcatConfig,
  type Decision,
  type MarketState,
  type ExecutionResult,
  type ActionName,
  readMarketState,
  payForDecision,
  publishEncrypted,
  consumeEvent,
  executeDecision,
} from "@c402/sdk";

const TOPIC = "treasury-decision";
const ACTION_NAMES: ActionName[] = ["HOLD", "HEDGE", "ACCUMULATE"];

export interface MarketObservation {
  market: MarketState;
  decision: Decision;
  eventId: bigint;
  publishTx: string;
}

/**
 * Market Agent - reads real market state, buys a confidential decision from the CDE
 * over x402, then publishes the decision (encrypted) on the EventBus for the Treasury
 * Agent. The public sees an event was emitted; only the Treasury Agent can read it.
 */
export class MarketAgent {
  clients: Clients;
  cfg: XcatConfig;
  log: (m: string) => void;
  constructor(clients: Clients, cfg: XcatConfig, log: (m: string) => void = console.log) {
    this.clients = clients;
    this.cfg = cfg;
    this.log = log;
  }

  async observe(subscriber: `0x${string}`): Promise<MarketObservation> {
    const market = await readMarketState(this.clients, this.cfg);
    this.log(`[market] price ${Math.round(market.priceUsdcPerWeth)} USDC/WETH · exposure ${market.exposureBps}bps · signal ${market.signal}`);

    this.log(`[market] paying CDE for a confidential decision (x402)…`);
    const decision = await payForDecision(this.cfg, market.exposureBps, market.signal);
    this.log(`[market] decision #${decision.decisionId}: ${decision.action} (confidence ${decision.confidence})`);

    this.log(`[market] publishing encrypted decision on EventBus…`);
    const { eventId, tx } = await publishEncrypted(this.clients, this.cfg, TOPIC, BigInt(decision.actionCode), [subscriber]);
    this.log(`[market] published event #${eventId}`);
    return { market, decision, eventId, publishTx: tx };
  }
}

export interface TreasuryAction {
  action: ActionName;
  execution: ExecutionResult;
}

/**
 * Treasury Agent - consumes the encrypted EventBus event (ACL-gated decrypt), recovers
 * the action, and executes it through the Safe + Uniswap adapters.
 */
export class TreasuryAgent {
  clients: Clients;
  cfg: XcatConfig;
  log: (m: string) => void;
  constructor(clients: Clients, cfg: XcatConfig, log: (m: string) => void = console.log) {
    this.clients = clients;
    this.cfg = cfg;
    this.log = log;
  }

  async act(eventId: bigint): Promise<TreasuryAction> {
    this.log(`[treasury] consuming encrypted event #${eventId}…`);
    const code = await consumeEvent(this.clients, this.cfg, eventId);
    const action = ACTION_NAMES[Number(code)] ?? "HOLD";
    this.log(`[treasury] decrypted action: ${action}`);

    const execution = await executeDecision(this.clients, this.cfg, action);
    if (execution.executed) this.log(`[treasury] executed ${execution.direction} swap via Safe: ${execution.swapExplorer}`);
    else this.log(`[treasury] ${execution.note}`);
    return { action, execution };
  }
}
