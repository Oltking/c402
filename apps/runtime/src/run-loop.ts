/** Run one full xCAT confidential-treasury cycle end-to-end on Sepolia. */
import { runTreasuryLoop } from "./index.ts";

async function main() {
  console.log("── xCAT confidential treasury loop ──\n");
  const trace = await runTreasuryLoop();
  console.log("\n──────── SUMMARY ────────");
  console.log(`decision   : #${trace.observation.decision.decisionId} ${trace.observation.decision.action} (conf ${trace.observation.decision.confidence})`);
  console.log(`event      : #${trace.observation.eventId}`);
  console.log(`executed   : ${trace.treasury.execution.executed ? trace.treasury.execution.direction : trace.treasury.execution.note}`);
  if (trace.treasury.execution.swapExplorer) console.log(`swap       : ${trace.treasury.execution.swapExplorer}`);
  console.log(`commitment : ${trace.commitment}`);
  console.log("─────────────────────────");
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
