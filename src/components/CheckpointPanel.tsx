"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCcw, ArrowLeft, Hourglass } from "lucide-react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTransaction } from "@/lib/contract/TransactionProvider";
import { isContractConfigured } from "@/lib/contract/address";
import { readPledge, readCheckpoints, submitCheckpoint } from "@/lib/contract/adapter";
import type { Checkpoint, PledgeRecord } from "@/lib/contract/types";
import { formatInterval, formatTimestamp, shortAddress } from "@/lib/contract/digest";
import { StatusSeal } from "@/components/StatusSeal";
import { WalletGate } from "@/components/WalletGate";
import { ConfigBanner } from "@/components/ConfigBanner";

export function CheckpointPanel({ id }: { id: string }) {
  const { provider, account, connected, correctNetwork } = useWallet();
  const { run, busy } = useTransaction();
  const [pledge, setPledge] = useState<PledgeRecord | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const refresh = useCallback(async () => {
    if (!isContractConfigured()) return;
    try {
      const [record, history] = await Promise.all([readPledge(id), readCheckpoints(id)]);
      setPledge(record);
      setCheckpoints(history);
      setError(null);
    } catch (cause) {
      setError((cause as Error)?.message ?? "This record could not be loaded.");
    }
  }, [id]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (!isContractConfigured()) return <ConfigBanner />;

  if (error) {
    return (
      <div className="o-list-state">
        <span>{error}</span>
        <button className="o-btn o-btn--ghost" type="button" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  if (!pledge) {
    return (
      <div className="o-list-state">
        <LoaderCircle size={30} className="o-spin" style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
        Reconstructing pledge #{id}…
      </div>
    );
  }

  const base = Math.max(pledge.activated_at, pledge.last_checkpoint_at);
  const nextEligibleAt = base + pledge.review_interval_seconds;
  const eligible = pledge.lifecycle === "ACTIVE" && now >= nextEligibleAt;
  const waitSeconds = Math.max(0, nextEligibleAt - now);

  return (
    <div className="o-detail-stack">
      <Link href={`/record/${id}`} className="o-link-quiet o-mono" style={{ fontSize: 10, textTransform: "uppercase" }}>
        <ArrowLeft size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} aria-hidden="true" />
        Back to pledge #{id}
      </Link>

      <div className="o-detail">
        <section className="o-panel">
          <div className="o-panel-body" style={{ padding: "28px 30px" }}>
            <div className="o-kicker">Consensus checkpoint</div>
            <h1 className="o-display" style={{ fontSize: "clamp(28px, 4vw, 46px)", marginTop: 14 }}>
              {pledge.subject}
            </h1>
            <p style={{ color: "var(--o-muted)", lineHeight: 1.75, fontSize: 14, margin: "18px 0 0", maxWidth: 560 }}>
              Every validator independently re-fetches the frozen sources on
              <strong> {pledge.canonical_domain}</strong>, judges each reliance clause against the baseline, and votes.
              The consensus verdict — stable, narrowed, broken, unavailable, or inconclusive — immediately gates the
              beneficiary&apos;s right. You only trigger the round; you never judge.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <StatusSeal status={pledge.lifecycle} />
              <StatusSeal status={pledge.assessment} />
            </div>
          </div>
        </section>

        <aside className="o-detail-stack">
          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Eligibility</h3>
              <Hourglass size={15} style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
            </div>
            <div className="o-panel-body">
              <dl className="o-rows">
                <div className="o-row">
                  <dt>Last checkpoint</dt>
                  <dd>{pledge.last_checkpoint_at ? formatTimestamp(pledge.last_checkpoint_at) : "never"}</dd>
                </div>
                <div className="o-row">
                  <dt>Interval</dt>
                  <dd>{formatInterval(pledge.review_interval_seconds)}</dd>
                </div>
                <div className="o-row">
                  <dt>Next window</dt>
                  <dd>{eligible ? "open now" : `opens in ${formatInterval(Math.max(60, waitSeconds))}`}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Trigger round</h3>
            </div>
            <div className="o-panel-body">
              {pledge.lifecycle !== "ACTIVE" ? (
                <p className="o-hint">Only active pledges accept checkpoints. This record is {pledge.lifecycle.toLowerCase()}.</p>
              ) : !connected || !correctNetwork ? (
                <WalletGate
                  title="Connect to trigger"
                  message="Triggering a checkpoint is a write. Connect MetaMask on Studionet (chain 61999); any account may trigger."
                />
              ) : (
                <>
                  <button
                    className="o-btn o-btn--accent"
                    type="button"
                    style={{ width: "100%" }}
                    disabled={busy || !eligible || !provider || !account}
                    onClick={() =>
                      void run({
                        label: `Checkpoint pledge #${id}`,
                        submit: () => submitCheckpoint(account!, provider!, id),
                        authoritativeReread: async () => {
                          const fresh = await readPledge(id);
                          const ok = fresh.checkpoint_count > pledge.checkpoint_count;
                          setPledge(fresh);
                          setCheckpoints(await readCheckpoints(id));
                          return ok;
                        },
                      })
                    }
                  >
                    <RefreshCcw size={14} aria-hidden="true" />
                    {eligible ? "Run checkpoint" : "Window not open yet"}
                  </button>
                  <p className="o-hint" style={{ marginTop: 14, textAlign: "center" }}>
                    The requester is recorded on chain with the verdict.
                  </p>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="o-panel">
        <div className="o-panel-head">
          <h3>All checkpoints</h3>
          <span className="o-mono" style={{ fontSize: 9, color: "var(--o-muted)" }}>
            {checkpoints.length} recorded
          </span>
        </div>
        <div className="o-panel-body">
          {checkpoints.length === 0 ? (
            <p className="o-hint">No consensus round has run for this pledge yet.</p>
          ) : (
            <div className="o-timeline">
              {[...checkpoints].reverse().map((checkpoint, index) => (
                <div className="o-timeline-item" key={index}>
                  <span className="o-mono">
                    {formatTimestamp(checkpoint.at)} · triggered by {shortAddress(checkpoint.requester)}
                  </span>
                  <div style={{ display: "flex", gap: 8, margin: "10px 0 6px", flexWrap: "wrap" }}>
                    <StatusSeal status={checkpoint.outcome} />
                    {checkpoint.clauses.map((clause) => (
                      <StatusSeal key={clause.index} status={clause.verdict} />
                    ))}
                  </div>
                  <p>{checkpoint.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
