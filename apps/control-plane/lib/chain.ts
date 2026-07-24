import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createPublicClient, http, parseAbi, getAddress, hexToString, type Abi, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { verifyAttestation, type VerifyResult } from "@c402/verify";

const REPO_ROOT = resolve(process.cwd(), "../..");
loadEnv({ path: resolve(REPO_ROOT, ".env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

export const ADDR = {
  cde: getAddress(req("CDE_ADDRESS")),
  registry: getAddress(req("DECISION_REGISTRY_ADDRESS")),
  meter: getAddress(req("PAYMENT_METER_ADDRESS")),
  eventBus: getAddress(req("EVENT_BUS_ADDRESS")),
  safe: getAddress(req("SAFE_ADDRESS")),
  usdc: getAddress(req("USDC_ADDRESS")),
  weth: getAddress(req("WETH9_ADDRESS")),
  factory: getAddress(req("UNISWAP_V3_FACTORY")),
  poolFee: Number(process.env.UNISWAP_POOL_FEE || "500"),
};

const RPC = req("SEPOLIA_RPC_URL");
const pc = createPublicClient({ chain: sepolia, transport: http(RPC) });
// Inline ABIs (only the read fns the UI needs) so the app deploys anywhere (e.g. Vercel)
// without bundling contract artifacts. euint256 handles are bytes32 on the wire.
const CDE_ABI = parseAbi([
  "function decisionCount() view returns (uint256)",
  "function actionOf(uint256) view returns (bytes32)",
  "function confidenceOf(uint256) view returns (bytes32)",
]);
const REGISTRY_ABI = parseAbi([
  "struct Decision { uint256 id; bytes32 commitment; address cde; address caller; uint64 timestamp; uint256 blockNumber; }",
  "function getDecision(uint256) view returns (Decision)",
]);
const EVENTBUS_ABI = parseAbi([
  "function eventCount() view returns (uint256)",
  "function events(uint256) view returns (uint256 id, bytes32 topic, address publisher, uint64 timestamp, uint256 subscriberCount)",
  "function payloadOf(uint256) view returns (bytes32)",
]);
const ERC20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const FACTORY = parseAbi(["function getPool(address,address,uint24) view returns (address)"]);
const POOL = parseAbi(["function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)"]);

export interface ActivityRecord {
  ts: number; decisionId: string; action: string; actionCode: number; confidence: number;
  exposureBps: string; priceUsdcPerWeth: number; eventId: string; publishTx?: string;
  swapTx?: string; direction?: string; executed: boolean; commitment: string;
  attestation?: { standard: string; network: string; contract: string; tx?: string; coordinator?: string };
  verified?: { valid: boolean; checks: { name: string; ok: boolean }[] };
}
export function readActivity(): ActivityRecord[] {
  try {
    const p = resolve(REPO_ROOT, ".xcat-state/activity.json");
    if (!existsSync(p)) return [];
    return (JSON.parse(readFileSync(p, "utf8")) as ActivityRecord[]).slice().reverse();
  } catch { return []; }
}

export interface WorkspaceState {
  network: string;
  contracts: Record<string, Address>;
  explorer: string;
  stats: { decisionCount: string; eventCount: string };
  market: { pool: Address; tick: number; priceUsdcPerWeth: number; exposureBps: string };
  safe: { usdc: number; weth: number };
  decisions: { id: string; commitment: Hex; caller: Address; block: string; timestamp: string; actionHandle: Hex; confidenceHandle: Hex }[];
  events: { id: string; topic: string; publisher: Address; timestamp: string; payloadHandle: Hex }[];
  activity: ActivityRecord[];
  // The latest decision's attestation, re-verified live on-chain by @c402/verify. Always
  // populated from chain (independent of any local activity log), so it works on any deploy.
  liveAttestation?: {
    decisionId: string; commitment: string; contract: Address; registry: Address;
    standard: string; network: string; verified: VerifyResult;
  };
  updatedAt: number;
}

async function read<T>(address: Address, abi: Abi, functionName: string, args: unknown[] = []): Promise<T> {
  return pc.readContract({ address, abi, functionName, args }) as Promise<T>;
}

const SAFE_ABI = parseAbi([
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function VERSION() view returns (string)",
]);

export interface SafeInfo {
  address: Address;
  owners: Address[];
  threshold: number;
  version: string;
}

// Verifies an address is a real deployed Safe on Sepolia and returns its owners.
export async function getSafeInfo(address: Address): Promise<SafeInfo | null> {
  try {
    const a = getAddress(address);
    const code = await pc.getCode({ address: a });
    if (!code || code === "0x") return null;
    const [owners, threshold, version] = await Promise.all([
      read<Address[]>(a, SAFE_ABI, "getOwners"),
      read<bigint>(a, SAFE_ABI, "getThreshold"),
      read<string>(a, SAFE_ABI, "VERSION").catch(() => "unknown"),
    ]);
    return { address: a, owners: owners.map((o) => getAddress(o)), threshold: Number(threshold), version };
  } catch {
    return null;
  }
}

// Named c402 apps whose decisions can be verified through the UI.
export const APP_REGISTRIES: Record<string, { registry?: Address; cde?: Address; label: string }> = {
  treasury: { registry: ADDR.registry, cde: ADDR.cde, label: "Confidential Treasury" },
  payroll: {
    registry: process.env.PAYROLL_REGISTRY_ADDRESS ? getAddress(process.env.PAYROLL_REGISTRY_ADDRESS) : undefined,
    cde: process.env.PAYROLL_CDE_ADDRESS ? getAddress(process.env.PAYROLL_CDE_ADDRESS) : undefined,
    label: "Confidential Payroll",
  },
};

export async function getDecisionRecord(id: bigint, app: string = "treasury") {
  const cfg = APP_REGISTRIES[app] ?? APP_REGISTRIES.treasury;
  const registry = cfg.registry;
  const cde = cfg.cde;
  if (!registry || !cde) return null;
  try {
    const d = await read<{ commitment: Hex; cde: Address; caller: Address; blockNumber: bigint; timestamp: bigint }>(registry, REGISTRY_ABI, "getDecision", [id]);
    const actionHandle = await read<Hex>(cde, CDE_ABI, "actionOf", [id]);
    return { id: id.toString(), app, appLabel: cfg.label, commitment: d.commitment, cde: d.cde, caller: d.caller, block: d.blockNumber.toString(), timestamp: d.timestamp.toString(), actionHandle, registry, explorer: "https://sepolia.etherscan.io" };
  } catch {
    return null;
  }
}

export interface PayrollState {
  network: string;
  explorer: string;
  contracts: { PayrollCDE: Address; DecisionRegistry: Address };
  decisionCount: string;
  decisions: { id: string; commitment: Hex; caller: Address; block: string; timestamp: string; actionHandle: Hex; confidenceHandle: Hex }[];
  updatedAt: number;
}

export async function getPayrollState(): Promise<PayrollState> {
  const cde = APP_REGISTRIES.payroll.cde;
  const registry = APP_REGISTRIES.payroll.registry;
  if (!cde || !registry) throw new Error("PAYROLL_CDE_ADDRESS / PAYROLL_REGISTRY_ADDRESS not configured");

  const count = await read<bigint>(cde, CDE_ABI, "decisionCount");
  const n = Number(count);
  const ids = Array.from({ length: Math.min(6, n) }, (_, i) => BigInt(n - i)).filter((x) => x > 0n);
  const decisions = await Promise.all(
    ids.map(async (id) => {
      const [d, actionHandle, confidenceHandle] = await Promise.all([
        read<{ commitment: Hex; caller: Address; blockNumber: bigint; timestamp: bigint }>(registry, REGISTRY_ABI, "getDecision", [id]),
        read<Hex>(cde, CDE_ABI, "actionOf", [id]),
        read<Hex>(cde, CDE_ABI, "confidenceOf", [id]),
      ]);
      return { id: id.toString(), commitment: d.commitment, caller: d.caller, block: d.blockNumber.toString(), timestamp: d.timestamp.toString(), actionHandle, confidenceHandle };
    }),
  );
  return {
    network: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
    contracts: { PayrollCDE: cde, DecisionRegistry: registry },
    decisionCount: count.toString(),
    decisions,
    updatedAt: Date.now(),
  };
}

export async function getWorkspaceState(overrides?: { safe?: Address }): Promise<WorkspaceState> {
  const safeAddr = overrides?.safe ? getAddress(overrides.safe) : ADDR.safe;
  const [decisionCount, eventCount, sqrtSlot0, usdcBal, wethBal] = await Promise.all([
    read<bigint>(ADDR.cde, CDE_ABI, "decisionCount"),
    read<bigint>(ADDR.eventBus, EVENTBUS_ABI, "eventCount"),
    (async () => {
      const pool = await read<Address>(ADDR.factory, FACTORY, "getPool", [ADDR.weth, ADDR.usdc, ADDR.poolFee]);
      const slot0 = await read<readonly [bigint, number, number, number, number, number, boolean]>(pool, POOL, "slot0");
      return { pool, slot0 };
    })(),
    read<bigint>(ADDR.usdc, ERC20, "balanceOf", [safeAddr]),
    read<bigint>(ADDR.weth, ERC20, "balanceOf", [safeAddr]),
  ]);

  const sqrtP = Number(sqrtSlot0.slot0[0]) / 2 ** 96;
  const priceRaw = sqrtP * sqrtP;
  const priceUsdcPerWeth = priceRaw > 0 ? 1e12 / priceRaw : 0;
  const usdcValue = Number(usdcBal) / 1e6;
  const wethValue = (Number(wethBal) / 1e18) * priceUsdcPerWeth;
  const total = usdcValue + wethValue;
  const exposureBps = total > 0 ? Math.round((wethValue / total) * 10000) : 0;

  const dCount = Number(decisionCount);
  const decisionIds = Array.from({ length: Math.min(6, dCount) }, (_, i) => BigInt(dCount - i)).filter((n) => n > 0n);
  const decisions = await Promise.all(
    decisionIds.map(async (id) => {
      const [d, actionHandle, confidenceHandle] = await Promise.all([
        read<{ commitment: Hex; caller: Address; blockNumber: bigint; timestamp: bigint }>(ADDR.registry, REGISTRY_ABI, "getDecision", [id]),
        read<Hex>(ADDR.cde, CDE_ABI, "actionOf", [id]),
        read<Hex>(ADDR.cde, CDE_ABI, "confidenceOf", [id]),
      ]);
      return { id: id.toString(), commitment: d.commitment, caller: d.caller, block: d.blockNumber.toString(), timestamp: d.timestamp.toString(), actionHandle, confidenceHandle };
    }),
  );

  const eCount = Number(eventCount);
  const eventIds = Array.from({ length: Math.min(6, eCount) }, (_, i) => BigInt(eCount - i)).filter((n) => n > 0n);
  const events = await Promise.all(
    eventIds.map(async (id) => {
      const meta = (await read<readonly [bigint, Hex, Address, bigint, bigint]>(ADDR.eventBus, EVENTBUS_ABI, "events", [id]));
      const payloadHandle = await read<Hex>(ADDR.eventBus, EVENTBUS_ABI, "payloadOf", [id]);
      let topic = "";
      try { topic = hexToString(meta[1]).replace(/ +$/g, ""); } catch { topic = meta[1]; }
      return { id: id.toString(), topic, publisher: meta[2], timestamp: meta[3].toString(), payloadHandle };
    }),
  );

  // Re-verify the latest decision's attestation live on-chain (works on any deploy, no local log).
  let liveAttestation: WorkspaceState["liveAttestation"];
  const latest = decisions[0];
  if (latest) {
    try {
      const verified = await verifyAttestation(
        { version: "c402/1", standard: "iexec-nox/intel-tdx", network: "eip155:11155111", contract: ADDR.cde, registry: ADDR.registry, decisionId: latest.id, commitment: latest.commitment, issuedAt: 0 },
        { rpcUrl: RPC },
      );
      liveAttestation = { decisionId: latest.id, commitment: latest.commitment, contract: ADDR.cde, registry: ADDR.registry, standard: "iexec-nox/intel-tdx", network: "eip155:11155111", verified };
    } catch { /* leave undefined */ }
  }

  return {
    network: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
    contracts: { CDE: ADDR.cde, DecisionRegistry: ADDR.registry, PaymentMeter: ADDR.meter, EventBus: ADDR.eventBus, Safe: safeAddr },
    stats: { decisionCount: decisionCount.toString(), eventCount: eventCount.toString() },
    market: { pool: sqrtSlot0.pool, tick: Number(sqrtSlot0.slot0[1]), priceUsdcPerWeth, exposureBps: exposureBps.toString() },
    safe: { usdc: usdcValue, weth: Number(wethBal) / 1e18 },
    decisions,
    events,
    activity: readActivity(),
    liveAttestation,
    updatedAt: Date.now(),
  };
}
