import { StatusSeal } from "@/components/StatusSeal";
import { LIMITS, AUTHORITY_MANIFEST_PATH, AUTHORITY_SCHEMA } from "@/lib/contract/limits";
import { STUDIONET } from "@/lib/genlayer/network";

export const metadata = {
  title: "Method — Oathmark",
  description: "How Oathmark turns domain-published promises into consensus-enforced rights.",
};

const MANIFEST_FIELDS: Array<[string, string]> = [
  ["schema", `Must equal "${AUTHORITY_SCHEMA}" exactly.`],
  ["canonical_domain", "The frozen canonical domain of the pledge."],
  ["issuer", "The creator address that registered the draft on chain."],
  ["beneficiary", "The exact address entitled to the named right."],
  ["policy_digest", "Digest committing to subject, domain, sources, clauses, revision, beneficiary, and right label."],
];

const LIMIT_ROWS: Array<[string, string]> = [
  ["Sources per pledge", `1 – ${LIMITS.maxSources} HTTPS pages on the canonical domain`],
  ["Reliance clauses", `1 – ${LIMITS.maxClauses}, each up to ${LIMITS.maxClauseLength} characters`],
  ["Source response size", "60,000 characters per source, 120,000 in aggregate"],
  ["Review interval", "5 minutes minimum, 90 days maximum"],
  ["Checkpoint history", `${LIMITS.maxHistory} entries; archive afterwards`],
  ["Ledger capacity", `${LIMITS.maxPledges.toLocaleString("en-US")} pledges`],
];

