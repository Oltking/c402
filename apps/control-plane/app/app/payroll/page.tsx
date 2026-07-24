"use client";
import { useEffect, useState } from "react";
import { Shell, Footer } from "@/components/Shell";
import { Pulse, Chip, AddressPill, SectionTitle, EncryptedBlock } from "@/components/ui";

type Decision = { id: string; commitment: string; caller: string; block: string; timestamp: string; actionHandle: string; confidenceHandle: string };
type State = {
  network: string; explorer: string; contracts: Record<string, string>;
  decisionCount: string; decisions: Decision[]; updatedAt: number;
};

export default function PayrollDashboard() {
  const [s, setS] = useState<State | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/payroll").then((r) => r.json()).then((d) => { if (!live) return; if (d.error) setErr(d.error); else { setS(d); setErr(null); } }).catch((e) => live && setErr(String(e)));
    load();
    const t = setInterval(load, 12000);
    return () => { live = false; clearInterval(t); };
  }, []);

  return (
    <div>
      <Shell wide />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-semibold tracking-tight text-text">Confidential Payroll</h1>
              <Chip>app on c402</Chip>
            </div>
            <p className="mt-1 text-[12.5px] text-faint">Raise decisions against an encrypted budget + policy cap - the numbers are never revealed.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/apps" className="btn !py-1 !text-[12px]">All apps</a>
            <Chip><Pulse color="#1d4ed8" /> {s?.network ?? "Ethereum Sepolia"}</Chip>
          </div>
        </div>

        {err && <div className="panel mt-6 border-rose p-4 text-[13px] text-rose">Error: {err}</div>}

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Confidential decisions" value={s?.decisionCount ?? "-"} sub="recorded on-chain" />
          <Tile label="Input schema" value="euint256" sub="encrypted budget + raise" mono />
          <Tile label="Output" value="payroll-action" sub="APPROVE / DEFER / REJECT" mono />
          <Tile label="TEE" value="Nox · TDX" sub="attested" />
        </section>

        <section className="panel rise mt-3 p-5">
          <SectionTitle right={<Chip>reasoning 🔒 · commitment public</Chip>}>Decision history</SectionTitle>
          <div className="space-y-2.5">
            {(s?.decisions ?? []).map((d) => (
              <div key={d.id} className="border border-line-soft bg-panel-2 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="mono border border-line-soft bg-panel px-1.5 py-0.5 text-[11px] text-muted">#{d.id}</span>
                    <span className="text-[11.5px] text-faint">block {d.block}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s && <AddressPill address={d.commitment} explorer={s.explorer} kind="tx" />}
                    <a href={`/verify/${d.id}?app=payroll`} className="btn !py-1 !text-[12px]">verify</a>
                  </div>
                </div>
                <div className="mt-3"><EncryptedBlock handle={d.actionHandle} label="raise decision · encrypted" viewer="payroll runtime" rows={2} /></div>
              </div>
            ))}
            {s && s.decisions.length === 0 && <div className="text-[13px] text-faint">No decisions yet - run the payroll example.</div>}
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap items-center gap-2 pb-10">
          {s && Object.entries(s.contracts).map(([k, v]) => (
            <span key={k} className="chip">{k} <AddressPill address={v} explorer={s.explorer} /></span>
          ))}
        </footer>
      </main>
      <Footer />
    </div>
  );
}

function Tile({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="panel panel-hover rise p-4">
      <div className="label">{label}</div>
      <div className={`mt-2 text-[22px] font-semibold leading-none tracking-tight text-text ${mono ? "font-mono !text-[17px]" : "tnum"}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-faint">{sub}</div>}
    </div>
  );
}
