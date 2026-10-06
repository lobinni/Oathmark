import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Syne, DM_Mono } from "next/font/google";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import { TransactionProvider } from "@/lib/contract/TransactionProvider";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { TransactionRibbon } from "@/components/TransactionRibbon";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oathmark — Consensus-Enforced Promise Ledger",
  description:
    "Oathmark turns promises published on official domains into enforceable on-chain rights, verified by GenLayer validator consensus on Studionet.",
};

export const viewport: Viewport = {
  themeColor: "#f3f5f0",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${syne.variable} ${dmMono.variable}`}>
      <body>
        <WalletProvider>
          <TransactionProvider>
            <AppHeader />
            <main>{children}</main>
            <AppFooter />
            <TransactionRibbon />
          </TransactionProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
