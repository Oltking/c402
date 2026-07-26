"use client";
import { useState } from "react";
import { Shell, Footer } from "@/components/Shell";
import { Pulse, Chip } from "@/components/ui";

type ComputeRequired = { version: string; tee: string; network: string; contract: string; input: { schema: string; encoding: string }; output: { schema: string }; description?: string };
type PaymentRequired = { accepts?: { network?: string; amount?: string; asset?: string; payTo?: string; scheme?: string }[] };
type Decoded = { url: string; status: number; isC402: boolean; is402: boolean; computeRequired: ComputeRequired | null; paymentRequired: PaymentRequired | null; canPay: boolean; error?: string };
type Paid = { ok: boolean; status: number; result: unknown; attestation: { standard: string; network: string; contract: string; tx?: string; decisionId?: string; commitment?: string } | null; verified: { valid: boolean; checks: { name: string; ok: boolean }[] } | null; error?: string };

// Public server URLs if configured (a hosted deploy can point these at real endpoints);
// otherwise the local demo servers.
const CDE_URL = process.env.NEXT_PUBLIC_CDE_URL || "http://localhost:4021/v1/decide";
const PAYROLL_URL = process.env.NEXT_PUBLIC_PAYROLL_URL || "http://localhost:4026/decide";
const PRESETS = [
  { label: "Treasury CDE", url: CDE_URL, body: '{ "exposure": 6000, "signal": 50 }' },
  { label: "Payroll", url: PAYROLL_URL, body: '{ "budget": 100000, "requested": 5000 }' },
];

