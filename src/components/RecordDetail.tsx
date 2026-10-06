"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LoaderCircle,
  ShieldCheck,
  Ban,
  Archive,
  RefreshCcw,
  Stamp,
  CirclePlay,
  FilePenLine,
  Download,
  TriangleAlert,
} from "lucide-react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTransaction } from "@/lib/contract/TransactionProvider";
import { isContractConfigured, contractAddressOrNull } from "@/lib/contract/address";
import {
  readPledge,
  readCheckpoints,
  readExercises,
  readRevisions,
  readRevisionProposal,
  submitActivateBaseline,
  submitActivateRevision,
  submitArchive,
  submitCancelDraft,
  submitExerciseRight,
  submitProposeRevision,
} from "@/lib/contract/adapter";
import type { Checkpoint, PledgeRecord, Revision, RevisionProposal, RightExercise } from "@/lib/contract/types";
import { LIMITS, AUTHORITY_SCHEMA, validatePledgeDraft } from "@/lib/contract/limits";
import { formatInterval, formatTimestamp, randomActionDigest, sameAddress, shortAddress, shortHash } from "@/lib/contract/digest";
import { StatusSeal, effectiveAssessment, effectiveRight } from "@/components/StatusSeal";
import { WalletGate } from "@/components/WalletGate";
import { ConfigBanner } from "@/components/ConfigBanner";
import { addressExplorerUrl } from "@/lib/genlayer/explorer";

type Bundle = {
  pledge: PledgeRecord;
  checkpoints: Checkpoint[];
  exercises: RightExercise[];
  revisions: Revision[];
  proposal: RevisionProposal | null;
};

