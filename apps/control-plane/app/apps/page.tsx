import Link from "next/link";
import { Shell, Footer } from "@/components/Shell";

export const metadata = { title: "c402 · Apps" };

const APPS = [
  {
    name: "Confidential Treasury",
    tag: "xCAT · first app",
    href: "/app",
    body: "An autonomous treasury for Safe. A Market Agent buys a confidential decision over c402; a Treasury Agent decrypts it and executes a swap through unmodified Safe + Uniswap. Amounts, policy and reasoning stay encrypted; every decision leaves a public commitment.",
    contract: "0xfff6e422de60d58573da667a45a66f17b705a237",
    label: "CDE",
    output: "treasury-action (HOLD / HEDGE / ACCUMULATE)",
  },
  {
    name: "Confidential Payroll",
    tag: "second app",
    href: "/app/payroll",
    body: "Approve / defer / reject a raise against an encrypted remaining budget and an encrypted policy cap - the manager, the server host and the chain never see the numbers. A genuinely different computation on the exact same protocol surface.",
    contract: "0x2040ed303ea352fa0bc3fc288b348264d315b1be",
    label: "PayrollCDE",
    output: "payroll-action (APPROVE / DEFER / REJECT)",
  },
];

export default function AppsPage() {
  return (
    <div>
      <Shell />
      <main className="mx-auto max-w-5xl px-5 py-14">
        <div className="label">Apps on c402</div>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-text md:text-[40px]">Built on the protocol</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          Each app is a c402 server (a confidential endpoint) and its clients. Same two headers, same attestation
          and verification - entirely different computations. All live on Ethereum Sepolia, no mock data.
        </p>

        <div className="mt-9 grid grid-cols-1 gap-4">
          {APPS.map((a) => (
            <div key={a.name} className="panel p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[18px] font-semibold tracking-tight text-text">{a.name}</h2>
                    <span className="chip">{a.tag}</span>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{a.body}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px]">
                    <span className="text-faint">output <span className="font-mono text-muted">{a.output}</span></span>
                    <a href={`https://sepolia.etherscan.io/address/${a.contract}`} target="_blank" rel="noreferrer" className="font-mono text-muted hover:text-accent">{a.label} ↗</a>
                  </div>
                </div>
                <Link href={a.href} className="shrink-0 border border-line bg-text px-5 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85">Open dashboard →</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 panel p-6">
          <div className="text-[15px] font-semibold text-text">Build your own</div>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
            A c402 app is a server with one <span className="font-mono text-text">c402(&#123;…&#125;)</span> endpoint and clients that
            call it with <span className="font-mono text-text">c402Fetch</span>. See <span className="font-mono text-muted">examples/hello-c402</span> -
            a full server + client - and the <Link href="/protocol" className="text-accent hover:underline">protocol page</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
