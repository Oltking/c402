import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "c402 · Confidential compute over x402",
  description: "c402 makes any computation confidential and payable by any agent - two headers on top of x402, TEE-attested by iExec Nox on Ethereum Sepolia.",
  icons: { icon: "/icon.svg", apple: "/apple-icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-bg">
        <Providers>
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
