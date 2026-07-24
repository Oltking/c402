"use client";
import { useEffect, useState } from "react";

type State = {
  stats: { decisionCount: string; eventCount: string };
  market: { priceUsdcPerWeth: number; exposureBps: string };
};

export function LiveStats() {
  const [s, setS] = useState<State | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/state").then((r) => r.json()).then((d) => live && !d.error && setS(d)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const items = [
    { label: "Confidential decisions", value: s?.stats.decisionCount ?? "—" },
    { label: "Encrypted events", value: s?.stats.eventCount ?? "—" },
    { label: "Apps on c402", value: "2" },
    { label: "TEE standard", value: "Nox · TDX" },
  ];

  return (
    <div className="grid grid-cols-2 border-l border-t border-line md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="border-b border-r border-line bg-panel p-5">
          <div className="label">{it.label}</div>
          <div className="tnum mt-2 text-[24px] font-semibold tracking-tight text-text">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
