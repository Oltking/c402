import Link from "next/link";
import { Shell, Footer } from "@/components/Shell";

export const metadata = { title: "c402 · Protocol" };

export default function ProtocolPage() {
  return (
    <div>
      <Shell />
      <main className="mx-auto max-w-4xl px-5 py-14">
        <div className="label">Specification · c402/1</div>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-text md:text-[40px]">The c402 protocol</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          c402 is a confidential compute layer that sits on top of x402 the same way x402 sits on top of HTTP.
          It adds exactly <span className="text-text">two headers</span>. Everything else - what the computation is,
          what the inputs and outputs mean - is defined by the server.
        </p>

        {/* layer stack */}
        <div className="mt-8 overflow-hidden border border-line">
          {LAYERS.map((l, i) => (
            <div key={l.name} className={`flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between ${i > 0 ? "border-t border-line" : ""} ${l.accent ? "bg-panel-2" : "bg-panel"}`}>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-[13px] font-semibold ${l.accent ? "text-accent" : "text-text"}`}>{l.name}</span>
                <span className="text-[13px] text-muted">{l.q}</span>
              </div>
              <span className="font-mono text-[11.5px] text-faint">{l.mech}</span>
            </div>
          ))}
        </div>

        {/* two headers */}
        <h2 className="mt-14 text-[22px] font-semibold tracking-tight text-text">Two headers</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <HeaderCard name="Compute-Required" when="on the 402" body="Describes the confidential computation: the TEE standard, the on-chain compute contract, the input schema/encoding, and the output schema. The client reads it to know what to encrypt and what to expect." tone="accent-2" />
          <HeaderCard name="X-Attestation" when="on the paid 200" body="Proves the TEE executed. Every field is a real, independently re-verifiable on-chain artifact - decisionId, commitment, registry, tx, output handles. No fabricated quotes." tone="accent" />
        </div>

        {/* packages */}
        <h2 className="mt-14 text-[22px] font-semibold tracking-tight text-text">Reference packages</h2>
        <div className="mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
          {PKGS.map((p) => (
            <div key={p.name} className="bg-panel p-5">
              <div className="font-mono text-[13px] font-semibold text-text">{p.name}</div>
              <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{p.body}</div>
            </div>
          ))}
        </div>

        {/* verification */}
        <h2 className="mt-14 text-[22px] font-semibold tracking-tight text-text">Trustless verification</h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
          The attestation is not a trust-us blob: it points at an on-chain commitment. A verifier re-reads that
          commitment from the registry on the declared network and confirms it matches, with no cooperation from
          the server. Try it on a real decision:
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/verify" className="border border-line bg-text px-5 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85">Verify a decision →</Link>
          <Link href="/inspect" className="border border-line bg-panel px-5 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-panel-2">Inspect a live endpoint</Link>
        </div>

        <div className="mt-14 border-t border-line pt-6 text-[12px] text-faint">
          Full specification: <span className="font-mono text-muted">packages/c402-spec/SPEC.md</span> · JSON schema:
          <span className="font-mono text-muted"> packages/c402-spec/schema/attestation.schema.json</span>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function HeaderCard({ name, when, body, tone }: { name: string; when: string; body: string; tone: "accent" | "accent-2" }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[13px] font-semibold ${tone === "accent" ? "text-accent" : "text-accent-2"}`}>{name}</span>
        <span className="chip">{when}</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

const LAYERS = [
  { name: "HTTP", q: "give me a resource", mech: "request / response" },
  { name: "x402", q: "pay to access a resource", mech: "402 + PAYMENT-REQUIRED" },
  { name: "c402", q: "pay to access a private thought", mech: "x402 + 2 headers", accent: true },
];
const PKGS = [
  { name: "@c402/spec", body: "The protocol in code: constants, types, header codecs, SPEC.md, JSON schema." },
  { name: "@c402/server", body: "c402(config) Express middleware - declare a confidential paid endpoint in one call." },
  { name: "@c402/client", body: "c402Fetch(opts) - pay, consume, and verify an attestation as one fetch." },
  { name: "@c402/verify", body: "Standalone on-chain attestation verifier anyone can run." },
];
