import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        panel: "#ffffff",
        "panel-2": "#f7f8fa",
        "panel-3": "#eef0f3",
        line: "#111318", // strong near-black structural line
        "line-soft": "#e4e6ea", // subtle divider
        muted: "#4b5058",
        faint: "#8b909a",
        text: "#0a0b0d",
        accent: "#1d4ed8",
        "accent-2": "#4338ca",
        emerald: "#15803d",
        amber: "#b45309",
        rose: "#c81e2b",
        cipher: "#aab0bb",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        // Sharp corners across the board; only pills/dots stay round.
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "9999px",
      },
    },
  },
  plugins: [],
} satisfies Config;
