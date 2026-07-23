import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08090c",
        panel: "#0c0e13",
        "panel-2": "#101319",
        line: "#1b1f2a",
        "line-2": "#262b38",
        muted: "#7d8595",
        faint: "#565d6d",
        text: "#e7e9ee",
        accent: "#5b8cff",
        "accent-2": "#7c5cff",
        emerald: "#34d399",
        amber: "#fbbf24",
        rose: "#fb7185",
        cipher: "#3a4b57",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(91,140,255,0.15), 0 8px 40px -12px rgba(91,140,255,0.35)",
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 60px -30px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
} satisfies Config;
