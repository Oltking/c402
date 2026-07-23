import Link from "next/link";
import { LiveStats } from "@/components/LiveStats";

function Logo() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3.2v5.3c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6.2L12 3z" stroke="#1d4ed8" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2.2 2.2L15.5 10" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center border border-line bg-panel"><Logo /></div>
          <span className="text-[15px] font-semibold tracking-tight text-text">xCAT</span>
        </div>
        <nav className="hidden items-center gap-7 text-[13px] text-muted md:flex">
          <a href="#product" className="hover:text-text">Product</a>
          <a href="#how" className="hover:text-text">How it works</a>
          <a href="#protocols" className="hover:text-text">Integrations</a>
          <a href="#architecture" className="hover:text-text">Architecture</a>
        </nav>
        <Link href="/app" className="border border-line bg-text px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85">Launch app →</Link>
      </div>
    </header>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-2 border border-line-soft bg-panel-2 px-2.5 py-1 text-[11px] font-medium text-muted"><span className="pulse" style={{ background: "#15803d", color: "#15803d" }} /> {children}</div>;
}

export default function Landing() {
  return (
    <div>
      <Nav />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="rise">
            <Eyebrow>Live on Ethereum Sepolia · no mock data</Eyebrow>
            <h1 className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-tight text-text md:text-[52px]">
              Treasury intelligence<br />that stays <span className="text-accent">private.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              xCAT is a confidential autonomous treasury for Safe. Its agents buy their intelligence through
              privacy-wrapped x402 payments, decide inside an iExec Nox TEE, and execute through unmodified
              Safe and Uniswap — so amounts, policy and reasoning stay encrypted while every action remains
              auditable on-chain.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/app" className="border border-line bg-text px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-85">Open the control plane →</Link>
              <a href="#how" className="border border-line bg-panel px-5 py-2.5 text-[14px] font-medium text-text transition-colors hover:bg-panel-2">See how it works</a>
            </div>
            <div className="mt-6 text-[12px] text-faint">Confidentiality of values — not anonymity of addresses.</div>
          </div>

          {/* Hero visual: encrypted decision card */}
          <div className="rise">
            <div className="panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="label">Confidential Decision Engine</span>
                <span className="inline-flex items-center gap-1 border border-emerald/30 bg-emerald/5 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald">TEE attested</span>
              </div>
              <div className="scanline relative overflow-hidden border border-line-soft bg-panel-2 p-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">🔒 decision · reasoning</div>
                <div className="cipher text-[11px]">
                  <div>0000aa36a72301ce2ebe150cb369a539913ff3636d80</div>
                  <div>fa4fcb2f7575190ed6ee0000aa36a72301ce2ebe150c</div>
                  <div>7d3e3d5aa27e3ed04d2a0000aa36a72301119986020c</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["x402", "paid"], ["Nox", "decided"], ["Safe", "executed"]].map(([a, b]) => (
                  <div key={a} className="border border-line-soft bg-panel p-2.5">
                    <div className="text-[13px] font-semibold text-text">{a}</div>
                    <div className="text-[10.5px] text-faint">{b}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-[11.5px]">
                <span className="text-muted">confidence</span><span className="tnum font-semibold text-emerald">60% · public</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-16"><LiveStats /></div>
      </section>

      {/* Product / problem */}
      <section id="product" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">The problem</div>
          <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight tracking-tight text-text md:text-[32px]">
            On-chain treasuries are transparent by default. That leaks your strategy to everyone.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Every balance, rebalance and payment is public. xCAT keeps the <span className="text-text">values</span> —
            policy thresholds, exposure, decision reasoning and payment amounts — encrypted inside a trusted
            execution environment, while the fact that an attested decision occurred stays verifiable on-chain.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">How it works</div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-text md:text-[32px]">One confidential loop</h2>
          <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-panel p-6">
                <div className="tnum text-[13px] font-semibold text-accent">0{i + 1}</div>
                <div className="mt-2 text-[15px] font-semibold text-text">{s.title}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Protocols */}
      <section id="protocols" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">Integrations</div>
          <h2 className="mt-3 max-w-2xl text-[26px] font-semibold tracking-tight text-text md:text-[32px]">Privacy added to open protocols — without modifying them</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PROTOCOLS.map((p) => (
              <div key={p.name} className="panel panel-hover p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[16px] font-semibold text-text">{p.name}</div>
                  <span className="chip">unmodified</span>
                </div>
                <div className="mt-3 text-[13px] leading-relaxed text-muted">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture / features */}
      <section id="architecture" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">Architecture</div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-text md:text-[32px]">Built as a reusable primitive</h2>
          <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-panel p-6">
                <div className="text-[14px] font-semibold text-text">{f.title}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-line bg-panel-2">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight text-text">See the live workspace</h2>
            <p className="mt-2 text-[14px] text-muted">Real decisions, encrypted memory and Safe executions — streaming from Ethereum Sepolia.</p>
          </div>
          <Link href="/app" className="border border-line bg-text px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-85">Launch control plane →</Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[12px] text-faint md:flex-row">
        <div className="flex items-center gap-2"><div className="grid h-6 w-6 place-items-center border border-line-soft"><Logo /></div> xCAT · Confidential Autonomous Treasury</div>
        <div>Built on iExec Nox · x402 · Safe · Uniswap — Ethereum Sepolia</div>
      </footer>
    </div>
  );
}

const STEPS = [
  { title: "Observe", body: "The Market Agent reads real market state — the live Uniswap pool price and the Safe's portfolio exposure." },
  { title: "Pay", body: "It buys a decision from the CDE API over x402, settling in USDC through a self-hosted facilitator." },
  { title: "Decide", body: "The Confidential Decision Engine evaluates an encrypted policy inside the Nox TEE — branchless, so nothing leaks." },
  { title: "Publish", body: "The decision is published as an encrypted event on-chain, decryptable only by the Treasury Agent." },
  { title: "Execute", body: "The Treasury Agent decrypts the action and executes a swap from the Safe through the Uniswap router." },
  { title: "Verify", body: "A public commitment is recorded in the DecisionRegistry — anyone can verify a decision happened, without seeing it." },
];

const PROTOCOLS = [
  { name: "x402", body: "Agents pay per confidential decision over the open HTTP 402 protocol. We self-host a facilitator and wrap settlement with Nox metering, so amounts stay encrypted." },
  { name: "Safe", body: "The treasury lives in a standard Safe. Our adapter proposes and executes batched approve + swap transactions from the Safe itself." },
  { name: "Uniswap", body: "Rebalancing swaps route through the standard v3 SwapRouter, with output landing back in the Safe. No forks, no custom pools." },
];

const FEATURES = [
  { title: "Confidential Decision Engine (CDE)", body: "A reusable pay-per-confidential-decision primitive: encrypted inputs in, an attested decision out, selective decryption via on-chain ACLs." },
  { title: "Confidential x402 metering", body: "Per-caller usage and amounts are metered encrypted on-chain — decryptable only by the API owner, invisible to the public." },
  { title: "Encrypted event bus", body: "On-chain pub/sub where payloads are ACL-gated handles; only authorized subscribers can decrypt an event's contents." },
  { title: "Verifiable, not exposed", body: "Every decision leaves a public commitment. You get auditability and privacy at the same time — confidentiality of values, not anonymity." },
];
