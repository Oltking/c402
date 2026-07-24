"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell, Footer } from "@/components/Shell";

export default function VerifyIndex() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [app, setApp] = useState("treasury");

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (id.trim()) router.push(`/verify/${id.trim()}?app=${app}`);
  }

  return (
    <div>
      <Shell />
      <main className="mx-auto max-w-2xl px-5 py-16">
        <div className="label">Trustless verification</div>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight text-text md:text-[38px]">Verify any c402 decision</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Every confidential decision leaves a public commitment in its app&rsquo;s registry. Enter a decision id and
          we re-read the commitment straight from Ethereum Sepolia - no server cooperation, no trust required.
        </p>

        <form onSubmit={go} className="panel mt-7 p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {[["treasury", "Confidential Treasury"], ["payroll", "Confidential Payroll"]].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setApp(k)}
                className={`border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${app === k ? "border-line bg-text text-white" : "border-line-soft bg-panel-2 text-muted hover:text-text"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={id} onChange={(e) => setId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="decision id, e.g. 7"
              className="mono flex-1 border border-line-soft bg-panel-2 px-3 py-2 text-[13px] text-text outline-none focus:border-accent" inputMode="numeric" />
            <button type="submit" disabled={!id.trim()}
              className="border border-line bg-text px-5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40">
              Verify on-chain →
            </button>
          </div>
        </form>

        <div className="mt-6 text-[12.5px] text-faint">
          Prefer the full experience? The <a href="/app" className="text-accent hover:underline">treasury dashboard</a> and
          the <a href="/inspect" className="text-accent hover:underline">inspector</a> verify attestations live.
        </div>
      </main>
      <Footer />
    </div>
  );
}
