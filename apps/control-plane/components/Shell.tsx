"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WalletButton } from "./WalletButton";

/** c402 wordmark - a bracketed lock glyph + monospace wordmark. */
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
  { href: "/docs", label: "Docs" },
  { href: "/protocol", label: "Protocol" },
  { href: "/apps", label: "Apps" },
  { href: "/inspect", label: "Inspect" },
  { href: "/verify", label: "Verify" },
];

export function Shell({ children, wide = false }: { children?: React.ReactNode; wide?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const github = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/Oltking/c402";

  // Close the mobile menu on route change.
  useEffect(() => { setOpen(false); }, [path]);

  const isActive = (href: string) => path === href || (href !== "/" && path.startsWith(href));

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur">
        <div className={`mx-auto flex items-center justify-between px-5 py-3 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
          <div className="flex items-center gap-7">
            <Link href="/" className="shrink-0"><C402Mark /></Link>
            <nav className="hidden items-center gap-6 text-[13px] text-muted md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={isActive(n.href) ? "text-text" : "hover:text-text"}>{n.label}</Link>
              ))}
              <a href={github} target="_blank" rel="noreferrer" className="hover:text-text">GitHub ↗</a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <WalletButton />
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center border border-line-soft bg-panel text-text md:hidden"
            >
              {open ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {open && (
          <nav className="border-t border-line bg-panel md:hidden">
            <div className="mx-auto max-w-6xl px-5 py-2">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href}
                  className={`block border-b border-line-soft py-3 text-[15px] ${isActive(n.href) ? "font-medium text-accent" : "text-text"}`}>
                  {n.label}
                </Link>
              ))}
              <a href={github} target="_blank" rel="noreferrer" className="block py-3 text-[15px] text-text">GitHub ↗</a>
            </div>
          </nav>
        )}
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
        <div>Composes x402 · iExec Nox · Safe · Uniswap - unmodified, on Ethereum Sepolia</div>
      </div>
    </footer>
  );
}
