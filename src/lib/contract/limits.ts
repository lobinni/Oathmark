/**
 * Input limits mirrored from the intelligent contract so the interface can
 * reject invalid drafts before a transaction is ever submitted. The contract
 * remains the authority; these checks exist for user experience only.
 */
export const LIMITS = {
  maxPledges: 5000,
  maxSources: 4,
  maxClauses: 5,
  maxSourceUrlLength: 512,
  maxSubjectLength: 120,
  maxDomainLength: 253,
  maxClauseLength: 500,
  maxNoteLength: 500,
  maxRightLabelLength: 160,
  minReviewInterval: 300,
  maxReviewInterval: 90 * 24 * 3600,
  maxHistory: 64,
} as const;

export const AUTHORITY_MANIFEST_PATH = "/.well-known/oathmark.json" as const;
export const AUTHORITY_SCHEMA = "oathmark-authority-v1" as const;

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const URL_PATTERN = /^https:\/\/([^/@]+@)?([A-Za-z0-9.-]+)(?::(\d+))?(\/[^\s#]*)?(#.*)?$/;

export function authorityUrlFor(domain: string): string {
  return `https://${domain}${AUTHORITY_MANIFEST_PATH}`;
}

export function normalizeDomain(value: string): string {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (domain.startsWith("https://") || domain.includes("/") || domain.includes(":") || domain.includes("@")) {
    throw new Error("Enter a hostname, not a URL.");
  }
  if (!domain || domain.length > LIMITS.maxDomainLength || !domain.includes(".") || domain.includes("..")) {
    throw new Error("Invalid canonical domain.");
  }
  if (IPV4_PATTERN.test(domain) || domain === "localhost") {
    throw new Error("The canonical domain must be a public hostname.");
  }
  for (const label of domain.split(".")) {
    if (!label || label.length > 63 || label.startsWith("-") || label.endsWith("-") || !/^[a-z0-9-]+$/.test(label)) {
      throw new Error("Invalid canonical domain.");
    }
  }
  return domain;
}

export function normalizeSourceUrl(value: string, canonicalDomain: string): string {
  const raw = value.trim();
  if (!raw || raw.length > LIMITS.maxSourceUrlLength) {
    throw new Error("Invalid source URL.");
  }
  const match = URL_PATTERN.exec(raw);
  if (!match || match[1] || match[5]) {
    throw new Error("Each source must be an absolute HTTPS URL without credentials or a fragment.");
  }
  const port = match[3];
  if (port !== undefined && port !== "443") {
    throw new Error("Source URLs must use the standard HTTPS port.");
  }
  const host = match[2].toLowerCase().replace(/\.$/, "");
  if (IPV4_PATTERN.test(host) || host === "localhost") {
    throw new Error("Each source must use a public hostname.");
  }
  if (host !== canonicalDomain && !host.endsWith(`.${canonicalDomain}`)) {
    throw new Error("Each source must belong to the canonical domain.");
  }
  let path = match[4] || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return `https://${host}${path}`;
}

export function validatePledgeDraft(input: {
  subject: string;
  canonicalDomain: string;
  sourceUrls: string[];
  clauses: string[];
  reviewIntervalSeconds: number;
  beneficiary: string;
  rightLabel: string;
  note: string;
}): { subject: string; domain: string; sources: string[]; clauses: string[]; interval: number } {
  const subject = input.subject.trim();
  if (!subject || subject.length > LIMITS.maxSubjectLength) throw new Error("Invalid subject.");
  const domain = normalizeDomain(input.canonicalDomain);
  if (input.sourceUrls.length < 1 || input.sourceUrls.length > LIMITS.maxSources) {
    throw new Error("Provide between one and four sources.");
  }
  const sources = input.sourceUrls.map((url) => normalizeSourceUrl(url, domain));
  if (new Set(sources).size !== sources.length) throw new Error("Duplicate source URL.");
  if (input.clauses.length < 1 || input.clauses.length > LIMITS.maxClauses) {
    throw new Error("Provide between one and five reliance clauses.");
  }
  const clauses = input.clauses.map((clause) => clause.trim());
  for (const clause of clauses) {
    if (!clause || clause.length > LIMITS.maxClauseLength) throw new Error("Invalid reliance clause.");
  }
  if (new Set(clauses).size !== clauses.length) throw new Error("Duplicate reliance clause.");
  const interval = input.reviewIntervalSeconds;
  if (!Number.isInteger(interval) || interval < LIMITS.minReviewInterval || interval > LIMITS.maxReviewInterval) {
    throw new Error("Review interval outside the allowed range.");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.beneficiary.trim())) throw new Error("Invalid beneficiary address.");
  const rightLabel = input.rightLabel.trim();
  if (!rightLabel || rightLabel.length > LIMITS.maxRightLabelLength) throw new Error("Invalid right label.");
  if (input.note.length > LIMITS.maxNoteLength) throw new Error("Reliance note is too long.");
  return { subject, domain, sources, clauses, interval };
}
