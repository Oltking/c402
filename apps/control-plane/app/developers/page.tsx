import Link from "next/link";
import { Shell, Footer } from "@/components/Shell";

export const metadata = { title: "c402 · Developers" };

export default function DevelopersPage() {
  return (
    <div>
      <Shell />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <div className="label">Developers</div>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-text md:text-[40px]">Calling & verifying c402</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          The honest, practical answers to the questions people actually ask - no accounts, no API keys,
          bring your own wallet.
        </p>

        {/* Quickstart */}
        <div className="panel mt-8 overflow-hidden p-0">
          <div className="border-b border-line-soft bg-panel-2 px-4 py-2 font-mono text-[11.5px] text-muted">terminal · @c402/cli</div>
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.7] text-text">{`# 1. look at an endpoint - no wallet needed
c402 inspect https://server.example/decide

# 2. pay it with YOUR wallet, get the attested result
c402 call https://server.example/decide \\
  --key $C402_KEY --rpc $SEPOLIA_RPC_URL \\
  --body '{"exposure":6000,"signal":50}'

# 3. anyone can re-verify a decision on-chain, from just its id
c402 verify --id 12 --registry 0xRegistry --cde 0xCDE`}</pre>
        </div>

        {/* Q&A */}
        <Faq n="01" q="What do you actually see when you “verify”? Isn’t this private?">
          <p>Verification proves a confidential decision <b>happened and matches its commitment</b>. It does
          <b> not</b> reveal the private result. The decision action stays encrypted and ACL-gated - only the
          authorized runtime can decrypt it. A third party verifying sees integrity and provenance, never content:</p>
          <ul className="mt-3 space-y-1.5">
            <Li>the decision exists in the on-chain registry (<code>registry-has-decision</code>)</Li>
            <Li>its commitment matches the attestation (<code>commitment-matches</code>)</Li>
            <Li>it was produced by the expected compute contract (<code>contract-matches</code>)</Li>
            <Li>the compute transaction was mined (<code>compute-tx-mined</code>)</Li>
          </ul>
          <p className="mt-3">That’s the whole design: <b>confidentiality of values, public verifiability of the fact.</b></p>
        </Faq>

        <Faq n="02" q="Do I need a JSON file to verify? Or can I verify from an id / hash?">
          <p>The JSON file is just a convenience container. The <b>source of truth is the on-chain commitment
          record</b>, addressable by <code>(registry, decisionId)</code> - so you can verify from <b>just a decision
          id</b>. Two equivalent ways:</p>
          <CodeMini>{`# from an id (reads the commitment from chain for you)
c402 verify --id 12 --registry 0xRegistry --cde 0xCDE

# from an attestation file (as returned by \`c402 call --json\`)
c402 verify attestation.json`}</CodeMini>
          <p className="mt-3">The website does the id form too: <Link href="/verify" className="text-accent hover:underline">/verify</Link> →
          enter an id, or open <code>/verify/&lt;id&gt;?app=treasury</code>. The commitment hash itself lives on-chain in the
          registry; you never have to hold a file.</p>
        </Faq>

        <Faq n="03" q="Is --key / C402_KEY an API key? Where do I get it?">
          <p><b>No.</b> c402 inherits x402’s model: <b>no accounts, no API keys, no signup.</b> <code>C402_KEY</code> is
          simply <b>your wallet’s private key</b> - the wallet that signs the payment. We do not issue keys, and the
          site will never hand one out. You bring your own wallet.</p>
          <ul className="mt-3 space-y-1.5">
            <Li>Pass it with <code>--key</code>, or set <code>C402_KEY</code> / <code>SEPOLIA_PRIVATE_KEY</code>.</Li>
            <Li>The wallet needs the <b>settlement token</b> (e.g. Sepolia USDC) - <b>not gas</b>. Payment is an EIP-3009
            signed authorization; the facilitator relays it and pays gas.</Li>
            <Li amber>Use a <b>dedicated, funded test wallet</b> - never your main key in a shell env.</Li>
          </ul>
          <p className="mt-3">In the browser, a wallet extension (MetaMask) would sign instead of a raw key - that path
          isn’t wired yet; the CLI/agent path uses a key, which is the right shape for scripts.</p>
        </Faq>

        <Faq n="04" q="In c402 call …/decide, is /decide special? Do I have to create it?">
          <p><b>No - <code>/decide</code> is not a c402 convention.</b> It’s just whatever path the <i>server author</i>
          chose when mounting the middleware. It could be <code>/score</code>, <code>/v1/anything</code>. c402 doesn’t
          follow a fixed path - the client discovers everything (price, token, schema) from the <b>headers</b> the URL
          returns, not from the URL itself.</p>
          <CodeMini>{`// the SERVER author picks the path:
app.post("/decide", c402({ /* … */ }));   // ← or "/score", "/v1/predict", anything

// the CALLER just uses whatever URL the server published:
c402 call https://server.example/decide --body '…'`}</CodeMini>
          <p className="mt-3">If a URL returns a <code>402</code> with a <code>Compute-Required</code> header, it’s a
          c402 endpoint - regardless of its path. Check with <code>c402 inspect &lt;url&gt;</code>.</p>
        </Faq>

        <Faq n="05" q="What does the request body look like? How do I know the fields?">
          <p>The body is <b>defined by the server’s computation</b>, not by the protocol. c402 standardizes the
          <i> envelope and headers</i>; each app decides its own input fields. The <code>Compute-Required</code> header
          tells you the <i>type</i> and <i>encoding</i>; the server’s own docs tell you the exact JSON fields.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BodyCard app="Treasury CDE" schema="euint256 · plaintext" body={`{ "exposure": 6000,\n  "signal": 50 }`} />
            <BodyCard app="Payroll" schema="euint256 · plaintext" body={`{ "budget": 100000,\n  "requested": 5000 }`} />
          </div>
          <p className="mt-3">Same protocol, different fields - because they’re different computations. Run
          <code> c402 inspect</code> to see the declared schema, then send the app’s documented JSON.</p>
        </Faq>

        {/* envelope */}
        <h2 className="mt-14 text-[20px] font-semibold tracking-tight text-text">What comes back</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">Every c402 response is the same envelope, whatever the app:</p>
        <CodeMini>{`{
  "result":      { /* the app's output */ },
  "attestation": { standard, network, contract, decisionId, commitment, tx, … }
}
// + the X-Attestation header. @c402/client also returns \`verified\` (on-chain re-check).`}</CodeMini>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
          <Link href="/inspect" className="border border-line bg-text px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-85">Try the inspector →</Link>
          <Link href="/protocol" className="border border-line bg-panel px-5 py-2.5 text-[13px] font-medium text-text hover:bg-panel-2">Read the spec</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Faq({ n, q, children }: { n: string; q: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-7">
      <div className="flex gap-4">
        <span className="tnum shrink-0 font-mono text-[13px] font-semibold text-accent">{n}</span>
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-text">{q}</h2>
          <div className="mt-3 space-y-1 text-[13.5px] leading-relaxed text-muted [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-text">{children}</div>
        </div>
      </div>
    </section>
  );
}
function Li({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return <li className={`flex gap-2 ${amber ? "text-amber" : ""}`}><span className={`mt-1.5 h-1 w-1 shrink-0 ${amber ? "bg-amber" : "bg-accent"}`} /><span>{children}</span></li>;
}
function CodeMini({ children }: { children: string }) {
  return <pre className="mt-3 overflow-x-auto border border-line-soft bg-panel-2 p-3 font-mono text-[12px] leading-[1.6] text-text">{children}</pre>;
}
function BodyCard({ app, schema, body }: { app: string; schema: string; body: string }) {
  return (
    <div className="border border-line-soft bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-text">{app}</span>
        <span className="font-mono text-[10.5px] text-faint">{schema}</span>
      </div>
      <pre className="mt-2 overflow-x-auto font-mono text-[12px] text-muted">{body}</pre>
    </div>
  );
}
