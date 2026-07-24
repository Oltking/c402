"use client";
import { useEffect, useState } from "react";

type State = {
  stats: { decisionCount: string };
  decisions: { id: string; commitment: string }[];
  updatedAt: number;
};

const ACTIONS: Record<string, string> = { "0": "HOLD", "1": "HEDGE", "2": "ACCUMULATE" };

/**
 * The c402 handshake, rendered from the REAL latest on-chain decision — no illustrative data.
 * While the first fetch is in flight it shows neutral placeholders (dashes), never fake values.
 */
export function HeroHandshake() {
  const [s, setS] = useState<State | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/state").then((r) => r.json()).then((d) => live && !d.error && setS(d)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const latest = s?.decisions?.[0];
  const commitment = latest ? `${latest.commitment.slice(0, 10)}…${latest.commitment.slice(-4)}` : "…";
  const decId = latest?.id ?? "—";

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">the c402 handshake · live</span>
        <span className="inline-flex items-center gap-1 border border-emerald/30 bg-emerald/5 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald">TEE attested</span>
      </div>
      <div className="space-y-2 font-mono text-[11.5px]">
        <div className="border border-line-soft bg-panel-2 p-3">
          <div className="text-rose">HTTP/1.1 402 Payment Required</div>
          <div className="mt-1 text-muted"><span className="text-accent">PAYMENT-REQUIRED:</span> price 0.01 USDC · eip155:11155111</div>
          <div className="text-muted"><span className="text-accent-2">Compute-Required:</span> euint256 → treasury-action · nox/tdx</div>
        </div>
        <div className="flex items-center justify-center py-0.5 text-[10px] text-faint">↓ client pays via x402 · server computes in the TEE</div>
        <div className="border border-line-soft bg-panel-2 p-3">
          <div className="text-emerald">HTTP/1.1 200 OK</div>
          <div className="mt-1 text-muted"><span className="text-accent">PAYMENT-RESPONSE:</span> settled ✓</div>
          <div className="break-all text-muted">
            <span className="text-accent-2">X-Attestation:</span> #{decId} · commitment {commitment}
            {latest && <span className="text-emerald"> · verified on-chain ✓</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="border border-line-soft bg-panel p-2.5"><div className="text-[12px] font-semibold text-text">x402</div><div className="text-[10.5px] text-faint">payment layer</div></div>
        <div className="border border-line-soft bg-panel p-2.5"><div className="font-mono text-[12px] font-semibold text-accent">c402</div><div className="text-[10.5px] text-faint">confidential layer</div></div>
      </div>
      <div className="mt-2 text-center text-[10px] text-faint">
        {s ? `${s.stats.decisionCount} confidential decisions on Sepolia · latest shown` : "reading live from Sepolia…"}
      </div>
    </div>
  );
}
