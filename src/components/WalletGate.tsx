"use client";

import type { ReactNode } from "react";
import { Unplug, ArrowLeftRight } from "lucide-react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { STUDIONET_CHAIN_ID } from "@/lib/genlayer/network";

type WalletGateProps = {
  children?: ReactNode;
  title?: string;
  message?: string;
};

/**
 * Gates write flows behind a connected MetaMask on chain 61999.
 */
export function WalletGate({
  children,
  title = "Connect to continue",
  message = "This action writes to the ledger. Connect MetaMask on GenLayer Studionet (chain 61999) so the transaction is signed by you.",
}: WalletGateProps) {
  const { account, connected, correctNetwork, error, connect, switchToStudionet } = useWallet();

  if (connected && account && correctNetwork) return <>{children}</>;

  return (
    <div className="o-gate">
      <span className="o-gate-icon">
        {connected ? <ArrowLeftRight size={26} aria-hidden="true" /> : <Unplug size={26} aria-hidden="true" />}
      </span>
      <h3>{connected && !correctNetwork ? "Switch to Studionet" : title}</h3>
      <p>
        {connected && !correctNetwork
          ? `Your wallet is on a different network. Oathmark only operates on ${"GenLayer Studionet"} (chain ${STUDIONET_CHAIN_ID}).`
          : message}
      </p>
      {error ? <div className="o-error-box" style={{ maxWidth: 440, margin: "0 auto 18px", textAlign: "left" }}>{error}</div> : null}
      {connected && !correctNetwork ? (
        <button className="o-btn o-btn--accent" type="button" onClick={() => void switchToStudionet()}>
          Switch to chain {STUDIONET_CHAIN_ID}
        </button>
      ) : (
        <button className="o-btn o-btn--accent" type="button" onClick={() => void connect()}>
          Connect MetaMask
        </button>
      )}
    </div>
  );
}
