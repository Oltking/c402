"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

/** c402 wordmark — a bracketed lock glyph + monospace wordmark. */
export function C402Mark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M8 4H4v16h4M16 4h4v16h-4" stroke="#0a0b0d" strokeWidth="1.7" strokeLinecap="square" />
        <rect x="9.5" y="11" width="5" height="5" stroke="#1d4ed8" strokeWidth="1.6" />
        <path d="M10.5 11v-1.5a1.5 1.5 0 013 0V11" stroke="#1d4ed8" strokeWidth="1.6" />
      </svg>
      <span className="font-mono text-[15px] font-semibold tracking-tight text-text">c402</span>
    </span>
  );
}

const NAV = [
  { href: "/protocol", label: "Protocol" },
  { href: "/apps", label: "Apps" },
  { href: "/inspect", label: "Inspect" },
  { href: "/verify", label: "Verify" },
];

export function Shell({ children, wide = false }: { children?: React.ReactNode; wide?: boolean }) {
  const path = usePathname();
  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur">
        <div className={`mx-auto flex items-center justify-between px-5 py-3 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
          <div className="flex items-center gap-7">
            <Link href="/" className="shrink-0"><C402Mark /></Link>
            <nav className="hidden items-center gap-6 text-[13px] text-muted md:flex">
              {NAV.map((n) => {
                const active = path === n.href || (n.href !== "/" && path.startsWith(n.href));
                return (
                  <Link key={n.href} href={n.href} className={active ? "text-text" : "hover:text-text"}>
                    {n.label}
                  </Link>
                );
              })}
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-text">GitHub ↗</a>
            </nav>
          </div>
          <WalletButton />
        </div>
      </header>
      {children}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[12px] text-faint md:flex-row">
        <div className="flex items-center gap-2"><C402Mark size={18} /> · Confidential compute over x402</div>
        <div>Composes x402 · iExec Nox · Safe · Uniswap — unmodified, on Ethereum Sepolia</div>
      </div>
    </footer>
  );
}
