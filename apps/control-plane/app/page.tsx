"use client";
import { useEffect, useState } from "react";
import { Pulse, Chip, AddressPill, SectionTitle, EncryptedBlock } from "@/components/ui";
import { EventFlow } from "@/components/EventFlow";

type Decision = { id: string; commitment: string; caller: string; block: string; timestamp: string; actionHandle: string; confidenceHandle: string };
type Activity = { ts: number; decisionId: string; action: string; confidence: number; exposureBps: string; priceUsdcPerWeth: number; eventId: string; swapTx?: string; direction?: string; executed: boolean; commitment: string };
type State = {
  network: string; explorer: string; contracts: Record<string, string>;
  stats: { decisionCount: string; eventCount: string };
  market: { pool: string; tick: number; priceUsdcPerWeth: number; exposureBps: string };
  safe: { usdc: number; weth: number };
  decisions: Decision[];
  events: { id: string; topic: string; publisher: string; timestamp: string; payloadHandle: string }[];
  activity: Activity[];
  updatedAt: number;
};

const ACTION_COLOR: Record<string, string> = { HEDGE: "#c81e2b", ACCUMULATE: "#15803d", HOLD: "#b45309" };

function useWorkspace() {
  const [state, setState] = useState<State | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/state").then((r) => r.json()).then((d) => { if (!live) return; if (d.error) setErr(d.error); else { setState(d); setErr(null); } }).catch((e) => live && setErr(String(e)));
    load();
    const t = setInterval(load, 12000);
    return () => { live = false; clearInterval(t); };
  }, []);
  return { state, err };
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="panel panel-hover rise p-4">
      <div className="label">{label}</div>
      <div className="tnum mt-2 text-[26px] font-semibold leading-none tracking-tight text-text">{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-faint">{sub}</div>}
    </div>
  );
}

function AgentCard({ name, role, detail, accent }: { name: string; role: string; detail: string; accent: string }) {
  return (
    <div className="panel panel-hover rise p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center border border-line-soft bg-panel-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-text">{name}</div>
            <div className="text-[11.5px] text-faint">{role}</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald"><Pulse /> LIVE</span>
      </div>
      <div className="mt-4 text-[12.5px] leading-relaxed text-muted">{detail}</div>
    </div>
  );
}

