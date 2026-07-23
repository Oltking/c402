"use client";
import { useWallet, isSepolia } from "@/lib/wallet";
import { short } from "./ui";

export function WalletButton() {
  const { address, chainId, connecting, connect, disconnect, switchToSepolia, hasProvider } = useWallet();

  if (!address) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="inline-flex items-center gap-2 border border-line bg-text px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {connecting ? "Connecting…" : hasProvider ? "Connect wallet" : "Get a wallet"}
      </button>
    );
  }

  if (!isSepolia(chainId)) {
    return (
      <button
        onClick={switchToSepolia}
        className="inline-flex items-center gap-2 border border-amber/40 bg-amber/5 px-3 py-1.5 text-[12px] font-semibold text-amber transition-colors hover:bg-amber/10"
      >
        <span className="pulse" style={{ background: "#b45309", color: "#b45309" }} /> Switch to Sepolia
      </button>
    );
  }

  return (
    <button
      onClick={disconnect}
      title="Click to disconnect"
      className="mono inline-flex items-center gap-2 border border-line-soft bg-panel-2 px-3 py-1.5 text-[12px] text-text transition-colors hover:border-rose hover:text-rose"
    >
      <span className="pulse" style={{ background: "#15803d", color: "#15803d" }} /> {short(address)}
    </button>
  );
}