export default function InspectPage() {
  const [url, setUrl] = useState(PRESETS[0].url);
  const [bodyText, setBodyText] = useState(PRESETS[0].body);
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [paid, setPaid] = useState<Paid | null>(null);
  const [busy, setBusy] = useState<"decode" | "pay" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Served from a non-localhost host but the target is a localhost URL → the demo servers
  // aren't reachable from here. Show a friendly explainer instead of a raw fetch error.
  const hostedButLocalUrl =
    typeof window !== "undefined" &&
    !/^(localhost|127\.0\.0\.1)/.test(window.location.hostname) &&
    /localhost|127\.0\.0\.1/.test(url);

  async function decode() {
    setBusy("decode"); setErr(null); setDecoded(null); setPaid(null);
    try {
      const r = await fetch("/api/inspect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const d = (await r.json()) as Decoded;
      if (d.error) setErr(d.error); else setDecoded(d);
    } catch (e) { setErr(String(e)); } finally { setBusy(null); }
  }

  async function pay() {
    setBusy("pay"); setErr(null); setPaid(null);
    let body: unknown = {};
    try { body = bodyText.trim() ? JSON.parse(bodyText) : {}; } catch { setErr("request body is not valid JSON"); setBusy(null); return; }
    try {
      const r = await fetch("/api/inspect/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, body }) });
      const d = (await r.json()) as Paid;
      if (d.error) setErr(d.error); else setPaid(d);
    } catch (e) { setErr(String(e)); } finally { setBusy(null); }
  }

  return (
    <div>
      <Shell />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <div className="label">Inspector</div>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight text-text md:text-[38px]">Feel the protocol</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          Paste any c402 endpoint. We decode its 402 handshake - the <span className="font-mono text-accent-2">Compute-Required</span> and
          <span className="font-mono text-accent"> PAYMENT-REQUIRED</span> headers - then pay it and verify the returned attestation on-chain.
        </p>

        {/* URL bar */}
        <div className="panel mt-7 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="http://…/decide"
              className="mono flex-1 border border-line-soft bg-panel-2 px-3 py-2 text-[13px] text-text outline-none focus:border-accent" />
            <button onClick={decode} disabled={busy !== null}
              className="border border-line bg-text px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40">
              {busy === "decode" ? "Decoding…" : "Decode 402"}
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-faint">presets:</span>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => { setUrl(p.url); setBodyText(p.body); setDecoded(null); setPaid(null); setErr(null); }}
                className="chip hover:border-accent hover:text-accent">{p.label}</button>
            ))}
          </div>
        </div>

        {/* On a hosted deploy the demo servers (localhost) aren't reachable - walk the user
            through running one themselves instead of erroring. */}
        {hostedButLocalUrl && !decoded && (
          <div className="panel mt-4 p-5 leading-relaxed">
            <div className="text-[13.5px] font-semibold text-text">Run a c402 server, then decode it here</div>
            <p className="mt-1.5 text-[12.5px] text-muted">
              A c402 server does real confidential compute - it talks to the TEE and signs on-chain, so it runs on
              your machine, not on this hosted page. The <span className="font-mono">localhost</span> presets point at that
              server. Start one in ~2 minutes:
            </p>

            <ol className="mt-4 space-y-3">
              <RunStep n={1} title="Clone and install">
                <Cmd>git clone https://github.com/Oltking/c402.git && cd c402 && pnpm install</Cmd>
              </RunStep>
              <RunStep n={2} title="Add your Sepolia RPC + a test wallet key to .env">
                <Cmd>cp .env.example .env   # then set SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY</Cmd>
                <p className="mt-1.5 text-[11.5px] text-faint">Use a throwaway wallet holding a little Sepolia USDC. Never a real key.</p>
              </RunStep>
              <RunStep n={3} title="Start the treasury c402 server">
                <Cmd>pnpm --filter @c402/cde-api start   # serves http://localhost:4021/v1/decide</Cmd>
                <p className="mt-1.5 text-[11.5px] text-faint">For payroll instead: <span className="font-mono">pnpm --filter @c402/payroll start</span> (port 4026).</p>
              </RunStep>
              <RunStep n={4} title="Decode it - here, or from your terminal">
                <p className="mb-1.5 text-[12px] text-muted">
                  Open this page locally at <span className="font-mono">localhost:3000/inspect</span> and hit
                  <span className="font-medium text-text"> Decode 402</span> - or use the CLI, no browser needed:
                </p>
                <Cmd>pnpm exec c402 inspect http://localhost:4021/v1/decide</Cmd>
                <Cmd>pnpm exec c402 call http://localhost:4021/v1/decide --body {"'{ \"exposure\": 6000, \"signal\": 50 }'"}</Cmd>
              </RunStep>
            </ol>

            <p className="mt-4 border-t border-line-soft pt-3 text-[12px] text-muted">
              Already have a public c402 endpoint? Paste it above and it&apos;ll decode right here. Meanwhile everything
              already on-chain is live: the{" "}
              <a href="/app" className="text-accent hover:underline">treasury</a> and{" "}
              <a href="/app/payroll" className="text-accent hover:underline">payroll</a> dashboards, or{" "}
              <a href="/verify" className="text-accent hover:underline">verify a past decision</a>. Full guide in the{" "}
              <a href="/docs" className="text-accent hover:underline">docs</a>.
            </p>
          </div>
        )}

        {err && !hostedButLocalUrl && <div className="panel mt-4 border-rose p-3.5 text-[12.5px] text-rose">{err}</div>}

        {/* Decoded headers */}
        {decoded && (
          <section className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              {decoded.isC402
                ? <span className="inline-flex items-center gap-1.5 font-medium text-emerald"><Pulse /> valid c402 endpoint · HTTP {decoded.status}</span>
                : <span className="inline-flex items-center gap-1.5 font-medium text-amber">not a c402 endpoint (no Compute-Required) · HTTP {decoded.status}</span>}
            </div>

            {decoded.computeRequired && (
              <div className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-accent-2">Compute-Required</span>
                  <Chip>{decoded.computeRequired.version}</Chip>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
                  <Field k="TEE" v={decoded.computeRequired.tee} />
                  <Field k="network" v={decoded.computeRequired.network} />
                  <Field k="input" v={`${decoded.computeRequired.input.schema} · ${decoded.computeRequired.input.encoding}`} />
                  <Field k="output" v={decoded.computeRequired.output.schema} />
                  <Field k="contract" v={short(decoded.computeRequired.contract)} mono link={`https://sepolia.etherscan.io/address/${decoded.computeRequired.contract}`} />
                </div>
                {decoded.computeRequired.description && <p className="mt-3 border-t border-line-soft pt-3 text-[12.5px] text-muted">{decoded.computeRequired.description}</p>}
              </div>
            )}

            {decoded.paymentRequired?.accepts?.[0] && (
              <div className="panel p-4">
                <div className="mb-3 font-mono text-[12px] font-semibold text-accent">PAYMENT-REQUIRED</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
                  <Field k="scheme" v={decoded.paymentRequired.accepts[0].scheme ?? "exact"} />
                  <Field k="network" v={decoded.paymentRequired.accepts[0].network ?? "-"} />
                  <Field k="amount (atomic)" v={decoded.paymentRequired.accepts[0].amount ?? "-"} />
                  <Field k="asset" v={short(decoded.paymentRequired.accepts[0].asset ?? "")} mono />
                  <Field k="payTo" v={short(decoded.paymentRequired.accepts[0].payTo ?? "")} mono />
                </div>
              </div>
            )}

            {/* Pay */}
            <div className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">request body</span>
                <span className="text-[11px] text-faint">{decoded.canPay ? "paid by the demo agent wallet" : "paid runs disabled on this deployment"}</span>
              </div>
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={2}
                className="mono w-full border border-line-soft bg-panel-2 px-3 py-2 text-[12.5px] text-text outline-none focus:border-accent" />
              <button onClick={pay} disabled={!decoded.canPay || busy !== null}
                className="mt-2.5 border border-line bg-text px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40">
                {busy === "pay" ? "Paying + computing in TEE…" : "Pay & run →"}
              </button>
              {busy === "pay" && <span className="ml-3 text-[11.5px] text-faint">this is a real on-chain decision - ~10–40s</span>}
            </div>
          </section>
        )}

        {/* Paid result + attestation */}
        {paid && (
          <section className="mt-4 space-y-3">
            <div className="panel p-4">
              <div className="mb-2 label">result</div>
              <pre className="overflow-x-auto border border-line-soft bg-panel-2 p-3 font-mono text-[12px] text-text">{JSON.stringify(paid.result, null, 2)}</pre>
            </div>
            {paid.attestation && (
              <div className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-accent">X-Attestation</span>
                  <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold ${paid.verified?.valid ? "border-emerald/30 bg-emerald/5 text-emerald" : "border-amber/40 bg-amber/5 text-amber"}`}>
                    <Pulse color={paid.verified?.valid ? "#15803d" : "#b45309"} /> {paid.verified?.valid ? "verified on-chain" : "unverified"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
                  <Field k="standard" v={paid.attestation.standard} />
                  <Field k="decisionId" v={paid.attestation.decisionId ?? "-"} />
                  {paid.attestation.tx && <Field k="tx" v={short(paid.attestation.tx)} mono link={`https://sepolia.etherscan.io/tx/${paid.attestation.tx}`} />}
                </div>
                {paid.verified && (
                  <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-line-soft pt-3 sm:grid-cols-2">
                    {paid.verified.checks.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-[12px]">
                        <span className={`grid h-4 w-4 place-items-center border text-[10px] ${c.ok ? "border-emerald bg-emerald/10 text-emerald" : "border-rose bg-rose/10 text-rose"}`}>{c.ok ? "✓" : "×"}</span>
                        <span className="mono text-muted">{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ k, v, mono, link }: { k: string; v: string; mono?: boolean; link?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-faint">{k}</div>
      {link
        ? <a href={link} target="_blank" rel="noreferrer" className={`text-text hover:text-accent ${mono ? "font-mono" : ""}`}>{v}</a>
        : <div className={`text-text ${mono ? "font-mono" : ""}`}>{v}</div>}
    </div>
  );
}
function short(a = "") { return a.length > 12 ? `${a.slice(0, 7)}…${a.slice(-4)}` : a; }

function RunStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center border border-line bg-panel-2 text-[12px] font-semibold text-muted">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-text">{title}</div>
        <div className="mt-1.5 space-y-1.5">{children}</div>
      </div>
    </li>
  );
}
function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto border border-line-soft bg-panel-2 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-text">{children}</pre>
  );
}