export default function MethodPage() {
  return (
    <div className="o-page-pad o-shell">
      <div className="o-zone-head">
        <div>
          <div className="o-kicker">Method</div>
          <h1>
            Enforcement, <em>not attestation</em>
          </h1>
          <p>
            A content hash proves bytes changed; it cannot say whether a policy&apos;s practical meaning changed.
            Oathmark puts that substantive judgment inside GenLayer consensus, and the verdict directly gates an
            on-chain right. The browser never decides an outcome, and there is no project-controlled oracle.
          </p>
        </div>
      </div>

      <section className="o-detail-stack" style={{ marginBottom: 64 }}>
        <div className="o-panel">
          <div className="o-panel-head">
            <h3>The full lifecycle</h3>
            <span className="o-mono" style={{ fontSize: 9, color: "var(--o-muted)" }}>
              deterministic · fail-closed
            </span>
          </div>
          <div className="o-panel-body">
            <div className="o-timeline">
              <div className="o-timeline-item">
                <span className="o-mono">Step 1 — Draft</span>
                <p>
                  The creator registers the subject, canonical domain, named beneficiary, right label, one to four
                  official URLs, one to five reliance clauses, and a review interval. Drafts can be edited or cancelled
                  freely by their creator.
                </p>
              </div>
              <div className="o-timeline-item">
                <span className="o-mono">Step 2 — Authority manifest</span>
                <p>
                  The domain operator publishes a manifest at
                  <strong> {AUTHORITY_MANIFEST_PATH}</strong> on the canonical domain. It must match the proposed
                  pledge field for field — creator assertion alone proves nothing.
                </p>
              </div>
              <div className="o-timeline-item">
                <span className="o-mono">Step 3 — Baseline verification</span>
                <p>
                  Every validator independently fetches the manifest and all frozen sources, checks the digest, and
                  judges whether each clause is materially supported with grounded excerpts. Only a fully supported
                  baseline activates the pledge and makes the right enforceable.
                </p>
              </div>
              <div className="o-timeline-item">
                <span className="o-mono">Step 4 — Permissionless checkpoints</span>
                <p>
                  Once per review interval, any account may initiate a checkpoint. Consensus compares the live sources
                  against the frozen clauses and classifies each one. The aggregate verdict updates the enforcement
                  state in the same transaction.
                </p>
              </div>
              <div className="o-timeline-item">
                <span className="o-mono">Step 5 — Exercise and closure</span>
                <p>
                  Only the bound beneficiary may exercise a fresh, enforceable right. Action digests cannot be
                  replayed, and every exercise writes an immutable receipt. Creators may stage verified revisions or
                  archive a record; nobody can rewrite consensus history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="o-detail" style={{ marginBottom: 64 }}>
        <div className="o-panel">
          <div className="o-panel-head">
            <h3>Reading the seals</h3>
          </div>
          <div className="o-panel-body o-detail-stack" style={{ gap: 14 }}>
            {(
              [
                ["STABLE", "ok"],
                ["REVIEW REQUIRED", "warn"],
                ["BROKEN", "bad"],
                ["SOURCE UNAVAILABLE", "warn"],
                ["EXPIRED", "warn"],
                ["ENFORCEABLE", "ok"],
                ["SUSPENDED", "warn"],
                ["REVOKED", "bad"],
              ] as const
            ).map(([status]) => (
              <div key={status} style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                <StatusSeal status={status.replace(/ /g, "_")} />
                <p style={{ margin: 0, color: "var(--o-muted)", fontSize: 12, lineHeight: 1.6, flex: 1, minWidth: 220 }}>
                  {
                    {
                      STABLE: "All clauses remain materially preserved; freshness renewed at the checkpoint.",
                      "REVIEW REQUIRED": "At least one clause narrowed; the right suspends pending a verified revision.",
                      BROKEN: "A clause was removed or contradicted; the right is revoked.",
                      "SOURCE UNAVAILABLE": "A frozen source was unreachable, empty, or too large; the record fails closed.",
                      EXPIRED: "The last substantive checkpoint is older than its freshness window.",
                      ENFORCEABLE: "The beneficiary may exercise the named right immediately.",
                      SUSPENDED: "The right is paused until evidence recovers through a checkpoint or revision.",
                      REVOKED: "Consensus revoked the right; only a verified revision can restore it.",
                    }[status]
                  }
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="o-detail-stack">
          <div className="o-panel">
            <div className="o-panel-head">
              <h3>Authority manifest fields</h3>
            </div>
            <div className="o-panel-body">
              <dl className="o-rows">
                {MANIFEST_FIELDS.map(([name, description]) => (
                  <div className="o-row" key={name}>
                    <dt>{name}</dt>
                    <dd>{description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="o-panel">
            <div className="o-panel-head">
              <h3>Network</h3>
            </div>
            <div className="o-panel-body">
              <dl className="o-rows">
                <div className="o-row">
                  <dt>Network</dt>
                  <dd>{STUDIONET.name} — the only supported network</dd>
                </div>
                <div className="o-row">
                  <dt>Chain ID</dt>
                  <dd>{STUDIONET.id}</dd>
                </div>
                <div className="o-row">
                  <dt>Wallet</dt>
                  <dd>MetaMask or any injected EIP-1193 wallet; every write is signed by the visitor.</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <section className="o-band" style={{ padding: "64px 0" }} aria-labelledby="limits-title">
        <div className="o-shell" style={{ position: "relative" }}>
          <div className="o-zone-head" style={{ marginBottom: 34 }}>
            <div>
              <div className="o-kicker">Bounds</div>
              <h2 id="limits-title" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
                Fail-<em>closed</em> by design
              </h2>
              <p>
                Inputs, fetch sizes, and history are bounded. Missing, oversized, or conflicting evidence never
                becomes stable — it closes as unavailable or inconclusive instead.
              </p>
            </div>
          </div>
          <div className="o-card-grid" style={{ borderColor: "var(--o-light-line)" }}>
            {LIMIT_ROWS.map(([label, value]) => (
              <div
                key={label}
                style={{
                  borderRight: "1px solid var(--o-light-line)",
                  borderBottom: "1px solid var(--o-light-line)",
                  padding: "20px 22px",
                  minHeight: "auto",
                  background: "transparent",
                }}
              >
                <small
                  style={{
                    display: "block",
                    font: "500 8px/1 var(--font-dm-mono), monospace",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "rgba(248,252,249,0.45)",
                    marginBottom: 10,
                  }}
                >
                  {label}
                </small>
                <span style={{ color: "#f8fcf9", fontSize: 13 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="o-zone o-zone--tight">
        <div className="o-zone-head">
          <div>
            <div className="o-kicker">Write integrity</div>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
              Success means <em>finalized</em>
            </h2>
            <p>
              The interface reports a write as successful only after the transaction is finalized, validators reached
              majority agreement, the leader&apos;s execution succeeded, and an authoritative re-read confirms the
              state. Submission alone is never success — and the complete verification pipeline lives in docs/TESTING.md.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
