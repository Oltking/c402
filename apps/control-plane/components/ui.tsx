"use client";
import React from "react";

export function Pulse({ color = "#34d399" }: { color?: string }) {
  return <span className="pulse" style={{ background: color, color }} />;
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`mono ${className}`}>{children}</span>;
}

export function short(addr = "", head = 6, tail = 4) {
  if (!addr) return "";
  return addr.length > head + tail ? `${addr.slice(0, head)}…${addr.slice(-tail)}` : addr;
}

export function AddressPill({ address, explorer, kind = "address" }: { address: string; explorer: string; kind?: "address" | "tx" }) {
  return (
    <a href={`${explorer}/${kind}/${address}`} target="_blank" rel="noreferrer"
      className="mono inline-flex items-center gap-1 rounded-md border border-line-2 bg-panel-2/60 px-2 py-0.5 text-[11.5px] text-muted transition-colors hover:border-accent/50 hover:text-accent">
      {short(address)}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="opacity-60"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </a>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold tracking-tight text-text">{children}</h2>
      {right}
    </div>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheck({ className = "" }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The premium confidential-memory component: styled ciphertext with shimmer, a lock,
 *  and a TEE attestation badge. Deliberately shows values as encrypted. */
export function EncryptedBlock({ handle, label = "encrypted", viewer, rows = 2 }: { handle: string; label?: string; viewer?: string; rows?: number }) {
  const glyphs = (handle || "0x").replace(/^0x/, "");
  const filler = (glyphs + glyphs + glyphs).slice(0, 132);
  const lines = Array.from({ length: rows }, (_, i) => filler.slice(i * 44, i * 44 + 44));
  return (
    <div className="scanline relative overflow-hidden rounded-lg border border-line-2 bg-[#0a0c11] p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-accent/80">
          <LockIcon /> {label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald/25 bg-emerald/5 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald/90">
          <ShieldCheck /> TEE attested
        </span>
      </div>
      <div className="cipher text-[11px]">{lines.map((l, i) => <div key={i}>{l || "· ".repeat(20)}</div>)}</div>
      {viewer && <div className="mt-1.5 text-[10px] text-faint">decryptable by <span className="text-muted">{viewer}</span></div>}
    </div>
  );
}
