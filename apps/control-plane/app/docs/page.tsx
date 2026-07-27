"use client";
import { useEffect, useState } from "react";
import { Shell, Footer } from "@/components/Shell";

/* ------------------------------------------------------------------ nav model */
const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "Getting started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "two-ways", label: "Two ways to use c402" },
      { id: "installation", label: "Installation" },
      { id: "quickstart", label: "Quickstart" },
    ],
  },
  {
    group: "Concepts",
    items: [
      { id: "two-headers", label: "The two headers" },
      { id: "attestation", label: "Attestation & verify" },
      { id: "confidentiality", label: "Confidentiality model" },
      { id: "no-keys", label: "No accounts, no API keys" },
    ],
  },
  {
    group: "Packages",
    items: [
      { id: "server", label: "@c402/server" },
      { id: "client", label: "@c402/client" },
      { id: "verify", label: "@c402/verify" },
      { id: "cli", label: "@c402/cli" },
    ],
  },
  {
    group: "Guides",
    items: [
      { id: "build-server", label: "Build a c402 server" },
      { id: "call-agent", label: "Call it from an agent" },
      { id: "deploy", label: "Self-host & deploy" },
    ],
  },
  {
    group: "Reference",
    items: [
      { id: "ref-compute-required", label: "Compute-Required" },
      { id: "ref-attestation", label: "X-Attestation" },
      { id: "ref-envelope", label: "Response envelope" },
    ],
  },
];
const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id));