export function RecordDetail({ id }: { id: string }) {
  const { provider, account, connected, correctNetwork } = useWallet();
  const { run, busy } = useTransaction();

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [confirmExercise, setConfirmExercise] = useState(false);

  const [revSources, setRevSources] = useState<string[]>([""]);
  const [revClauses, setRevClauses] = useState<string[]>([""]);
  const [revInterval, setRevInterval] = useState(86400);

  const refresh = useCallback(async () => {
    if (!isContractConfigured()) return;
    try {
      const [pledge, checkpoints, exercises, revisions, proposal] = await Promise.all([
        readPledge(id),
        readCheckpoints(id),
        readExercises(id),
        readRevisions(id),
        readRevisionProposal(id),
      ]);
      setBundle({ pledge, checkpoints, exercises, revisions, proposal });
      setError(null);
    } catch (cause) {
      setError((cause as Error)?.message ?? "This record could not be loaded.");
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const now = Math.floor(Date.now() / 1000);
  const pledge = bundle?.pledge ?? null;
  const isCreator = Boolean(pledge && sameAddress(pledge.creator, account));
  const isBeneficiary = Boolean(pledge && sameAddress(pledge.beneficiary, account));
  const assessment = pledge ? effectiveAssessment(pledge, now) : null;
  const right = pledge ? effectiveRight(pledge, now) : null;
  const checkpointBase = pledge ? Math.max(pledge.activated_at, pledge.last_checkpoint_at) : 0;
  const checkpointEligible = Boolean(
    pledge && pledge.lifecycle === "ACTIVE" && now >= checkpointBase + pledge.review_interval_seconds,
  );
  const canExercise = Boolean(
    pledge && isBeneficiary && pledge.lifecycle === "ACTIVE" && pledge.right_status === "ENFORCEABLE" && now <= pledge.fresh_until,
  );
  const latestCheckpoint = bundle?.checkpoints.length ? bundle.checkpoints[bundle.checkpoints.length - 1] : null;

  const contract = contractAddressOrNull();

  const act = useCallback(
    (label: string, submit: () => Promise<string>, verify: (fresh: PledgeRecord, extras: Bundle) => boolean) =>
      run({
        label,
        submit,
        authoritativeReread: async () => {
          const fresh = await readPledge(id);
          const [checkpoints, exercises, revisions, proposal] = await Promise.all([
            readCheckpoints(id),
            readExercises(id),
            readRevisions(id),
            readRevisionProposal(id),
          ]);
          const next: Bundle = { pledge: fresh, checkpoints, exercises, revisions, proposal };
          const expected = verify(fresh, next);
          setBundle(next);
          return expected;
        },
        onConfirmed: () => {
          setActionError(null);
          setShowRevisionForm(false);
          setConfirmExercise(false);
        },
      }),
    [id, run],
  );

  const revisionValid = useMemo(() => {
    if (!pledge) return false;
    try {
      validatePledgeDraft({
        subject: pledge.subject,
        canonicalDomain: pledge.canonical_domain,
        sourceUrls: revSources.filter((url) => url.trim()),
        clauses: revClauses.filter((clause) => clause.trim()),
        reviewIntervalSeconds: revInterval,
        beneficiary: pledge.beneficiary,
        rightLabel: pledge.right_label,
        note: pledge.note,
      });
      return true;
    } catch {
      return false;
    }
  }, [pledge, revSources, revClauses, revInterval]);

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

  if (!bundle || !pledge) {
    return (
      <div className="o-list-state">
        <LoaderCircle size={30} className="o-spin" style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
        Reconstructing pledge #{id} from the contract…
      </div>
    );
  }

  return (
    <div className="o-detail-stack">
      <section className="o-panel">
        <div className="o-panel-body" style={{ padding: "30px 30px 26px" }}>
          <div className="o-kicker">
            Pledge #{pledge.id} · {pledge.canonical_domain}
          </div>
          <h1 className="o-display" style={{ fontSize: "clamp(30px, 4.6vw, 54px)", marginTop: 16 }}>
            {pledge.subject}
          </h1>
          {pledge.note ? (
            <p style={{ color: "var(--o-muted)", maxWidth: 640, lineHeight: 1.7, fontSize: 14, margin: "16px 0 0" }}>
              {pledge.note}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <StatusSeal status={pledge.lifecycle} />
            {pledge.lifecycle === "ACTIVE" && assessment ? <StatusSeal status={assessment} /> : null}
            {assessment === "EXPIRED" ? null : right ? <StatusSeal status={right} /> : null}
          </div>
        </div>
      </section>

      <div className="o-detail">
        <div className="o-detail-stack">
          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Reliance clauses</h3>
              <span className="o-mono" style={{ fontSize: 9, color: "var(--o-muted)" }}>
                {pledge.clauses.length} frozen
              </span>
            </div>
            <div className="o-panel-body">
              {pledge.clauses.map((clause, index) => {
                const verdict = latestCheckpoint?.clauses.find((item) => item.index === index);
                return (
                  <div className="o-clause" key={index}>
                    <div className="o-clause-head">
                      <span className="o-mono" style={{ fontSize: 9, color: "var(--o-accent-dark)" }}>
                        Clause {String(index + 1).padStart(2, "0")}
                      </span>
                      {verdict ? (
                        <StatusSeal status={verdict.verdict} />
                      ) : (
                        <span className="o-mono" style={{ fontSize: 9, color: "var(--o-faint)" }}>
                          awaiting checkpoint
                        </span>
                      )}
                    </div>
                    <p>{clause}</p>
                    {verdict?.excerpt ? <blockquote>“{verdict.excerpt}”</blockquote> : null}
                    {verdict?.reason ? (
                      <p className="o-hint" style={{ marginTop: 10 }}>
                        {verdict.reason}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Frozen sources</h3>
              <span className="o-mono" style={{ fontSize: 9, color: "var(--o-muted)" }}>
                full-response commitments
              </span>
            </div>
            <div className="o-panel-body">
              {pledge.source_urls.map((url, index) => {
                const commitment = latestCheckpoint?.sources.find((item) => item.source_index === index);
                return (
                  <div className="o-clause" key={index}>
                    <div className="o-clause-head">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="o-link-quiet"
                        style={{ fontSize: 12, wordBreak: "break-all" }}
                      >
                        {url}
                      </a>
                      {commitment ? <span className="o-chip"><i />{commitment.coverage}</span> : null}
                    </div>
                    {commitment ? (
                      <dl className="o-rows" style={{ marginTop: 8 }}>
                        <div className="o-row">
                          <dt>HTTP status</dt>
                          <dd>{commitment.http_status}</dd>
                        </div>
                        <div className="o-row">
                          <dt>Length</dt>
                          <dd>{commitment.content_length.toLocaleString("en-US")} characters</dd>
                        </div>
                        <div className="o-row">
                          <dt>Response digest</dt>
                          <dd className="o-hidden-hash">{shortHash(commitment.content_sha256)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="o-hint">No checkpoint has committed to this source yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Checkpoint history</h3>
              <span className="o-mono" style={{ fontSize: 9, color: "var(--o-muted)" }}>
                {bundle.checkpoints.length} recorded
              </span>
            </div>
            <div className="o-panel-body">
              {bundle.checkpoints.length === 0 ? (
                <p className="o-hint">No checkpoints yet. The first one becomes possible one interval after activation.</p>
              ) : (
                <div className="o-timeline">
                  {[...bundle.checkpoints].reverse().map((checkpoint, index) => (
                    <div className="o-timeline-item" key={index}>
                      <span className="o-mono">
                        {formatTimestamp(checkpoint.at)} · by {shortAddress(checkpoint.requester)}
                      </span>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                        <StatusSeal status={checkpoint.outcome} />
                        <span className="o-mono" style={{ fontSize: 9, color: "var(--o-muted)" }}>
                          revision {checkpoint.revision}
                        </span>
                      </div>
                      <p>{checkpoint.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {bundle.revisions.length > 0 ? (
            <section className="o-panel">
              <div className="o-panel-head">
                <h3>Revision history</h3>
              </div>
              <div className="o-panel-body">
                <div className="o-timeline">
                  {[...bundle.revisions].reverse().map((revision) => (
                    <div className="o-timeline-item" key={revision.revision}>
                      <span className="o-mono">
                        Revision {revision.revision} · {formatTimestamp(revision.at)}
                      </span>
                      <div style={{ marginTop: 8 }}>
                        <StatusSeal status={revision.outcome} />
                      </div>
                      <p>
                        {revision.reason} <span className="o-hidden-hash">{shortHash(revision.policy_digest)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {bundle.exercises.length > 0 ? (
            <section className="o-panel">
              <div className="o-panel-head">
                <h3>Exercise receipts</h3>
              </div>
              <div className="o-panel-body">
                <div className="o-timeline">
                  {[...bundle.exercises].reverse().map((exercise) => (
                    <div className="o-timeline-item" key={exercise.receipt_id}>
                      <span className="o-mono">
                        {exercise.receipt_id} · {formatTimestamp(exercise.at)}
                      </span>
                      <p>
                        Exercised by {shortAddress(exercise.beneficiary)} at revision {exercise.revision} · action
                        digest <span className="o-hidden-hash">{shortHash(exercise.action_digest)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="o-detail-stack">
          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Enforcement state</h3>
              <ShieldCheck size={15} style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
            </div>
            <div className="o-state-grid">
              <div className="o-state-cell">
                <small>Named right</small>
                <strong>{pledge.right_label}</strong>
              </div>
              <div className="o-state-cell">
                <small>Right state</small>
                <strong>{(right ?? pledge.right_status).replace(/_/g, " ")}</strong>
              </div>
              <div className="o-state-cell">
                <small>Beneficiary</small>
                <strong>
                  <a className="o-link-quiet" href={addressExplorerUrl(pledge.beneficiary)} target="_blank" rel="noopener noreferrer">
                    {shortAddress(pledge.beneficiary)}
                  </a>
                </strong>
              </div>
              <div className="o-state-cell">
                <small>Creator</small>
                <strong>
                  <a className="o-link-quiet" href={addressExplorerUrl(pledge.creator)} target="_blank" rel="noopener noreferrer">
                    {shortAddress(pledge.creator)}
                  </a>
                </strong>
              </div>
              <div className="o-state-cell">
                <small>Fresh until</small>
                <strong>{pledge.fresh_until ? formatTimestamp(pledge.fresh_until) : "—"}</strong>
              </div>
              <div className="o-state-cell">
                <small>Review interval</small>
                <strong>{formatInterval(pledge.review_interval_seconds)}</strong>
              </div>
              <div className="o-state-cell">
                <small>Active revision</small>
                <strong>v{pledge.active_revision}</strong>
              </div>
              <div className="o-state-cell">
                <small>Exercises</small>
                <strong>{pledge.exercise_count}</strong>
              </div>
            </div>
            <div className="o-panel-body">
              <dl className="o-rows">
                <div className="o-row">
                  <dt>Created</dt>
                  <dd>{formatTimestamp(pledge.created_at)}</dd>
                </div>
                <div className="o-row">
                  <dt>Activated</dt>
                  <dd>{pledge.activated_at ? formatTimestamp(pledge.activated_at) : "—"}</dd>
                </div>
                <div className="o-row">
                  <dt>Last checkpoint</dt>
                  <dd>{pledge.last_checkpoint_at ? formatTimestamp(pledge.last_checkpoint_at) : "—"}</dd>
                </div>
                <div className="o-row">
                  <dt>Authority manifest</dt>
                  <dd>
                    <a className="o-link-quiet" href={pledge.authority_url} target="_blank" rel="noopener noreferrer">
                      {pledge.authority_url}
                    </a>
                  </dd>
                </div>
                {contract ? (
                  <div className="o-row">
                    <dt>Contract</dt>
                    <dd>
                      <a className="o-link-quiet" href={addressExplorerUrl(contract)} target="_blank" rel="noopener noreferrer">
                        {shortAddress(contract)}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </section>

          {pledge.last_activation_result && pledge.lifecycle === "DRAFT" ? (
            <section className="o-panel">
              <div className="o-panel-head">
                <h3>Last activation attempt</h3>
                <TriangleAlert size={15} style={{ color: "var(--o-warn)" }} aria-hidden="true" />
              </div>
              <div className="o-panel-body">
                <StatusSeal status={pledge.last_activation_result.outcome} />
                <p className="o-hint" style={{ marginTop: 12 }}>
                  {pledge.last_activation_result.reason}
                </p>
              </div>
            </section>
          ) : null}

          {bundle.proposal ? (
            <section className="o-panel">
              <div className="o-panel-head">
                <h3>Pending revision v{bundle.proposal.revision}</h3>
              </div>
              <div className="o-panel-body">
                <dl className="o-rows">
                  <div className="o-row">
                    <dt>Proposed</dt>
                    <dd>{formatTimestamp(bundle.proposal.proposed_at)}</dd>
                  </div>
                  <div className="o-row">
                    <dt>Digest</dt>
                    <dd className="o-hidden-hash">{shortHash(bundle.proposal.policy_digest)}</dd>
                  </div>
                  <div className="o-row">
                    <dt>Clauses</dt>
                    <dd>{bundle.proposal.clauses.length} clauses · {bundle.proposal.source_urls.length} sources</dd>
                  </div>
                </dl>
                <p className="o-hint" style={{ marginTop: 14 }}>
                  The manifest on the canonical domain must commit to this digest before activation. Until then the
                  right stays suspended.
                </p>
              </div>
            </section>
          ) : null}

          <section className="o-panel">
            <div className="o-panel-head">
              <h3>Actions</h3>
            </div>
            <div className="o-panel-body o-detail-stack" style={{ gap: 12 }}>
              {actionError ? <div className="o-error-box">{actionError}</div> : null}
              {!connected || !correctNetwork ? (
                <WalletGate
                  title="Connect to act"
                  message="Actions on this record are signed by your wallet on Studionet (chain 61999)."
                />
              ) : (
                <>
                  {pledge.lifecycle === "DRAFT" && isCreator ? (
                    <>
                      <button
                        className="o-btn o-btn--accent"
                        type="button"
                        disabled={busy || !provider || !account}
                        onClick={() =>
                          void act(
                            `Activate pledge #${id}`,
                            () => submitActivateBaseline(account!, provider!, id),
                            (fresh) => fresh.lifecycle === "ACTIVE" || fresh.last_activation_result != null,
                          )
                        }
                      >
                        <CirclePlay size={14} aria-hidden="true" /> Verify baseline &amp; activate
                      </button>
                      <p className="o-hint">
                        Validators fetch the manifest and every source. Activation succeeds only if the authority
                        matches and all clauses are supported.
                      </p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link className="o-btn o-btn--ghost" href={`/compose?edit=${id}`}>
                          <FilePenLine size={14} aria-hidden="true" /> Edit draft
                        </Link>
                        <button
                          className="o-btn o-btn--ghost o-btn--danger"
                          type="button"
                          disabled={busy || !provider || !account}
                          onClick={() =>
                            void act(`Cancel draft #${id}`, () => submitCancelDraft(account!, provider!, id), (fresh) => fresh.lifecycle === "CANCELLED")
                          }
                        >
                          <Ban size={14} aria-hidden="true" /> Cancel draft
                        </button>
                      </div>
                    </>
                  ) : null}

                  {pledge.lifecycle === "ACTIVE" ? (
                    <>
                      <Link
                        className={`o-btn o-btn--accent${checkpointEligible ? "" : " o-btn--ghost"}`}
                        href={`/record/${id}/checkpoint`}
                      >
                        <RefreshCcw size={14} aria-hidden="true" />
                        {checkpointEligible ? "Run checkpoint now" : "Checkpoint schedule"}
                      </Link>
                      {canExercise && !confirmExercise ? (
                        <button className="o-btn" type="button" onClick={() => setConfirmExercise(true)}>
                          <Stamp size={14} aria-hidden="true" /> Exercise “{pledge.right_label}”
                        </button>
                      ) : null}
                      {canExercise && confirmExercise ? (
                        <div className="o-note-box">
                          <strong>This writes an immutable receipt.</strong>
                          <br />
                          A one-time action digest will be committed on your behalf and cannot be replayed.
                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <button
                              className="o-btn o-btn--accent"
                              type="button"
                              disabled={busy || !provider || !account}
                              onClick={() => {
                                const digest = randomActionDigest();
                                void act(
                                  `Exercise right on pledge #${id}`,
                                  () => submitExerciseRight(account!, provider!, id, digest),
                                  (fresh) => fresh.exercise_count > pledge.exercise_count,
                                );
                              }}
                            >
                              Confirm exercise
                            </button>
                            <button className="o-btn o-btn--ghost" type="button" onClick={() => setConfirmExercise(false)}>
                              Back
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {isBeneficiary && !canExercise ? (
                        <p className="o-hint">
                          Your right is {(right ?? pledge.right_status).replace(/_/g, " ").toLowerCase()}; it must be
                          enforceable and fresh to exercise.
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {pledge.lifecycle === "ACTIVE" && isCreator && !bundle.proposal && !showRevisionForm ? (
                    <button
                      className="o-btn o-btn--ghost"
                      type="button"
                      onClick={() => {
                        setRevSources([...pledge.source_urls]);
                        setRevClauses([...pledge.clauses]);
                        setRevInterval(pledge.review_interval_seconds);
                        setShowRevisionForm(true);
                      }}
                    >
                      <FilePenLine size={14} aria-hidden="true" /> Propose revision v{pledge.active_revision + 1}
                    </button>
                  ) : null}

                  {showRevisionForm ? (
                    <div className="o-clause" style={{ marginBottom: 0 }}>
                      <div className="o-field">
                        <label>Revised sources</label>
                        {revSources.map((url, index) => (
                          <input
                            key={index}
                            value={url}
                            onChange={(event) => {
                              const next = [...revSources];
                              next[index] = event.target.value;
                              setRevSources(next);
                            }}
                            style={{
                              border: "1px solid var(--o-line)",
                              padding: "11px 12px",
                              fontSize: 12,
                              marginBottom: 8,
                              width: "100%",
                              outline: "none",
                            }}
                          />
                        ))}
                      </div>
                      <div className="o-field">
                        <label>Revised clauses</label>
                        {revClauses.map((clause, index) => (
                          <textarea
                            key={index}
                            value={clause}
                            onChange={(event) => {
                              const next = [...revClauses];
                              next[index] = event.target.value;
                              setRevClauses(next);
                            }}
                            style={{
                              border: "1px solid var(--o-line)",
                              padding: "11px 12px",
                              fontSize: 12,
                              marginBottom: 8,
                              width: "100%",
                              outline: "none",
                              minHeight: 54,
                            }}
                          />
                        ))}
                      </div>
                      <div className="o-field">
                        <label>Review interval (seconds)</label>
                        <input
                          type="number"
                          min={LIMITS.minReviewInterval}
                          max={LIMITS.maxReviewInterval}
                          value={revInterval}
                          onChange={(event) => setRevInterval(Number(event.target.value))}
                          style={{ border: "1px solid var(--o-line)", padding: "11px 12px", fontSize: 12, outline: "none" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="o-btn o-btn--accent"
                          type="button"
                          disabled={busy || !revisionValid || !provider || !account}
                          onClick={() =>
                            void act(
                              `Stage revision for pledge #${id}`,
                              () =>
                                submitProposeRevision(account!, provider!, id, {
                                  sourceUrls: revSources.map((url) => url.trim()),
                                  clauses: revClauses.map((clause) => clause.trim()),
                                  reviewIntervalSeconds: revInterval,
                                  note: pledge.note,
                                }),
                              (_fresh, extras) => extras.proposal != null,
                            )
                          }
                        >
                          Stage revision
                        </button>
                        <button className="o-btn o-btn--ghost" type="button" onClick={() => setShowRevisionForm(false)}>
                          Discard
                        </button>
                      </div>
                      <p className="o-hint" style={{ marginTop: 12 }}>
                        Publish the updated manifest (schema {AUTHORITY_SCHEMA}) committing to the new digest, then
                        verify the revision.
                      </p>
                    </div>
                  ) : null}

                  {bundle.proposal && isCreator ? (
                    <button
                      className="o-btn o-btn--accent"
                      type="button"
                      disabled={busy || !provider || !account}
                      onClick={() =>
                        void act(
                          `Verify revision for pledge #${id}`,
                          () => submitActivateRevision(account!, provider!, id),
                          (fresh, extras) => fresh.active_revision > pledge.active_revision || extras.proposal == null,
                        )
                      }
                    >
                      <ShieldCheck size={14} aria-hidden="true" /> Verify &amp; apply revision
                    </button>
                  ) : null}

                  {(pledge.lifecycle === "DRAFT" || pledge.lifecycle === "ACTIVE") && isCreator ? (
                    <button
                      className="o-btn o-btn--ghost"
                      type="button"
                      disabled={busy || !provider || !account}
                      onClick={() =>
                        void act(`Archive pledge #${id}`, () => submitArchive(account!, provider!, id), (fresh) => fresh.lifecycle === "ARCHIVED")
                      }
                    >
                      <Archive size={14} aria-hidden="true" /> Archive record
                    </button>
                  ) : null}

                  {!isCreator && !isBeneficiary ? (
                    <p className="o-hint">
                      You are viewing as {shortAddress(account ?? "")}. Only the creator manages this record and only
                      the beneficiary may exercise its right; anyone may run a checkpoint.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {bundle.proposal ? (
            <button
              className="o-btn o-btn--ghost"
              type="button"
              onClick={() => {
                const manifest = {
                  schema: AUTHORITY_SCHEMA,
                  canonical_domain: pledge.canonical_domain,
                  issuer: pledge.creator,
                  beneficiary: pledge.beneficiary,
                  policy_digest: bundle.proposal!.policy_digest,
                };
                const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "oathmark.json";
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={14} aria-hidden="true" /> Download revision manifest
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
