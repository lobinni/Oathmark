import { describe, expect, it } from "vitest";
import { canonicalJson, sha256Hex, computePolicyDigest, sameAddress, shortHash, formatInterval } from "@/lib/contract/digest";
import { validatePledgeDraft, normalizeDomain, normalizeSourceUrl, authorityUrlFor } from "@/lib/contract/limits";

describe("sha256Hex", () => {
  it("matches the published empty-string and abc vectors", async () => {
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("canonicalJson", () => {
  it("sorts keys recursively without spaces", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 }, z: ["x", 1] })).toBe('{"a":{"c":3,"d":2},"b":1,"z":["x",1]}');
  });
});

describe("computePolicyDigest", () => {
  it("is deterministic and case-insensitive on the beneficiary", async () => {
    const base = {
      subject: "Refund promise",
      domain: "example.com",
      sources: ["https://example.com/terms"],
      clauses: ["Refunds within thirty days."],
      revision: 0,
      beneficiary: "0x" + "a".repeat(40),
      rightLabel: "Right to a refund",
    };
    const first = await computePolicyDigest(base);
    const second = await computePolicyDigest({ ...base, beneficiary: ("0x" + "A".repeat(40)) as string });
    const third = await computePolicyDigest({ ...base, revision: 1 });
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });
});

describe("input limits", () => {
  it("normalizes domains and URLs", () => {
    expect(normalizeDomain("Example.COM.")).toBe("example.com");
    expect(normalizeSourceUrl("https://example.com/a/", "example.com")).toBe("https://example.com/a");
    expect(authorityUrlFor("example.com")).toBe("https://example.com/.well-known/oathmark.json");
  });
  it("rejects invalid drafts", () => {
    expect(() =>
      validatePledgeDraft({
        subject: "x",
        canonicalDomain: "example.com",
        sourceUrls: ["https://other.com/a"],
        clauses: ["c"],
        reviewIntervalSeconds: 3600,
        beneficiary: "0x" + "b".repeat(40),
        rightLabel: "right",
        note: "",
      }),
    ).toThrow(/canonical domain/i);
  });
  it("accepts a complete draft", () => {
    const result = validatePledgeDraft({
      subject: "Refund promise",
      canonicalDomain: "example.com",
      sourceUrls: ["https://example.com/terms"],
      clauses: ["Refunds within thirty days."],
      reviewIntervalSeconds: 3600,
      beneficiary: "0x" + "b".repeat(40),
      rightLabel: "Right to a refund",
      note: "",
    });
    expect(result.domain).toBe("example.com");
    expect(result.sources).toEqual(["https://example.com/terms"]);
  });
});

describe("sameAddress", () => {
  it("compares checksummed and lowercase forms as equal (EIP-55)", () => {
    const lower = "0x" + "ab".repeat(20);
    const mixed = "0x" + "Ab".repeat(20);
    expect(sameAddress(lower, mixed)).toBe(true);
    expect(sameAddress(mixed, lower)).toBe(true);
  });
  it("rejects different or missing addresses", () => {
    expect(sameAddress("0x" + "ab".repeat(20), "0x" + "cd".repeat(20))).toBe(false);
    expect(sameAddress(null, "0x" + "ab".repeat(20))).toBe(false);
    expect(sameAddress("0x" + "ab".repeat(20), undefined)).toBe(false);
  });
});

describe("formatting helpers", () => {
  it("shortens hashes and formats intervals", () => {
    expect(shortHash("abcdef0123456789abcdef0123456789")).toContain("…");
    expect(formatInterval(3600)).toBe("1 hours");
    expect(formatInterval(86400)).toBe("1 days");
  });
});
