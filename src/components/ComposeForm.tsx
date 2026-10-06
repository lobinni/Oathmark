"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Plus, Trash2, ScrollText } from "lucide-react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTransaction } from "@/lib/contract/TransactionProvider";
import {
  isContractConfigured,
} from "@/lib/contract/address";
import {
  listCreatorPledgeIds,
  readNextPledgeId,
  readPledge,
  submitCreateDraft,
  submitUpdateDraft,
} from "@/lib/contract/adapter";
import {
  AUTHORITY_SCHEMA,
  LIMITS,
  authorityUrlFor,
  validatePledgeDraft,
  normalizeDomain,
} from "@/lib/contract/limits";
import { computePolicyDigest, sameAddress, shortHash } from "@/lib/contract/digest";
import { WalletGate } from "@/components/WalletGate";
import { ConfigBanner } from "@/components/ConfigBanner";

const INTERVAL_PRESETS = [
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "30 days", seconds: 2592000 },
];

export function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const { provider, account, connected, correctNetwork } = useWallet();
  const { run, busy } = useTransaction();

  const [subject, setSubject] = useState("");
  const [domain, setDomain] = useState("");
  const [sources, setSources] = useState<string[]>([""]);
  const [clauses, setClauses] = useState<string[]>([""]);
  const [beneficiary, setBeneficiary] = useState("");
  const [rightLabel, setRightLabel] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(86400);
  const [note, setNote] = useState("");
  const [digest, setDigest] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(editId));
  const [draftEditable, setDraftEditable] = useState(false);

  useEffect(() => {
    if (account && !beneficiary) setBeneficiary(account);
  }, [account, beneficiary]);

  /* Prefill when editing an existing draft. */
  useEffect(() => {
    if (!editId || !isContractConfigured()) {
      setLoadingDraft(false);
      return;
    }
    let cancelled = false;
    readPledge(editId)
      .then((pledge) => {
        if (cancelled) return;
        if (pledge.lifecycle !== "DRAFT" || !sameAddress(pledge.creator, account)) {
          setFormError("This record is no longer an editable draft, or belongs to a different creator.");
          return;
        }
        setSubject(pledge.subject);
        setDomain(pledge.canonical_domain);
        setSources(pledge.source_urls.length ? pledge.source_urls : [""]);
        setClauses(pledge.clauses.length ? pledge.clauses : [""]);
        setBeneficiary(pledge.beneficiary);
        setRightLabel(pledge.right_label);
        setIntervalSeconds(pledge.review_interval_seconds);
        setNote(pledge.note);
        setDraftEditable(true);
      })
      .catch(() => {
        if (!cancelled) setFormError("The draft could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, account]);

  const normalized = useMemo(() => {
    try {
      return validatePledgeDraft({
        subject,
        canonicalDomain: domain,
        sourceUrls: sources.filter((url) => url.trim()),
        clauses: clauses.filter((clause) => clause.trim()),
        reviewIntervalSeconds: intervalSeconds,
        beneficiary,
        rightLabel,
        note,
      });
    } catch {
      return null;
    }
  }, [subject, domain, sources, clauses, intervalSeconds, beneficiary, rightLabel, note]);

  useEffect(() => {
    if (!normalized || !beneficiary || !rightLabel.trim()) {
      setDigest(null);
      return;
    }
    let cancelled = false;
    computePolicyDigest({
      subject: normalized.subject,
      domain: normalized.domain,
      sources: normalized.sources,
      clauses: normalized.clauses,
      revision: 0,
      beneficiary,
      rightLabel: rightLabel.trim(),
    })
      .then((value) => {
        if (!cancelled) setDigest(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [normalized, beneficiary, rightLabel]);

  const authorityUrl = useMemo(() => {
    try {
      return authorityUrlFor(normalizeDomain(domain));
    } catch {
      return null;
    }
  }, [domain]);

  const updateList = (setter: (value: string[]) => void, list: string[], index: number, value: string) => {
    const next = [...list];
    next[index] = value;
    setter(next);
  };

  const downloadManifest = useCallback(() => {
    if (!digest || !normalized || !account) return;
    const manifest = {
      schema: AUTHORITY_SCHEMA,
      canonical_domain: normalized.domain,
      issuer: account.toLowerCase(),
      beneficiary: beneficiary.trim().toLowerCase(),
      policy_digest: digest,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "oathmark.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [digest, normalized, account, beneficiary]);

  const submit = useCallback(async () => {
    setFormError(null);
    if (!provider || !account) return;
    if (!normalized) {
      try {
        validatePledgeDraft({
          subject,
          canonicalDomain: domain,
          sourceUrls: sources.filter((url) => url.trim()),
          clauses: clauses.filter((clause) => clause.trim()),
          reviewIntervalSeconds: intervalSeconds,
          beneficiary,
          rightLabel,
          note,
        });
      } catch (cause) {
        setFormError((cause as Error).message);
        return;
      }
      return;
    }
    const authority = authorityUrlFor(normalized.domain);

    if (editId) {
      await run({
        label: `Update pledge #${editId}`,
        submit: () =>
          submitUpdateDraft(account, provider, editId, {
            subject: normalized.subject,
            canonicalDomain: normalized.domain,
            sourceUrls: normalized.sources,
            clauses: normalized.clauses,
            reviewIntervalSeconds: normalized.interval,
            note,
          }),
        authoritativeReread: async () => {
          const pledge = await readPledge(editId);
          return pledge.subject === normalized.subject && pledge.canonical_domain === normalized.domain;
        },
        onConfirmed: () => router.push(`/record/${editId}`),
      });
      return;
    }

    // Capture both signals before submitting: the creator index is the primary
    // evidence; the global counter is the fallback proof that our write landed.
    const beforeMine = await listCreatorPledgeIds(account.toLowerCase(), 0, 100).catch(() => [] as string[]);
    const beforeNext = await readNextPledgeId().catch(() => 0);
    await run({
      label: "Register pledge",
      submit: () =>
        submitCreateDraft(account, provider, {
          subject: normalized.subject,
          canonicalDomain: normalized.domain,
          sourceUrls: normalized.sources,
          clauses: normalized.clauses,
          authorityUrl: authority,
          beneficiary: beneficiary.trim(),
          rightLabel: rightLabel.trim(),
          reviewIntervalSeconds: normalized.interval,
          note,
        }),
      authoritativeReread: async () => {
        const mine = await listCreatorPledgeIds(account.toLowerCase(), 0, 100).catch(() => beforeMine);
        if (mine.length > beforeMine.length) return true;
        return (await readNextPledgeId().catch(() => beforeNext)) > beforeNext;
      },
      onConfirmed: () => {
        void (async () => {
          const mine = await listCreatorPledgeIds(account.toLowerCase(), 0, 1).catch(() => [] as string[]);
          router.push(mine.length ? `/record/${mine[0]}` : "/desk");
        })();
      },
    });
  }, [provider, account, normalized, editId, subject, domain, sources, clauses, intervalSeconds, beneficiary, rightLabel, note, run, router]);

  if (!isContractConfigured()) {
    return <ConfigBanner />;
  }

  if (loadingDraft) {
    return <div className="o-list-state">Loading the draft from the ledger…</div>;
  }

  return (
    <WalletGate
      title="Connect to record a pledge"
      message="Registering a pledge writes to the Oathmark contract. Connect MetaMask on GenLayer Studionet (chain 61999) to continue."
    >
      <div className="o-detail">
        <div>
          {formError ? <div className="o-error-box">{formError}</div> : null}

          <div className="o-form-section">
            <div className="o-form-section-head">
              <small>Section 01</small>
              <h3>Promise identity</h3>
            </div>
            <div className="o-form-section-body">
              <div className="o-field">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  value={subject}
                  maxLength={LIMITS.maxSubjectLength}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g. Thirty-day refund promise for annual plans"
                />
                <p className="o-hint">A short human name for the promise. Up to {LIMITS.maxSubjectLength} characters.</p>
              </div>
              <div className="o-field" style={{ marginBottom: 0 }}>
                <label htmlFor="domain">Canonical domain</label>
                <input
                  id="domain"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="example.com"
                  disabled={Boolean(editId)}
                />
                <p className="o-hint">
                  Hostname only — no protocol or path. Every source must live on this domain {editId ? "(frozen for existing drafts can still be edited)" : ""}and its well-known path carries the authority manifest.
                </p>
              </div>
            </div>
          </div>

          <div className="o-form-section">
            <div className="o-form-section-head">
              <small>Section 02</small>
              <h3>Official sources</h3>
            </div>
            <div className="o-form-section-body">
              <div className="o-list-editor">
                {sources.map((url, index) => (
                  <div className="o-list-editor-row" key={index}>
                    <span className="o-index">{String(index + 1).padStart(2, "0")}</span>
                    <input
                      value={url}
                      maxLength={LIMITS.maxSourceUrlLength}
                      onChange={(event) => updateList(setSources, sources, index, event.target.value)}
                      placeholder="https://example.com/terms"
                      style={{
                        border: "1px solid var(--o-line)",
                        background: "var(--o-paper)",
                        padding: "13px 14px",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      className="o-icon-btn"
                      type="button"
                      aria-label="Remove source"
                      disabled={sources.length <= 1}
                      onClick={() => setSources(sources.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  className="o-add-btn"
                  type="button"
                  disabled={sources.length >= LIMITS.maxSources}
                  onClick={() => setSources([...sources, ""])}
                >
                  <Plus size={13} aria-hidden="true" /> Add source ({sources.length}/{LIMITS.maxSources})
                </button>
              </div>
              <p className="o-hint" style={{ marginTop: 14 }}>
                Between one and {LIMITS.maxSources} distinct HTTPS pages on the canonical domain. No credentials,
                fragments, IP literals, or non-standard ports.
              </p>
            </div>
          </div>

          <div className="o-form-section">
            <div className="o-form-section-head">
              <small>Section 03</small>
              <h3>Reliance clauses</h3>
            </div>
            <div className="o-form-section-body">
              <div className="o-list-editor">
                {clauses.map((clause, index) => (
                  <div className="o-list-editor-row" key={index}>
                    <span className="o-index">{String(index + 1).padStart(2, "0")}</span>
                    <textarea
                      value={clause}
                      maxLength={LIMITS.maxClauseLength}
                      onChange={(event) => updateList(setClauses, clauses, index, event.target.value)}
                      placeholder="e.g. Customers may cancel within thirty days for a full refund."
                      style={{
                        border: "1px solid var(--o-line)",
                        background: "var(--o-paper)",
                        padding: "13px 14px",
                        fontSize: 13,
                        outline: "none",
                        resize: "vertical",
                        minHeight: 64,
                      }}
                    />
                    <button
                      className="o-icon-btn"
                      type="button"
                      aria-label="Remove clause"
                      disabled={clauses.length <= 1}
                      onClick={() => setClauses(clauses.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  className="o-add-btn"
                  type="button"
                  disabled={clauses.length >= LIMITS.maxClauses}
                  onClick={() => setClauses([...clauses, ""])}
                >
                  <Plus size={13} aria-hidden="true" /> Add clause ({clauses.length}/{LIMITS.maxClauses})
                </button>
              </div>
              <p className="o-hint" style={{ marginTop: 14 }}>
                Between one and {LIMITS.maxClauses} precise statements the sources must support. Validators evaluate
                each clause individually at every checkpoint.
              </p>
            </div>
          </div>

          <div className="o-form-section">
            <div className="o-form-section-head">
              <small>Section 04</small>
              <h3>Right and beneficiary</h3>
            </div>
            <div className="o-form-section-body">
              <div className="o-inline-fields">
                <div className="o-field">
                  <label htmlFor="beneficiary">Beneficiary address</label>
                  <input
                    id="beneficiary"
                    value={beneficiary}
                    onChange={(event) => setBeneficiary(event.target.value)}
                    placeholder="0x…"
                    disabled={Boolean(editId)}
                  />
                  <p className="o-hint">The only address allowed to exercise the right.</p>
                </div>
                <div className="o-field">
                  <label htmlFor="right-label">Named right</label>
                  <input
                    id="right-label"
                    value={rightLabel}
                    maxLength={LIMITS.maxRightLabelLength}
                    onChange={(event) => setRightLabel(event.target.value)}
                    placeholder="e.g. Right to claim the promised refund"
                    disabled={Boolean(editId)}
                  />
                  <p className="o-hint">What the beneficiary can enforce while evidence holds.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="o-form-section">
            <div className="o-form-section-head">
              <small>Section 05</small>
              <h3>Review cadence</h3>
            </div>
            <div className="o-form-section-body">
              <div className="o-field">
                <label htmlFor="interval">Checkpoint interval (seconds)</label>
                <input
                  id="interval"
                  type="number"
                  min={LIMITS.minReviewInterval}
                  max={LIMITS.maxReviewInterval}
                  value={intervalSeconds}
                  onChange={(event) => setIntervalSeconds(Number(event.target.value))}
                />
                <p className="o-hint">
                  Between {LIMITS.minReviewInterval} seconds and {LIMITS.maxReviewInterval / 86400} days. Also sets how
                  long a successful checkpoint keeps the right fresh.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {INTERVAL_PRESETS.map((preset) => (
                  <button
                    key={preset.seconds}
                    type="button"
                    className={`o-filter-button${intervalSeconds === preset.seconds ? " is-active" : ""}`}
                    style={{ border: "1px solid var(--o-line-soft)" }}
                    onClick={() => setIntervalSeconds(preset.seconds)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="o-form-section">
            <div className="o-form-section-head">
              <small>Section 06</small>
              <h3>Reliance note</h3>
            </div>
            <div className="o-form-section-body">
              <div className="o-field" style={{ marginBottom: 0 }}>
                <label htmlFor="note">Note (optional)</label>
                <textarea
                  id="note"
                  value={note}
                  maxLength={LIMITS.maxNoteLength}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why this promise matters and who relies on it."
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="o-detail-stack" style={{ position: "sticky", top: 24 }}>
          <div className="o-panel">
            <div className="o-panel-head">
              <h3>Authority manifest</h3>
              <ScrollText size={15} style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
            </div>
            <div className="o-panel-body">
              <dl className="o-rows">
                <div className="o-row">
                  <dt>Publish at</dt>
                  <dd>{authorityUrl ?? "—"}</dd>
                </div>
                <div className="o-row">
                  <dt>Schema</dt>
                  <dd>{AUTHORITY_SCHEMA}</dd>
                </div>
                <div className="o-row">
                  <dt>Issuer</dt>
                  <dd>{account ?? "connect wallet"}</dd>
                </div>
                <div className="o-row">
                  <dt>Policy digest</dt>
                  <dd className="o-hidden-hash">{digest ? shortHash(digest, 14, 12) : "complete the form to compute"}</dd>
                </div>
              </dl>
              <p className="o-hint" style={{ marginTop: 18 }}>
                The domain operator must publish the manifest file at the well-known address above before activation.
                Validators fetch it themselves; a missing or mismatched manifest leaves the draft unverified.
              </p>
              <button
                className="o-btn o-btn--ghost"
                type="button"
                style={{ width: "100%", marginTop: 18 }}
                disabled={!digest}
                onClick={downloadManifest}
              >
                <Download size={14} aria-hidden="true" /> Download manifest file
              </button>
            </div>
          </div>

          <div className="o-panel">
            <div className="o-panel-body">
              <button
                className="o-btn o-btn--accent"
                type="button"
                style={{ width: "100%" }}
                disabled={busy || !normalized || !connected || !correctNetwork}
                onClick={() => void submit()}
              >
                {editId ? "Update draft" : "Register pledge draft"}
              </button>
              <p className="o-hint" style={{ marginTop: 14, textAlign: "center" }}>
                Signed by your wallet · finalized by validator consensus
              </p>
            </div>
          </div>
        </aside>
      </div>
    </WalletGate>
  );
}
