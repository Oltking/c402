import Link from "next/link";
import { getDecisionRecord } from "@/lib/chain";
import { EncryptedBlock } from "@/components/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let record: Awaited<ReturnType<typeof getDecisionRecord>> = null;
  try {
    record = await getDecisionRecord(BigInt(id));
  } catch {
    record = null;
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/" className="text-[12.5px] text-muted hover:text-accent">← back to control plane</Link>
      <div className="panel rise mt-4 p-7">
        <div className="label">on-chain verification</div>
        <h1 className="mt-1 text-xl font-semibold text-text">Decision #{id}</h1>

        {!record ? (
          <div className="mt-5 rounded-lg border border-rose/30 bg-rose/5 p-4 text-[13px] text-rose">
            No commitment found for decision #{id} in the DecisionRegistry on Sepolia.
          </div>
        ) : (
          <>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/5 px-3 py-1.5 text-[12.5px] font-medium text-emerald">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Commitment verified on-chain
            </div>

            <dl className="mt-6 space-y-3 text-[13px]">
              <Row k="Commitment"><span className="mono break-all text-text">{record.commitment}</span></Row>
              <Row k="Engine (CDE)"><span className="mono text-muted">{record.cde}</span></Row>
              <Row k="Requested by"><span className="mono text-muted">{record.caller}</span></Row>
              <Row k="Block"><span className="mono text-muted">{record.block}</span></Row>
            </dl>

            <div className="mt-6">
              <div className="label mb-2">Confidential action (reasoning)</div>
              <EncryptedBlock handle={record.actionHandle} label="decision · encrypted" viewer="Treasury runtime" rows={2} />
            </div>

            <div className="mt-6 flex gap-2">
              <a className="btn" target="_blank" rel="noreferrer" href={`${record.explorer}/address/${record.registry}`}>Registry on Etherscan ↗</a>
              <a className="btn" target="_blank" rel="noreferrer" href={`${record.explorer}/address/${record.cde}`}>CDE on Etherscan ↗</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line/60 pb-2.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-faint">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}
