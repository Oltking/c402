import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "xCAT · Confidential Autonomous Treasury",
  description: "A confidential autonomous treasury for Safe — iExec Nox + x402 + Uniswap on Ethereum Sepolia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-bg">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
