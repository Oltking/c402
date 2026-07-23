"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createWalletClient, custom, getAddress, type Address, type WalletClient } from "viem";
import { sepolia } from "viem/chains";

interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...a: unknown[]) => void) => void;
}
declare global {
  interface Window { ethereum?: Eip1193 }
}

interface WalletState {
  address: Address | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  hasProvider: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  client: WalletClient | null;
}

const Ctx = createContext<WalletState | null>(null);
const SEPOLIA_HEX = "0xaa36a7";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    const eth = window.ethereum;
    setHasProvider(!!eth);
    if (!eth) return;
    // Re-hydrate an already-authorized connection without prompting.
    eth.request({ method: "eth_accounts" }).then((accts) => {
      const a = (accts as string[])[0];
      if (a) setAddress(getAddress(a));
    });
    eth.request({ method: "eth_chainId" }).then((c) => setChainId(Number(c as string)));

    const onAccounts = (...a: unknown[]) => {
      const list = a[0] as string[];
      setAddress(list?.[0] ? getAddress(list[0]) : null);
    };
    const onChain = (...a: unknown[]) => setChainId(Number(a[0] as string));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) { setError("No wallet found. Install MetaMask or a compatible wallet."); return; }
    setConnecting(true); setError(null);
    try {
      const accts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (accts[0]) setAddress(getAddress(accts[0]));
      const c = await eth.request({ method: "eth_chainId" });
      setChainId(Number(c as string));
    } catch (e) {
      setError(e instanceof Error ? e.message : "connection rejected");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => { setAddress(null); }, []);

  const switchToSepolia = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_HEX }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not switch network");
    }
  }, []);

  const client = useMemo<WalletClient | null>(() => {
    if (!address || typeof window === "undefined" || !window.ethereum) return null;
    return createWalletClient({ account: address, chain: sepolia, transport: custom(window.ethereum) });
  }, [address]);

  const value: WalletState = {
    address, chainId, connecting, error, hasProvider,
    connect, disconnect, switchToSepolia, client,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}

export const isSepolia = (chainId: number | null) => chainId === 11155111;