export default function Page() {
  const { state, err } = useWorkspace();
  const s = state;

  const actById: Record<string, Activity> = {};
  s?.activity.forEach((a) => { if (!actById[a.decisionId]) actById[a.decisionId] = a; });
  const lastAction = s?.activity[0];

  return (
    <div>
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center border border-line bg-panel">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3.2v5.3c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6.2L12 3z" stroke="#1d4ed8" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2.2 2.2L15.5 10" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-text">xCAT <span className="font-normal text-faint">Control Plane</span></div>
              <div className="text-[11px] text-faint">Confidential Autonomous Treasury · reads live from chain, no mock data</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Chip><Pulse color="#1d4ed8" /> {s?.network ?? "Ethereum Sepolia"}</Chip>
            <Chip className="tnum">{s ? `updated ${new Date(s.updatedAt).toLocaleTimeString()}` : "connecting…"}</Chip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7">
        {err && <div className="panel mb-6 border-rose p-4 text-[13px] text-rose">Error reading workspace: {err}</div>}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Confidential decisions" value={s?.stats.decisionCount ?? "—"} sub="recorded on-chain" />
          <StatTile label="Encrypted events" value={s?.stats.eventCount ?? "—"} sub="EventBus pub/sub" />
          <StatTile label="WETH price" value={s ? `$${Math.round(s.market.priceUsdcPerWeth).toLocaleString()}` : "—"} sub="Uniswap v3 pool" />
          <StatTile label="Treasury exposure" value={s ? `${(Number(s.market.exposureBps) / 100).toFixed(1)}%` : "—"} sub="risk-asset share of Safe" />
        </section>

        {/* Agents */}
        <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <AgentCard name="Market Agent" role="observe · pay · publish" accent="#1d4ed8"
            detail={lastAction ? `Last: read market @ $${lastAction.priceUsdcPerWeth.toLocaleString()}, bought decision #${lastAction.decisionId} via x402, published encrypted event #${lastAction.eventId}.` : "Reads Uniswap price, pays the CDE over x402, publishes an encrypted decision."} />
          <AgentCard name="Treasury Agent" role="decrypt · decide · execute" accent="#4338ca"
            detail={lastAction ? `Last: decrypted event #${lastAction.eventId} → ${lastAction.action}${lastAction.executed ? `, executed ${lastAction.direction} swap via Safe.` : "."}` : "Consumes the encrypted event, recovers the action, executes via Safe + Uniswap."} />
        </section>

        {/* Decision queue + portfolio */}
        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="panel rise p-5 lg:col-span-2">
            <SectionTitle right={<Chip>confidence public · reasoning 🔒</Chip>}>Decision queue</SectionTitle>
            <div className="space-y-2.5">
              {(s?.decisions ?? []).map((d) => {
                const a = actById[d.id];
                return (
                  <div key={d.id} className="border border-line-soft bg-panel-2 p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="mono border border-line-soft bg-panel px-1.5 py-0.5 text-[11px] text-muted">#{d.id}</span>
                        {a ? (
                          <span className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold tnum" style={{ color: ACTION_COLOR[a.action], borderColor: `${ACTION_COLOR[a.action]}44`, background: `${ACTION_COLOR[a.action]}0f` }}>
                            confidence {a.confidence}%
                          </span>
                        ) : (
                          <span className="chip">confidence 🔒</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {s && <AddressPill address={d.commitment} explorer={s.explorer} kind="tx" />}
                        <a href={`/verify/${d.id}`} className="btn !py-1 !text-[12px]">verify</a>
                      </div>
                    </div>
                    <div className="mt-3">
                      <EncryptedBlock handle={d.actionHandle} label="decision · reasoning" viewer="Treasury runtime" rows={2} />
                    </div>
                  </div>
                );
              })}
              {s && s.decisions.length === 0 && <div className="text-[13px] text-faint">No decisions yet — run <span className="mono text-muted">xcat run</span>.</div>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="panel rise p-5">
              <SectionTitle>Portfolio · Safe</SectionTitle>
              <ExposureBar bps={Number(s?.market.exposureBps ?? 0)} />
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[13px]"><span className="text-muted">USDC</span><span className="mono tnum text-text">{s ? s.safe.usdc.toFixed(2) : "—"}</span></div>
                <div className="flex items-center justify-between text-[13px]"><span className="text-muted">WETH</span><span className="mono tnum text-text">{s ? s.safe.weth.toFixed(6) : "—"}</span></div>
              </div>
              {s && <div className="mt-3 border-t border-line-soft pt-3"><AddressPill address={s.contracts.Safe} explorer={s.explorer} /></div>}
            </div>
            <div className="panel rise p-5">
              <SectionTitle>Confidential metering</SectionTitle>
              <p className="text-[12px] leading-relaxed text-muted">x402 payment amounts are metered <span className="text-text">encrypted</span> on-chain — decryptable only by the API owner.</p>
              {s && <div className="mt-3"><EncryptedBlock handle={s.contracts.PaymentMeter} label="grand total · USDC" viewer="API owner" rows={1} /></div>}
            </div>
          </div>
        </section>

        {/* Event bus flow */}
        <section className="panel rise mt-3 p-5">
          <SectionTitle right={<Chip>ACL-gated handles</Chip>}>Confidential event bus</SectionTitle>
          <EventFlow active={!!lastAction} />
        </section>

        {/* Execution history */}
        <section className="panel rise mt-3 p-5">
          <SectionTitle right={s ? <AddressPill address={s.contracts.CDE} explorer={s.explorer} /> : null}>Execution history</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="text-faint">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-medium">Decision</th><th className="py-2 pr-4 font-medium">Action</th><th className="py-2 pr-4 font-medium">Executed</th><th className="py-2 pr-4 font-medium">Swap</th><th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {(s?.activity ?? []).map((a, i) => (
                  <tr key={i} className="border-b border-line-soft">
                    <td className="py-2.5 pr-4"><span className="mono text-muted">#{a.decisionId}</span></td>
                    <td className="py-2.5 pr-4"><span className="font-semibold" style={{ color: ACTION_COLOR[a.action] }}>{a.action}</span></td>
                    <td className="py-2.5 pr-4 text-muted">{a.executed ? a.direction : "—"}</td>
                    <td className="py-2.5 pr-4">{a.swapTx && s ? <AddressPill address={a.swapTx} explorer={s.explorer} kind="tx" /> : <span className="text-faint">—</span>}</td>
                    <td className="py-2.5 tnum text-faint">{new Date(a.ts).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {s && s.activity.length === 0 && <tr><td colSpan={5} className="py-4 text-[13px] text-faint">No executions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer contracts */}
        <footer className="mt-5 flex flex-wrap items-center gap-2 pb-10">
          {s && Object.entries(s.contracts).map(([k, v]) => (
            <span key={k} className="chip">{k} <AddressPill address={v} explorer={s.explorer} /></span>
          ))}
        </footer>
      </main>
    </div>
  );
}

function ExposureBar({ bps }: { bps: number }) {
  const pct = Math.min(100, bps / 100);
  const over = bps > 5000;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
        <span className="text-muted">Risk-asset exposure</span>
        <span className="mono tnum font-semibold" style={{ color: over ? "#c81e2b" : "#15803d" }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden border border-line-soft bg-panel-2">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: over ? "#c81e2b" : "#1d4ed8" }} />
      </div>
      <div className="mt-1.5 text-[10.5px] text-faint">hedge threshold 50% · {over ? "would HEDGE" : "within policy"}</div>
    </div>
  );
}