/* ------------------------------------------------------------------ page */
export default function DocsPage() {
  const [active, setActive] = useState("introduction");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    ALL_IDS.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div>
      <Shell wide />
      <div className="mx-auto flex max-w-7xl gap-10 px-5">
        {/* Sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 overflow-y-auto border-r border-line py-8 pr-4 md:block">
          <nav className="space-y-6">
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">{g.group}</div>
                <ul className="space-y-0.5">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <a href={`#${it.id}`}
                        className={`block border-l-2 py-1 pl-3 text-[13px] transition-colors ${active === it.id ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-text"}`}>
                        {it.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 py-10">
          <div className="label">Documentation</div>
          <h1 className="mt-2 text-[34px] font-semibold tracking-tight text-text">c402 developer docs</h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted">
            Everything to build, call, and verify confidential compute over x402. No accounts, no API keys -
            bring a wallet.
          </p>

          {/* ---- Getting started ---- */}
          <Section id="introduction" title="Introduction">
            <P><B>c402</B> is a confidential compute layer that sits on top of x402 the same way x402 sits on top of HTTP.
              It lets any server publish a <B>TEE-attested confidential endpoint</B> that any client can pay for and verify -
              adding exactly <B>two HTTP headers</B> on top of x402.</P>
            <Table rows={[["HTTP", "give me a resource", "request / response"], ["x402", "pay to access a resource", "402 + PAYMENT-REQUIRED"], ["c402", "pay to access a private thought", "x402 + 2 headers"]]}
              head={["Layer", "Question", "Mechanism"]} />
            <P>The confidential computation runs inside an <B>iExec Nox</B> (Intel TDX) TEE. Inputs, state, and reasoning stay
              encrypted; the fact that an attested decision happened stays publicly verifiable on-chain.</P>
          </Section>

          <Section id="two-ways" title="Two ways to use c402">
            <P>Before you install anything, figure out which of these you are. They need completely different setup -
              most people start as a <B>consumer</B>.</P>
            <Table
              head={["", "Path 1 - Consume", "Path 2 - Build your own"]}
              rows={[
                ["You want to", "pay a confidential endpoint and get + verify the private result", "run your own confidential service others pay"]  ,
                ["You need", "a wallet + a little Sepolia USDC", "a wallet, a Sepolia RPC, and to deploy your own engine"],
                ["Contracts to deploy", "none - reuse what's already live", "your own CDE + DecisionRegistry"],
                ["Server to run", "none - call a live endpoint", "your c402 server (cde-api-style)"],
              ]}
            />

            <P className="!mt-6"><B>Path 1 - Consume (start here).</B> There are no accounts and no API keys: you authenticate by
              paying. Bring a wallet with a little Sepolia USDC (free from a faucet), point it at a live c402 endpoint, and you get
              the attested result back - re-verifiable against the already-deployed registry. Nothing to deploy.</P>
            <Code>{`# decode the 402 handshake (no wallet needed)
npx @c402/cli inspect <endpoint-url>

# pay with your wallet, get the attested result + on-chain verification
npx @c402/cli call <endpoint-url> --key $C402_KEY --rpc $SEPOLIA_RPC_URL \\
  --body '{"exposure":6000,"signal":50}'`}</Code>
            <Callout>Prefer clicking? The <A href="/inspect">inspector</A> does decode → pay → verify in the browser. If no
              public endpoint is running yet, it walks you through starting one locally.</Callout>

            <P className="!mt-6"><B>Path 2 - Build your own.</B> To become a provider you deploy your <B>own</B> CDE + DecisionRegistry
              (the on-chain decrypt permission is tied to your runtime key, so you can't reuse someone else's), then run your c402
              server pointing at those addresses. One command scaffolds the contracts - see
              {" "}<A href="#deploy">Self-host &amp; deploy</A>.</P>
          </Section>

          <Section id="installation" title="Installation">
            <P>c402 is a pnpm monorepo that runs TypeScript directly on <B>Node 22+</B> (no build step). Install the
              protocol packages you need:</P>
            <Code>{`pnpm add @c402/server   # build a confidential endpoint
pnpm add @c402/client   # call one from an agent
pnpm add @c402/verify   # verify an attestation

# the terminal tool - no install needed
npx @c402/cli --help`}</Code>
            <P>To run the full reference stack (facilitator + treasury/payroll servers + control plane) from a clone,
              follow <A href="https://github.com/Oltking/c402/blob/main/docs/setup-deploy-usage.md">docs/setup-deploy-usage.md</A>.</P>
          </Section>

          <Section id="quickstart" title="Quickstart">
            <P>Call a live c402 endpoint from the terminal in one command (needs a wallet key with a little Sepolia USDC):</P>
            <Code>{`# 1. decode a c402 endpoint's 402 handshake (no wallet needed)
npx @c402/cli inspect http://localhost:4021/v1/decide

# 2. pay it with your wallet, get the attested result + on-chain verification
npx @c402/cli call http://localhost:4021/v1/decide \\
  --key $C402_KEY --rpc $SEPOLIA_RPC_URL \\
  --body '{"exposure":6000,"signal":50}'`}</Code>
            <Callout>Prefer clicking? The <A href="/inspect">inspector</A> does decode → pay → verify in the browser.</Callout>
          </Section>

          {/* ---- Concepts ---- */}
          <Section id="two-headers" title="The two headers">
            <P>c402 is intentionally minimal. On an unpaid request a c402 server returns <B>HTTP 402</B> with both:</P>
            <Ul items={[
              <><Mono>PAYMENT-REQUIRED</Mono> - the standard x402 header (price, token, network).</>,
              <><Mono>Compute-Required</Mono> - the confidential computation: TEE standard, compute contract, input/output schema.</>,
            ]} />
            <P>On a paid request it returns <B>200</B> with the x402 <Mono>PAYMENT-RESPONSE</Mono> and a c402 <Mono>X-Attestation</Mono>.
              Everything else - what the computation means - is up to the server.</P>
          </Section>

          <Section id="attestation" title="Attestation & verification">
            <P>The <Mono>X-Attestation</Mono> is not a trust-us blob. Every field is a real, independently re-verifiable on-chain
              artifact: <Mono>decisionId</Mono>, <Mono>commitment</Mono>, <Mono>registry</Mono>, <Mono>tx</Mono>, output handles.
              A verifier re-reads the commitment from chain and confirms it matches - no cooperation from the server.</P>
            <P>Verification proves a confidential decision <B>happened and matches its commitment</B>. It never reveals the private
              result - that stays ACL-encrypted to the authorized runtime.</P>
          </Section>

          <Section id="confidentiality" title="Confidentiality model">
            <P>Nox provides <B>confidentiality of values, not anonymity of addresses.</B> Calls and addresses stay public; the
              values - inputs, encrypted state, and the decision itself - are encrypted. Never claim anonymity.</P>
          </Section>

          <Section id="no-keys" title="No accounts, no API keys">
            <P>c402 inherits x402's model: <B>no signup, no accounts, no API keys.</B> The caller authenticates by <B>paying</B> -
              signing an EIP-3009 authorization with their wallet. The <Mono>--key</Mono> a client uses is a <B>wallet private key</B>,
              not an issued token. The wallet needs the settlement token (e.g. Sepolia USDC), <B>not gas</B> - the facilitator relays.</P>
            <Callout tone="amber">Use a dedicated, funded test wallet for automation - never a main key in a shell env.</Callout>
          </Section>

          {/* ---- Packages ---- */}
          <Section id="server" title="@c402/server">
            <P>Declare a confidential, pay-per-call endpoint in one function. The middleware handles the 402, both headers,
              payment verification, TEE execution, and the attestation.</P>
            <Code>{`import express from "express";
import { c402 } from "@c402/server";

const app = express();
app.use(express.json());

app.post("/decide", c402({
  price: "0.01",                    // human USDC price
  token: USDC_SEPOLIA,              // EIP-3009 settlement token
  network: "eip155:11155111",       // CAIP-2
  facilitator: FACILITATOR_URL,     // x402 facilitator
  payTo: PAY_TO,
  contract: CDE,                    // on-chain confidential-compute contract
  schema: { input: "euint256", output: "treasury-action" },
  compute: async (input, ctx) => {
    // runs inside the iExec Nox TEE; return the result + on-chain artifacts
    return { result, decisionId, commitment, registry, tx, outputHandles };
  },
}));`}</Code>
          </Section>

          <Section id="client" title="@c402/client">
            <P>Call a c402 endpoint like a normal <Mono>fetch</Mono>. It reads <Mono>Compute-Required</Mono>, pays via x402, reads
              <Mono> X-Attestation</Mono>, and re-verifies on-chain - invisibly.</P>
            <Code>{`import { privateKeyToAccount } from "viem/accounts";
import { c402Fetch } from "@c402/client";

const call = c402Fetch({
  signer: privateKeyToAccount(process.env.C402_KEY),
  network: "eip155:11155111",
  rpcUrl: process.env.SEPOLIA_RPC_URL,
});

const res = await call("https://server/decide", { body: { exposure: 6000, signal: 50 } });
res.result;         // the computation output
res.attestation;    // the TEE proof
res.verified.valid; // re-checked on-chain`}</Code>
          </Section>

          <Section id="verify" title="@c402/verify">
            <P>A standalone verifier anyone can run - re-reads the on-chain commitment and confirms it matches.</P>
            <Code>{`import { verifyAttestation } from "@c402/verify";

const result = await verifyAttestation(attestation, { rpcUrl });
result.valid;   // true / false
result.checks;  // [{ name, ok, detail }] - registry-has-decision, commitment-matches, …`}</Code>
          </Section>

          <Section id="cli" title="@c402/cli">
            <P>The generic terminal tool. Works against any c402 server.</P>
            <Table head={["Command", "What it does"]} rows={[
              ["c402 inspect <url>", "decode the 402 handshake (no wallet)"],
              ["c402 call <url> --body …", "pay with your wallet, print the attested result"],
              ["c402 verify --id <n> --registry <addr>", "re-verify a decision on-chain, from just its id"],
            ]} mono />
          </Section>

          {/* ---- Guides ---- */}
          <Section id="build-server" title="Guide: build a c402 server">
            <P>A c402 app is a normal Express server with one <Mono>c402(&#123;…&#125;)</Mono> endpoint. The path is yours to choose
              (<Mono>/decide</Mono>, <Mono>/score</Mono>, anything) - clients discover price and schema from the headers, not the URL.
              See <A href="https://github.com/Oltking/c402/tree/main/examples/hello-c402">examples/hello-c402</A> for a full server + client.</P>
          </Section>

          <Section id="call-agent" title="Guide: call it from an agent">
            <P>An agent is a c402 client with a funded wallet. The request <B>body is app-defined</B> - the treasury endpoint wants
              <Mono> &#123; exposure, signal &#125;</Mono>, payroll wants <Mono> &#123; budget, requested &#125;</Mono>. Run
              <Mono> c402 inspect</Mono> to see the declared schema, then send the app's documented JSON.</P>
          </Section>

          <Section id="deploy" title="Guide: self-host & deploy">
            <P>The reference stack: a self-hosted <B>x402 facilitator</B> for <Mono>eip155:11155111</Mono>, the c402 servers, and the
              Next.js control plane. The frontend is read-only (no private key) and deploys to Vercel; the servers sign transactions and
              need a funded key that must live on the server host - <B>never on Vercel, never committed</B>.</P>

            <P className="!mt-5"><B>1. Deploy your own confidential engine.</B> One command builds the Nox contracts and deploys your
              own CDE + DecisionRegistry to Sepolia (needs <Mono>SEPOLIA_RPC_URL</Mono> + <Mono>SEPOLIA_PRIVATE_KEY</Mono> in <Mono>.env</Mono>):</P>
            <Code>{`pnpm run deploy:own
# prints the deployed addresses (also written to docs/deployments.sepolia.json).
# copy them into .env:
#   CDE_ADDRESS=0x...
#   DECISION_REGISTRY_ADDRESS=0x...`}</Code>

            <P className="!mt-5"><B>2. Run your c402 server.</B> Point it at your addresses and start the facilitator + server:</P>
            <Code>{`pnpm --filter @c402/facilitator start   # relays payment on-chain (port 4022)
pnpm --filter @c402/cde-api start        # your c402 endpoint (port 4021)`}</Code>

            <P className="!mt-5"><B>3. Host it publicly (optional).</B> To let anyone test your endpoint, deploy the facilitator + server
              as one always-on service. The repo ships a <Mono>render.yaml</Mono> blueprint and a
              {" "}<Mono>scripts/start-public-endpoint.ts</Mono> launcher that runs both in one Render web service, plus public-endpoint
              guardrails (per-IP rate limit, daily cap, and a low-gas graceful 503) so a throwaway wallet stays funded. A GitHub Actions
              keep-alive pings <Mono>/health</Mono> so the free tier doesn't sleep. Set your public URL as
              {" "}<Mono>NEXT_PUBLIC_CDE_URL</Mono> on Vercel and the inspector + CLI will hit it live.</P>

            <Callout tone="amber">The public endpoint holds a <B>throwaway faucet wallet only</B> - a few dollars of Sepolia USDC and a
              little gas. Never put a real key on a public server, and never on Vercel.</Callout>

            <P className="!mt-5">Full walkthroughs: <A href="https://github.com/Oltking/c402/blob/main/docs/setup-deploy-usage.md">setup-deploy-usage.md</A>
              {" "}and <A href="https://github.com/Oltking/c402/blob/main/docs/vercel-deploy.md">vercel-deploy.md</A>.</P>
          </Section>

          {/* ---- Reference ---- */}
          <Section id="ref-compute-required" title="Reference: Compute-Required">
            <P>Base64url JSON on the 402. The client reads this to know what to encrypt and what to expect.</P>
            <Code>{`{
  "version": "c402/1",
  "tee": "iexec-nox/intel-tdx",
  "network": "eip155:11155111",
  "contract": "0x…CDE",
  "input":  { "schema": "euint256", "encoding": "plaintext" },
  "output": { "schema": "treasury-action" },
  "description": "Confidential treasury decision"
}`}</Code>
          </Section>

          <Section id="ref-attestation" title="Reference: X-Attestation">
            <P>Base64url JSON on the paid 200. Every field is a real on-chain artifact.</P>
            <Code>{`{
  "version": "c402/1",
  "standard": "iexec-nox/intel-tdx",
  "network": "eip155:11155111",
  "contract": "0x…CDE",
  "decisionId": "13",
  "commitment": "0x…",
  "registry": "0x…DecisionRegistry",
  "tx": "0x…",
  "outputHandles": { "action": "0x…" },
  "issuedAt": 1750000000000
}`}</Code>
          </Section>

          <Section id="ref-envelope" title="Reference: response envelope">
            <P>Every c402 response body is the same envelope, whatever the app:</P>
            <Code>{`{
  "result":      { /* the app's output */ },
  "attestation": { /* the X-Attestation object */ }
}`}</Code>
            <P className="!mb-0">Full spec: <A href="https://github.com/Oltking/c402/blob/main/packages/c402-spec/SPEC.md">SPEC.md</A> ·
              JSON schema: <Mono>packages/c402-spec/schema/attestation.schema.json</Mono>.</P>
          </Section>
        </main>
      </div>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ primitives */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line py-9 first:border-t-0">
      <h2 className="text-[21px] font-semibold tracking-tight text-text">{title}</h2>
      <div className="mt-4 space-y-3.5">{children}</div>
    </section>
  );
}
function P({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`max-w-2xl text-[14px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-text ${className}`}>{children}</p>;
}
function B({ children }: { children: React.ReactNode }) { return <b>{children}</b>; }
function Mono({ children }: { children: React.ReactNode }) { return <span className="mx-0.5 font-mono text-[12.5px] text-text">{children}</span>; }
function A({ href, children }: { href: string; children: React.ReactNode }) {
  const ext = href.startsWith("http");
  return <a href={href} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})} className="text-accent hover:underline">{children}</a>;
}
function Code({ children }: { children: string }) {
  return (
    <div className="max-w-3xl overflow-hidden border border-line-soft bg-panel-2">
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.65] text-text">{children}</pre>
    </div>
  );
}
function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="max-w-2xl space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-text">
          <span className="mt-2 h-1 w-1 shrink-0 bg-accent" /><span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
function Callout({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "amber" }) {
  const c = tone === "amber" ? "border-amber/40 bg-amber/5 text-amber" : "border-accent/30 bg-accent/5 text-muted";
  return <div className={`max-w-2xl border ${c} px-3.5 py-2.5 text-[13px] leading-relaxed [&_a]:text-accent [&_a]:hover:underline`}>{children}</div>;
}
function Table({ head, rows, mono }: { head: string[]; rows: string[][]; mono?: boolean }) {
  return (
    <div className="max-w-3xl overflow-x-auto border border-line-soft">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-panel-2 text-faint">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line-soft">
              {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 && mono ? "font-mono text-[12px] text-text" : "text-muted"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
