/**
 * Deterministic digests shared by the interface and the contract. The
 * policy digest binds subject, domain, ordered sources and clauses, revision,
 * beneficiary and right label into the well-known authority manifest.
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${entries.join(",")}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computePolicyDigest(input: {
  subject: string;
  domain: string;
  sources: string[];
  clauses: string[];
  revision: number;
  beneficiary: string;
  rightLabel: string;
}): Promise<string> {
  return sha256Hex(
    canonicalJson({
      beneficiary: input.beneficiary.trim().toLowerCase(),
      clauses: input.clauses,
      domain: input.domain,
      revision: input.revision,
      right_label: input.rightLabel,
      sources: input.sources,
      subject: input.subject,
    }),
  );
}

/** Random 32-byte hex digest a beneficiary commits to an exercised right. */
export function randomActionDigest(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Case-insensitive address comparison (wallet senders may be checksummed). */
export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead + 2)}…${address.slice(-tail)}`;
}

export function shortHash(hash: string, lead = 10, tail = 8): string {
  if (hash.length <= lead + tail + 1) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}

export function formatTimestamp(seconds: number): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function formatInterval(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(seconds % 3600 === 0 ? 0 : 1)} hours`;
  return `${(seconds / 86400).toFixed(seconds % 86400 === 0 ? 0 : 1)} days`;
}
