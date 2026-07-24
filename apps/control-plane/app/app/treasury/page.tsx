"use client";
import { useCallback, useEffect, useState } from "react";
import { Pulse, Chip, AddressPill, SectionTitle, short } from "@/components/ui";
import { WalletButton } from "@/components/WalletButton";
import { useWallet, isSepolia } from "@/lib/wallet";

type SafeInfo = { address: string; owners: string[]; threshold: number; version: string };
type State = {
  network: string; explorer: string;
  market: { priceUsdcPerWeth: number; exposureBps: string };
  safe: { usdc: number; weth: number };
  stats: { decisionCount: string; eventCount: string };
};

export default function TreasuryPage() {
  const { address, chainId } = useWallet();
  const [input, setInput] = useState("");
  const [safe, setSafe] = useState<SafeInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);

  const verify = useCallback(async (addr: string) => {
    setChecking(true); setError(null); setSafe(null); setState(null);
    try {
      const r = await fetch(`/api/safe?address=${addr}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error || "not a Safe"); return; }
      setSafe(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "lookup failed");
    } finally {
      setChecking(false);
    }
  }, []);

  // Live portfolio for the verified Safe.
  useEffect(() => {
    if (!safe) return;
    let live = true;
    const load = () =>
      fetch(`/api/state?safe=${safe.address}`).then((r) => r.json()).then((d) => { if (live && !d.error) setState(d); });
    load();
    const t = setInterval(load, 12000);
    return () => { live = false; clearInterval(t); };
  }, [safe]);

  const isOwner = !!(safe && address && safe.owners.some((o) => o.toLowerCase() === address.toLowerCase()));
  const wrongNet = !!address && !isSepolia(chainId);

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <a href="/app" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center border border-line bg-panel">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3.2v5.3c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6.2L12 3z" stroke="#1d4ed8" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2.2 2.2L15.5 10" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-text">xCAT <span className="font-normal text-faint">· Onboard your treasury</span></div>
              <div className="text-[11px] text-faint">Connect your wallet, bring your own Safe - non-custodial</div>
            </div>
          </a>
          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-text">Bring your own Safe</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            xCAT never holds your keys. Connect your wallet and point it at a Safe you own on Sepolia - the agent
            operates as a Safe signer/module, and every confidential decision it makes is re-verifiable on-chain.
          </p>
        </div>

        {/* Step 1 - wallet */}
        <Step n={1} title="Connect your wallet" done={!!address && !wrongNet}>
          {!address && <p className="text-[13px] text-muted">Use the <span className="font-semibold text-text">Connect wallet</span> button above.</p>}
          {address && wrongNet && <p className="text-[13px] text-amber">You’re connected but on the wrong network - switch to Sepolia above.</p>}
          {address && !wrongNet && (
            <div className="flex items-center gap-2 text-[13px] text-emerald"><Pulse /> Connected as <span className="mono text-text">{short(address)}</span> on Sepolia</div>
          )}
        </Step>

        {/* Step 2 - safe */}
        <Step n={2} title="Point at your Safe" done={!!safe} disabled={!address || wrongNet}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              placeholder="0x… your Safe address on Sepolia"
              className="mono flex-1 border border-line-soft bg-panel-2 px-3 py-2 text-[13px] text-text outline-none focus:border-accent"
            />
            <button
              onClick={() => verify(input)}
              disabled={!input || checking || !address || wrongNet}
              className="border border-line bg-text px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {checking ? "Verifying…" : "Verify Safe"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12.5px] text-rose">{error}</p>}
          <p className="mt-2 text-[11.5px] text-faint">Don’t have one? Create a Safe at <span className="text-muted">app.safe.global</span> on Sepolia, then paste its address.</p>
        </Step>

        {/* Step 3 - verified */}
        {safe && (
          <Step n={3} title="Treasury verified" done>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="border border-line-soft bg-panel-2 p-4">
                <div className="label">Safe</div>
                <div className="mt-2"><AddressPill address={safe.address} explorer={state?.explorer ?? "https://sepolia.etherscan.io"} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
                  <div><span className="text-faint">Threshold</span><div className="mono text-text">{safe.threshold} / {safe.owners.length}</div></div>
                  <div><span className="text-faint">Version</span><div className="mono text-text">{safe.version}</div></div>
                </div>
                <div className="mt-3">
                  {isOwner ? (
                    <span className="inline-flex items-center gap-1.5 border border-emerald/30 bg-emerald/5 px-2 py-1 text-[11.5px] font-semibold text-emerald"><Pulse /> Your wallet is an owner</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 border border-amber/40 bg-amber/5 px-2 py-1 text-[11.5px] font-semibold text-amber">Connected wallet is not an owner of this Safe</span>
                  )}
                </div>
              </div>

              <div className="border border-line-soft bg-panel-2 p-4">
                <div className="label">Live portfolio</div>
                <div className="mt-3 space-y-2 text-[13px]">
                  <div className="flex items-center justify-between"><span className="text-muted">USDC</span><span className="mono tnum text-text">{state ? state.safe.usdc.toFixed(2) : "…"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted">WETH</span><span className="mono tnum text-text">{state ? state.safe.weth.toFixed(6) : "…"}</span></div>
                  <div className="flex items-center justify-between border-t border-line-soft pt-2"><span className="text-muted">Risk exposure</span><span className="mono tnum font-semibold text-text">{state ? `${(Number(state.market.exposureBps) / 100).toFixed(1)}%` : "…"}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-4 border border-line-soft bg-panel p-4">
              <SectionTitle right={<Chip>next</Chip>}>Enroll this Safe</SectionTitle>
              <p className="text-[12.5px] leading-relaxed text-muted">
                To let the treasury agent act, add the xCAT runtime as a Safe module or co-signer (threshold-preserving),
                then set a policy. The agent proposes swaps; your Safe’s threshold still governs execution. The confidential
                decision engine is already a public <span className="text-text">pay-per-decision</span> x402 API - any wallet can call it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="chip opacity-70">Add module <span className="ml-1 text-faint">soon</span></span>
                <span className="chip opacity-70">Set policy <span className="ml-1 text-faint">soon</span></span>
                <a href="/app" className="btn !py-1 !text-[12px]">View live control plane</a>
              </div>
            </div>
          </Step>
        )}

        <p className="mt-8 text-center text-[11.5px] text-faint">
          Non-custodial · reads live from Ethereum Sepolia · <a href="/app" className="text-accent hover:underline">back to control plane</a>
        </p>
      </main>
    </div>
  );
}

function Step({ n, title, children, done, disabled }: { n: number; title: string; children: React.ReactNode; done?: boolean; disabled?: boolean }) {
  return (
    <section className={`panel mb-3 p-5 ${disabled ? "opacity-45" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`grid h-6 w-6 place-items-center border text-[12px] font-semibold ${done ? "border-emerald bg-emerald/10 text-emerald" : "border-line bg-panel-2 text-muted"}`}>{done ? "✓" : n}</span>
        <h2 className="text-[14px] font-semibold tracking-tight text-text">{title}</h2>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}
