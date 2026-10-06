import type { Assessment, Lifecycle, PledgeRecord, RightState } from "@/lib/contract/types";

export type SealTone = "ok" | "warn" | "bad" | "idle";

const DESCRIPTIONS: Record<string, string> = {
  DRAFT: "Baseline not yet verified by validators",
  ACTIVE: "Open to permissionless checkpoints",
  CANCELLED: "Draft withdrawn by its creator",
  ARCHIVED: "Historical record; closed to new checkpointstaking",
  UNCHECKED: "Verified baseline, no checkpoint yet",
  STABLE: "Every clause remains materially preserved",
  REVIEW_REQUIRED: "At least one clause has narrowed",
  BROKEN: "A clause was removed or contradicted",
  SOURCE_UNAVAILABLE: "A frozen source could not be evaluated",
  INCONCLUSIVE: "Validators could not reliably classify the evidence",
  EXPIRED: "The last substantive checkpoint is no longer fresh",
  PENDING: "Right awaits a verified baseline",
  ENFORCEABLE: "Beneficiary may exercise this right now",
  SUSPENDED: "Right paused until evidence recovers",
  REVOKED: "Right permanently revoked by consensus",
  CLOSED: "Record closed; right no longer exists",
};

const TONES: Record<string, SealTone> = {
  ACTIVE: "ok",
  STABLE: "ok",
  ENFORCEABLE: "ok",
  DRAFT: "idle",
  UNCHECKED: "idle",
  PENDING: "idle",
  CANCELLED: "idle",
  ARCHIVED: "idle",
  CLOSED: "idle",
  REVIEW_REQUIRED: "warn",
  SOURCE_UNAVAILABLE: "warn",
  INCONCLUSIVE: "warn",
  EXPIRED: "warn",
  SUSPENDED: "warn",
  BROKEN: "bad",
  REVOKED: "bad",
};

export function sealTone(status: string): SealTone {
  return TONES[status] ?? "idle";
}

export function sealDescription(status: string): string {
  return DESCRIPTIONS[status] ?? "";
}

/** Freshness is derived from chain time at read time. */
export function effectiveAssessment(record: PledgeRecord, nowSeconds = Math.floor(Date.now() / 1000)): Assessment | "EXPIRED" {
  if (
    record.lifecycle === "ACTIVE" &&
    record.assessment === "STABLE" &&
    record.fresh_until > 0 &&
    nowSeconds > record.fresh_until
  ) {
    return "EXPIRED";
  }
  return record.assessment;
}

export function effectiveRight(record: PledgeRecord, nowSeconds = Math.floor(Date.now() / 1000)): RightState | "EXPIRED" {
  if (record.right_status === "ENFORCEABLE" && record.fresh_until > 0 && nowSeconds > record.fresh_until) {
    return "EXPIRED";
  }
  return record.right_status;
}

export function displayLifecycle(record: PledgeRecord): Lifecycle {
  return record.lifecycle;
}

export function StatusSeal({ status, title }: { status: string; title?: string }) {
  const tone = sealTone(status);
  const description = title ?? sealDescription(status);
  return (
    <span className={`o-seal o-seal--${tone}`} title={description || undefined}>
      <i aria-hidden="true" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
