import Link from "next/link";
import { Shell, Footer } from "@/components/Shell";
import { LiveStats } from "@/components/LiveStats";
import { HeroHandshake } from "@/components/HeroHandshake";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-2 border border-line-soft bg-panel-2 px-2.5 py-1 text-[11px] font-medium text-muted"><span className="pulse" style={{ background: "#15803d", color: "#15803d" }} /> {children}</div>;
}

export default function Landing() {
  return (
    <div>
      <Shell />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="rise">
            <Eyebrow>Open protocol · live on Ethereum Sepolia · no mock data</Eyebrow>
            <h1 className="mt-5 text-[38px] font-semibold leading-[1.04] tracking-tight text-text md:text-[54px]">
              Pay for a<br /><span className="text-accent">private thought.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              x402 made any resource payable by any agent. <span className="font-mono text-text">c402</span> makes any
              computation <span className="text-text">confidential and payable</span> - same pattern, one level deeper.
              A c402 server declares a TEE-attested confidential endpoint; any client pays and consumes it, knowing
              nothing about the implementation. Two headers on top of x402.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/inspect" className="border border-line bg-text px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-85">Inspect a live endpoint →</Link>
              <Link href="/protocol" className="border border-line bg-panel px-5 py-2.5 text-[14px] font-medium text-text transition-colors hover:bg-panel-2">Read the protocol</Link>
            </div>
            <div className="mt-6 text-[12px] text-faint">Confidentiality of values - not anonymity of addresses.</div>
          </div>

          {/* Hero visual: the two headers, rendered from the real latest decision */}
          <div className="rise">
            <HeroHandshake />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-16"><LiveStats /></div>
      </section>

      {/* Developer proof - two code panels */}
      <section id="develop" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">For developers</div>
          <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight tracking-tight text-text md:text-[32px]">
            A confidential, paid endpoint in one function. Consume it like a normal fetch.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CodePanel title="server · @c402/server" lines={SERVER_CODE} />
            <CodePanel title="client · @c402/client" lines={CLIENT_CODE} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PACKAGES.map((p) => (
              <span key={p} className="chip font-mono">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">How it works</div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-text md:text-[32px]">402 → pay → compute → attest → verify</h2>
          <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-panel p-5">
                <div className="tnum text-[13px] font-semibold text-accent">0{i + 1}</div>
                <div className="mt-2 text-[14px] font-semibold text-text">{s.title}</div>
                <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps on c402 */}
      <section id="apps" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">Apps on c402</div>
          <h2 className="mt-3 max-w-2xl text-[26px] font-semibold tracking-tight text-text md:text-[32px]">The protocol is the product. These are the proof.</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {APPS.map((a) => (
              <Link key={a.name} href={a.href} className="panel panel-hover group p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[16px] font-semibold text-text">{a.name}</div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald"><span className="pulse" style={{ background: "#15803d", color: "#15803d" }} /> live on Sepolia</span>
                </div>
                <div className="mt-3 text-[13px] leading-relaxed text-muted">{a.body}</div>
                <div className="mt-4 text-[12.5px] font-medium text-accent">Open dashboard →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Composes with */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="label">Composes with</div>
          <h2 className="mt-3 max-w-2xl text-[26px] font-semibold tracking-tight text-text md:text-[32px]">Privacy added to open protocols - without modifying them</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PROTOCOLS.map((p) => (
              <div key={p.name} className="panel panel-hover p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-text">{p.name}</div>
                  <span className="chip">unmodified</span>
                </div>
                <div className="mt-3 text-[12.5px] leading-relaxed text-muted">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-line bg-panel-2">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight text-text">Feel the protocol in 15 seconds</h2>
            <p className="mt-2 text-[14px] text-muted">Paste a c402 endpoint, decode its headers, pay, and verify the attestation on-chain.</p>
          </div>
          <Link href="/inspect" className="border border-line bg-text px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-85">Open the inspector →</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CodePanel({ title, lines }: { title: string; lines: { t: string; c?: string }[] }) {
  return (
    <div className="panel overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line-soft bg-panel-2 px-4 py-2">
        <span className="font-mono text-[11.5px] text-muted">{title}</span>
        <span className="flex gap-1"><Dot /><Dot /><Dot /></span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.7]">
        {lines.map((l, i) => (
          <div key={i} className={l.c ?? "text-text"}>{l.t || " "}</div>
        ))}
      </pre>
    </div>
  );
}
function Dot() { return <span className="h-2 w-2 rounded-full border border-line-soft" />; }

const SERVER_CODE = [
  { t: 'app.post("/decide", c402({', c: "text-text" },
  { t: '  price: "0.01", token: USDC, network: "eip155:11155111",', c: "text-muted" },
  { t: "  facilitator: FACILITATOR, contract: CDE, payTo: PAY_TO,", c: "text-muted" },
  { t: '  schema: { input: "euint256", output: "treasury-action" },', c: "text-muted" },
  { t: "  compute: async (input) => {", c: "text-accent-2" },
  { t: "    // runs inside the iExec Nox TEE", c: "text-faint" },
  { t: "    return await decideConfidentially(input);", c: "text-muted" },
  { t: "  },", c: "text-accent-2" },
  { t: "}));", c: "text-text" },
];
const CLIENT_CODE = [
  { t: "const call = c402Fetch({", c: "text-text" },
  { t: '  signer, network: "eip155:11155111", rpcUrl,', c: "text-muted" },
  { t: "});", c: "text-text" },
  { t: "", c: "text-text" },
  { t: 'const res = await call("http://cde/decide", {', c: "text-text" },
  { t: "  body: { exposure, signal },", c: "text-muted" },
  { t: "});", c: "text-text" },
  { t: "", c: "text-text" },
  { t: "res.result;  res.attestation;  res.verified.valid;", c: "text-emerald" },
];
const PACKAGES = ["@c402/spec", "@c402/server", "@c402/client", "@c402/verify"];

const STEPS = [
  { title: "402", body: "An unpaid request returns 402 with PAYMENT-REQUIRED and Compute-Required - price, token, TEE, input/output schema." },
  { title: "Pay", body: "The client pays via standard x402 (EIP-3009 USDC), settled by a facilitator. c402 doesn't touch settlement." },
  { title: "Compute", body: "The server runs the computation inside the iExec Nox TEE. Inputs, state and reasoning stay encrypted." },
  { title: "Attest", body: "The 200 carries X-Attestation - real on-chain artifacts (commitment, tx, handles), not a trust-us blob." },
  { title: "Verify", body: "Anyone re-reads the commitment on-chain via @c402/verify. No server cooperation required." },
];
const APPS = [
  { name: "Confidential Treasury (xCAT)", href: "/apps", body: "An autonomous treasury for Safe. Agents buy confidential decisions over c402, then execute swaps through unmodified Safe + Uniswap. The first app on the protocol." },
  { name: "Confidential Payroll", href: "/apps", body: "Approve / defer / reject raise decisions against an encrypted budget and policy cap - without revealing the numbers. A second, different computation on the same protocol." },
];
const PROTOCOLS = [
  { name: "x402", body: "The open HTTP 402 payment protocol. c402 adds two headers on top; the payment and settlement legs are pure x402." },
  { name: "iExec Nox", body: "Intel TDX TEEs with on-chain handles + ACLs. The confidential compute and the attestations are Nox." },
  { name: "Safe", body: "The treasury app custodies funds in a standard Safe; the agent proposes and executes from the Safe itself." },
  { name: "Uniswap", body: "Rebalancing swaps route through the standard v3 router - no forks, output lands back in the Safe." },
];
