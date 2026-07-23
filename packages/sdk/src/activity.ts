import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const STATE_DIR = resolve(REPO_ROOT, ".xcat-state");
const ACTIVITY_PATH = resolve(STATE_DIR, "activity.json");

export interface ActivityRecord {
  ts: number;
  decisionId: string;
  action: string;
  actionCode: number;
  confidence: number;
  exposureBps: string;
  priceUsdcPerWeth: number;
  eventId: string;
  publishTx?: string;
  swapTx?: string;
  direction?: string;
  executed: boolean;
  commitment: string;
  /** c402 TEE attestation the agent received + re-verified on-chain for this decision. */
  attestation?: { standard: string; network: string; contract: string; tx?: string; coordinator?: string };
  verified?: { valid: boolean; checks: { name: string; ok: boolean }[] };
}

/** Real, verifiable log of executed loops (every entry re-checkable via `xcat verify`). */
export function readActivity(): ActivityRecord[] {
  try {
    if (!existsSync(ACTIVITY_PATH)) return [];
    return JSON.parse(readFileSync(ACTIVITY_PATH, "utf8")) as ActivityRecord[];
  } catch {
    return [];
  }
}

export function appendActivity(record: ActivityRecord): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  const all = readActivity();
  all.push(record);
  writeFileSync(ACTIVITY_PATH, JSON.stringify(all.slice(-100), null, 2));
}

export { ACTIVITY_PATH };
