export type Lifecycle = "DRAFT" | "ACTIVE" | "CANCELLED" | "ARCHIVED";

export type Assessment =
  | "UNCHECKED"
  | "STABLE"
  | "REVIEW_REQUIRED"
  | "BROKEN"
  | "SOURCE_UNAVAILABLE"
  | "INCONCLUSIVE";

export type ClauseVerdict =
  | "PRESERVED"
  | "NARROWED"
  | "REMOVED"
  | "CONTRADICTED"
  | "SOURCE_UNAVAILABLE"
  | "INCONCLUSIVE";

export type RightState = "PENDING" | "ENFORCEABLE" | "SUSPENDED" | "REVOKED" | "CLOSED";

export type BaselineOutcome =
  | "VERIFIED"
  | "AUTHORITY_UNVERIFIED"
  | "CLAUSE_NOT_SUPPORTED"
  | "SOURCE_UNAVAILABLE"
  | "INCONCLUSIVE";

export type Coverage = "FULL" | "HTTP_ERROR" | "EMPTY" | "TOO_LARGE" | "FETCH_ERROR";

export interface SourceCommitment {
  source_index: number;
  url: string;
  content_sha256: string;
  content_length: number;
  http_status: number;
  coverage: Coverage;
}

export interface AuthorityProof {
  verified: boolean;
  reason: string;
  commitment: {
    url: string;
    content_sha256: string;
    content_length: number;
    http_status: number;
    coverage: Coverage;
  };
}

export interface BaselineResult {
  outcome: BaselineOutcome;
  clauses: Array<{
    index: number;
    supported: boolean;
    source_index: number;
    excerpt: string;
  }>;
  reason: string;
  sources: SourceCommitment[];
  authority: AuthorityProof;
}

export interface CheckpointClause {
  index: number;
  verdict: ClauseVerdict;
  source_index: number;
  excerpt: string;
  reason: string;
}

export interface Checkpoint {
  at: number;
  outcome: Assessment;
  clauses: CheckpointClause[];
  sources: SourceCommitment[];
  reason: string;
  requester: string;
  revision: number;
}

export interface PledgeRecord {
  id: string;
  creator: string;
  subject: string;
  canonical_domain: string;
  source_urls: string[];
  clauses: string[];
  authority_url: string;
  authority_verified: boolean;
  beneficiary: string;
  right_label: string;
  right_status: RightState;
  exercise_count: number;
  review_interval_seconds: number;
  note: string;
  lifecycle: Lifecycle;
  assessment: Assessment;
  active_revision: number;
  checkpoint_count: number;
  created_at: number;
  activated_at: number;
  last_checkpoint_at: number;
  last_successful_at: number;
  fresh_until: number;
  last_activation_result: BaselineResult | null;
}

export interface Revision {
  revision: number;
  at: number;
  policy_digest: string;
  outcome: BaselineOutcome;
  reason: string;
}

export interface RightExercise {
  receipt_id: string;
  pledge_id: string;
  beneficiary: string;
  action_digest: string;
  at: number;
  revision: number;
}

export interface RevisionProposal {
  revision: number;
  source_urls: string[];
  clauses: string[];
  review_interval_seconds: number;
  note: string;
  policy_digest: string;
  proposed_at: number;
}

export interface PledgeInput {
  subject: string;
  canonicalDomain: string;
  sourceUrls: string[];
  clauses: string[];
  authorityUrl: string;
  beneficiary: string;
  rightLabel: string;
  reviewIntervalSeconds: number;
  note: string;
}
