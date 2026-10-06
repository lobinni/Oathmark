"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircle, Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { shortAddress } from "@/lib/contract/digest";
import { STUDIONET } from "@/lib/genlayer/network";

const LINKS = [
  { href: "/", label: "Ledger" },
  { href: "/compose", label: "New Pledge" },
  { href: "/desk", label: "Desk" },
  { href: "/method", label: "Method" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { provider, account, connected, correctNetwork, connect, switchToStudionet } = useWallet();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="o-header">
      <div className="o-shell">
        <nav className="o-nav" aria-label="Primary navigation">
          <Link className="o-brand" href="/" aria-label="Oathmark home">
            <span className="o-brand-mark" aria-hidden="true" />
            <strong>Oathmark</strong>
            <span>Promise Ledger</span>
          </Link>

          <div className="o-nav-links">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : ""} aria-current={isActive(link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="o-account-wrap">
            {connected && account && correctNetwork ? (
              <button className="o-account" type="button" title="Connected to GenLayer Studionet">
                <i className="o-account-dot" aria-hidden="true" />
                <span>
                  <strong>{shortAddress(account)}</strong>
                  <small>{STUDIONET.name}</small>
                </span>
              </button>
            ) : connected && account && !correctNetwork ? (
              <button className="o-account" type="button" onClick={() => void switchToStudionet()} title="Switch to Studionet (chain 61999)">
                <i className="o-account-dot is-off" aria-hidden="true" />
                <span>
                  <strong>Wrong network</strong>
                  <small>Switch to chain 61999</small>
                </span>
              </button>
            ) : (
              <button className="o-account" type="button" onClick={() => void connect()} disabled={provider === null && typeof window !== "undefined"}>
                {provider === null && typeof window !== "undefined" ? (
                  <LoaderCircle size={16} aria-hidden="true" />
                ) : (
                  <Wallet size={16} aria-hidden="true" />
                )}
                <span>
                  <strong>Connect wallet</strong>
                  <small>MetaMask · Chain 61999</small>
                </span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
