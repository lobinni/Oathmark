"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoaderCircle, PenLine } from "lucide-react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { isContractConfigured } from "@/lib/contract/address";
import { listCreatorPledgeIds, readPledge } from "@/lib/contract/adapter";
import type { PledgeRecord } from "@/lib/contract/types";
import { WalletGate } from "@/components/WalletGate";
import { RecordCard } from "@/components/RecordCard";
import { ConfigBanner } from "@/components/ConfigBanner";

export function DeskClient() {
  const { account, connected, correctNetwork } = useWallet();
  const [records, setRecords] = useState<PledgeRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!account || !isContractConfigured()) return;
    setError(null);
    try {
      const ids = await listCreatorPledgeIds(account.toLowerCase(), 0, 100);
      const loaded = await Promise.all(ids.map((id) => readPledge(id)));
      loaded.sort((a, b) => Number(b.id) - Number(a.id));
      setRecords(loaded);
    } catch (cause) {
      setError((cause as Error)?.message ?? "Your desk could not be loaded.");
    }
  }, [account]);

  useEffect(() => {
    if (connected && correctNetwork) void load();
  }, [connected, correctNetwork, load]);

  const stats = useMemo(() => {
    const list = records ?? [];
    return {
      total: list.length,
      drafts: list.filter((record) => record.lifecycle === "DRAFT").length,
      active: list.filter((record) => record.lifecycle === "ACTIVE").length,
      closed: list.filter((record) => record.lifecycle === "CANCELLED" || record.lifecycle === "ARCHIVED").length,
    };
  }, [records]);

  if (!isContractConfigured()) return <ConfigBanner />;

  return (
    <WalletGate
      title="Connect to open your desk"
      message="The desk lists every pledge you created. Connect MetaMask on GenLayer Studionet (chain 61999) to load it from the contract."
    >
      {error ? (
        <div className="o-list-state">
          <span>{error}</span>
          <button className="o-btn o-btn--ghost" type="button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : records === null ? (
        <div className="o-list-state">
          <LoaderCircle size={30} className="o-spin" style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
          Reading your pledges…
        </div>
      ) : (
        <div className="o-detail-stack">
          <div className="o-panel">
            <div className="o-state-grid">
              <div className="o-state-cell">
                <small>Total pledges</small>
                <strong>{stats.total}</strong>
              </div>
              <div className="o-state-cell">
                <small>Drafts</small>
                <strong>{stats.drafts}</strong>
              </div>
              <div className="o-state-cell">
                <small>Active</small>
                <strong>{stats.active}</strong>
              </div>
              <div className="o-state-cell">
                <small>Closed</small>
                <strong>{stats.closed}</strong>
              </div>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="o-list-state">
              Nothing on your desk yet.
              <Link className="o-btn o-btn--accent" href="/compose" style={{ marginTop: 6 }}>
                <PenLine size={14} aria-hidden="true" /> Record your first pledge
              </Link>
            </div>
          ) : (
            <div className="o-card-grid">
              {records.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </div>
      )}
    </WalletGate>
  );
}
