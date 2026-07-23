"use client";
import { useEffect, useState } from "react";
import { Pulse, Chip, AddressPill, SectionTitle, EncryptedBlock, short } from "@/components/ui";
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

const ACTION_COLOR: Record<string, string> = { HEDGE: "#fb7185", ACCUMULATE: "#34d399", HOLD: "#fbbf24" };

function useState_() {
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
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-text">{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] text-faint">{sub}</div>}
    </div>
  );
}

function AgentCard({ name, role, status, detail, accent }: { name: string; role: string; status: string; detail: string; accent: string }) {
  return (
    <div className="panel panel-hover rise p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-line-2" style={{ background: `radial-gradient(120% 120% at 30% 20%, ${accent}22, transparent)` }}>
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-text">{name}</div>
            <div className="text-[11.5px] text-faint">{role}</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald"><Pulse /> {status}</span>
      </div>
      <div className="mt-4 text-[12.5px] text-muted">{detail}</div>
    </div>
  );
}

export default function Page() {
  const { state, err } = useState_();
  const s = state;

  const actById: Record<string, Activity> = {};
  s?.activity.forEach((a) => { if (!actById[a.decisionId]) actById[a.decisionId] = a; });
  const lastAction = s?.activity[0];

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rise">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-line-2 bg-panel-2" style={{ boxShadow: "0 0 30px -6px rgba(91,140,255,0.4)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3.2v5.3c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6.2L12 3z" stroke="#5b8cff" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2.2 2.2L15.5 10" stroke="#7c5cff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <div className="text-[17px] font-semibold tracking-tight text-text">xCAT <span className="font-normal text-faint">Control Plane</span></div>
            <div className="text-[11.5px] text-faint">Confidential Autonomous Treasury · reads live from chain, no mock data</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip><Pulse color="#5b8cff" /> {s?.network ?? "Ethereum Sepolia"}</Chip>
          <Chip>{s ? `updated ${new Date(s.updatedAt).toLocaleTimeString()}` : "connecting…"}</Chip>
        </div>
      </header>

      {err && <div className="panel mt-6 border-rose/30 p-4 text-[13px] text-rose">Error reading workspace: {err}</div>}

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Confidential decisions" value={s?.stats.decisionCount ?? "—"} sub="recorded on-chain" />
        <StatTile label="Encrypted events" value={s?.stats.eventCount ?? "—"} sub="EventBus pub/sub" />
        <StatTile label="WETH price" value={s ? `$${Math.round(s.market.priceUsdcPerWeth).toLocaleString()}` : "—"} sub="Uniswap v3 pool" />
        <StatTile label="Treasury exposure" value={s ? `${(Number(s.market.exposureBps) / 100).toFixed(1)}%` : "—"} sub="risk-asset share of Safe" />
      </section>

      {/* Agents */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AgentCard name="Market Agent" role="observe · pay · publish" status="live" accent="#5b8cff"
          detail={lastAction ? `Last: read market @ $${lastAction.priceUsdcPerWeth.toLocaleString()}, bought decision #${lastAction.decisionId} via x402, published encrypted event #${lastAction.eventId}.` : "Reads Uniswap price, pays the CDE over x402, publishes an encrypted decision."} />
        <AgentCard name="Treasury Agent" role="decrypt · decide · execute" status="live" accent="#7c5cff"
          detail={lastAction ? `Last: decrypted event #${lastAction.eventId} → ${lastAction.action}${lastAction.executed ? `, executed ${lastAction.direction} swap via Safe.` : "."}` : "Consumes the encrypted event, recovers the action, executes via Safe + Uniswap."} />
      </section>

      {/* Decision queue + market/portfolio */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel rise p-5 lg:col-span-2">
          <SectionTitle right={<Chip>confidence public · reasoning 🔒</Chip>}>Decision queue</SectionTitle>
          <div className="space-y-3">
            {(s?.decisions ?? []).map((d) => {
              const a = actById[d.id];
              return (
                <div key={d.id} className="rounded-xl border border-line bg-panel-2/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="mono rounded-md border border-line-2 bg-panel px-1.5 py-0.5 text-[11px] text-muted">#{d.id}</span>
                      {a ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: ACTION_COLOR[a.action], background: `${ACTION_COLOR[a.action]}14` }}>
                          confidence {a.confidence}%
                        </span>
                      ) : (
                        <span className="chip">confidence 🔒</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <AddressPill address={d.commitment} explorer={s!.explorer} kind="tx" />
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

        <div className="space-y-4">
          <div className="panel rise p-5">
            <SectionTitle>Portfolio · Safe</SectionTitle>
            <div className="space-y-3">
              <ExposureBar bps={Number(s?.market.exposureBps ?? 0)} />
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted">USDC</span><span className="mono text-text">{s ? s.safe.usdc.toFixed(2) : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted">WETH</span><span className="mono text-text">{s ? s.safe.weth.toFixed(6) : "—"}</span>
              </div>
              {s && <div className="pt-1"><AddressPill address={s.contracts.Safe} explorer={s.explorer} /></div>}
            </div>
          </div>
          <div className="panel rise p-5">
            <SectionTitle>Confidential metering</SectionTitle>
            <p className="text-[12px] text-muted">x402 payment amounts are metered <span className="text-text">encrypted</span> on-chain — decryptable only by the API owner.</p>
            {s && <div className="mt-3"><EncryptedBlock handle={s.contracts.PaymentMeter} label="grand total · USDC" viewer="API owner" rows={1} /></div>}
          </div>
        </div>
      </section>

      {/* Event bus flow */}
      <section className="mt-4 panel rise p-5">
        <SectionTitle right={<Chip>ACL-gated handles</Chip>}>Confidential event bus</SectionTitle>
        <EventFlow active={!!lastAction} />
      </section>

      {/* Execution history */}
      <section className="mt-4 panel rise p-5">
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
                <tr key={i} className="border-b border-line/50">
                  <td className="py-2.5 pr-4"><span className="mono text-muted">#{a.decisionId}</span></td>
                  <td className="py-2.5 pr-4"><span className="font-medium" style={{ color: ACTION_COLOR[a.action] }}>{a.action}</span></td>
                  <td className="py-2.5 pr-4 text-muted">{a.executed ? a.direction : "—"}</td>
                  <td className="py-2.5 pr-4">{a.swapTx ? <AddressPill address={a.swapTx} explorer={s!.explorer} kind="tx" /> : <span className="text-faint">—</span>}</td>
                  <td className="py-2.5 text-faint">{new Date(a.ts).toLocaleTimeString()}</td>
                </tr>
              ))}
              {s && s.activity.length === 0 && <tr><td colSpan={5} className="py-4 text-[13px] text-faint">No executions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer contracts */}
      <footer className="mt-6 flex flex-wrap items-center gap-2 pb-10 rise">
        {s && Object.entries(s.contracts).map(([k, v]) => (
          <span key={k} className="chip">{k} <AddressPill address={v} explorer={s.explorer} /></span>
        ))}
      </footer>
    </main>
  );
}

function ExposureBar({ bps }: { bps: number }) {
  const pct = Math.min(100, bps / 100);
  const over = bps > 5000;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11.5px]">
        <span className="text-muted">Risk-asset exposure</span>
        <span className="mono" style={{ color: over ? "#fb7185" : "#34d399" }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: over ? "linear-gradient(90deg,#fb7185,#f43f5e)" : "linear-gradient(90deg,#5b8cff,#34d399)" }} />
      </div>
      <div className="mt-1 text-[10.5px] text-faint">hedge threshold 50% · {over ? "would HEDGE" : "within policy"}</div>
    </div>
  );
}
