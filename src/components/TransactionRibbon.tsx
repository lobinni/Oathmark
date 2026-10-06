"use client";

import { X } from "lucide-react";
import { useTransaction, type TransactionPhase } from "@/lib/contract/TransactionProvider";
import { transactionExplorerUrl } from "@/lib/genlayer/explorer";

const PHASE_TEXT: Record<Exclude<TransactionPhase, "IDLE">, string> = {
  PREPARING: "Preparing transaction",
  AWAITING_SIGNATURE: "Confirm in your wallet",
  SUBMITTED: "Submitted to validators",
  CONSENSUS_PENDING: "Validators are reaching consensus",
  FINALIZED: "Finalized on Studionet",
  REREADING: "Re-reading contract state",
  CONFIRMED: "Confirmed and applied",
  USER_REJECTED: "Request rejected by wallet",
  CONSENSUS_FAILED: "Consensus did not agree",
  EXECUTION_FAILED: "Execution did not succeed",
  STATE_MISMATCH: "State check failed",
  FAILED: "Transaction failed",
};

const ERROR_PHASES: TransactionPhase[] = ["USER_REJECTED", "CONSENSUS_FAILED", "EXECUTION_FAILED", "STATE_MISMATCH", "FAILED"];

export function TransactionRibbon() {
  const { state, clear } = useTransaction();
  if (state.phase === "IDLE") return null;

  const isError = ERROR_PHASES.includes(state.phase);
  const isDone = state.phase === "CONFIRMED";

  return (
    <div className={`o-ribbon${isError ? " is-error" : ""}${isDone ? " is-done" : ""}`} role="status" aria-live="polite">
      <i className="o-ribbon-dot" aria-hidden="true" />
      <div className="o-ribbon-body">
        <strong>
          {state.label ? `${state.label} · ` : ""}
          {PHASE_TEXT[state.phase]}
        </strong>
        <small>
          {state.error ??
            (state.hash ? (
              <a href={transactionExplorerUrl(state.hash)} target="_blank" rel="noopener noreferrer">
                View transaction {state.hash.slice(0, 12)}…
              </a>
            ) : (
              "Hold on — consensus rounds can take a few minutes on Studionet."
            ))}
        </small>
      </div>
      <button type="button" onClick={clear} aria-label="Dismiss">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
