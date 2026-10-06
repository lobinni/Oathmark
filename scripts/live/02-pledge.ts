/**
 * Live sample 02 — exercise every write feature of the Oathmark contract on
 * Studionet (chain 61999).
 *
 * Prerequisites for writes:
 *   - a funded Studionet private key in OATHMARK_SAMPLE_PRIVATE_KEY (see .env.example)
 *   - for activation: the authority manifest published on your domain
 *
 * Usage:
 *
 *   npx tsx scripts/live/02-pledge.ts help
 *
 *   # 1. create a draft (also prints the manifest you must publish)
 *   npx tsx scripts/live/02-pledge.ts create \
 *     --subject="Ninety-day uptime pledge" \
 *     --domain=your-domain.example \
 *     --source=https://your-domain.example/sla \
 *     --clause="The service maintains 99.9 percent monthly uptime." \
 *     --right="Right to claim the uptime credit" \
 *     --interval=3600 [--beneficiary=0x…] [--note="…"]
 *
 *   # 2. print the manifest for an existing pledge (publish it, then activate)
 *   npx tsx scripts/live/02-pledge.ts manifest --id=3 [--out=oathmark.json]
 *
 *   # 3. lifecycle writes
 *   npx tsx scripts/live/02-pledge.ts update --id=3 [--subject=…] [--source=…] [--clause=…] [--interval=…] [--note=…]
 *   npx tsx scripts/live/02-pledge.ts cancel --id=3
 *   npx tsx scripts/live/02-pledge.ts activate --id=3
 *   npx tsx scripts/live/02-pledge.ts checkpoint --id=3
 *   npx tsx scripts/live/02-pledge.ts exercise --id=3 [--digest=64hexchars]
 *   npx tsx scripts/live/02-pledge.ts propose-revision --id=3 --source=… --clause=… [--interval=…] [--note=…]
 *   npx tsx scripts/live/02-pledge.ts activate-revision --id=3
 *   npx tsx scripts/live/02-pledge.ts archive --id=3
 *
 *   # helpers
 *   npx tsx scripts/live/02-pledge.ts digest            # random one-time action digest
 *   npx tsx scripts/live/02-pledge.ts whoami            # show the sample account address
 *
 * Exit codes: 0 success · 1 usage/network error · 2 the write finalized but the
 * contract declined the transition (read the printed reason).
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  readView,
  submitWrite,
  loadAccount,
  requireFlag,
  flagValue,
  flagValues,
  flagNumber,
  positional,
  printHeader,
  printConnection,
} from "./_lib";
import { AUTHORITY_SCHEMA, authorityUrlFor, validatePledgeDraft } from "@/lib/contract/limits";
import { computePolicyDigest } from "@/lib/contract/digest";
import type { Checkpoint, PledgeRecord, RevisionProposal } from "@/lib/contract/types";

const parse = <T>(raw: unknown): T => JSON.parse(String(raw)) as T;

async function getPledge(id: string): Promise<PledgeRecord> {
  return parse<PledgeRecord>(await readView<string>("get_pledge", [id]));
}

function manifestBody(pledge: PledgeRecord, digest: string) {
  return {
    schema: AUTHORITY_SCHEMA,
    canonical_domain: pledge.canonical_domain,
    issuer: pledge.creator,
    beneficiary: pledge.beneficiary,
    policy_digest: digest,
  };
}

async function commandDigest() {
  printHeader("one-time action digest");
  const digest = randomBytes(32).toString("hex");
  console.log(`  ${digest}`);
  console.log("  pass it to: npx tsx scripts/live/02-pledge.ts exercise --id=<pledge> --digest=<value>");
}

async function commandWhoami() {
  const account = loadAccount();
  printHeader("sample account");
  console.log(`  ${account.address}`);
  console.log("  fund it from the GenLayer Studio Accounts panel if a write reports insufficient balance");
}

async function commandCreate() {
  const account = loadAccount();
  const subject = requireFlag("subject");
  const domain = requireFlag("domain");
  const sources = flagValues("source");
  const clauses = flagValues("clause");
  const rightLabel = requireFlag("right");
  const beneficiary = flagValue("beneficiary") ?? account.address;
  const interval = flagNumber("interval", 3600);
  const note = flagValue("note") ?? "";

  const normalized = validatePledgeDraft({
    subject,
    canonicalDomain: domain,
    sourceUrls: sources,
    clauses,
    reviewIntervalSeconds: interval,
    beneficiary,
    rightLabel,
    note,
  });
  const authority = authorityUrlFor(normalized.domain);
  const digest = await computePolicyDigest({
    subject: normalized.subject,
    domain: normalized.domain,
    sources: normalized.sources,
    clauses: normalized.clauses,
    revision: 0,
    beneficiary: beneficiary.trim(),
    rightLabel: rightLabel.trim(),
  });

  printHeader("draft summary");
  console.log(`  subject:     ${normalized.subject}`);
  console.log(`  domain:      ${normalized.domain}`);
  console.log(`  beneficiary: ${beneficiary.trim().toLowerCase()}`);
  console.log(`  interval:    ${normalized.interval}s`);
  console.log(`  authority:   ${authority}`);
  console.log(`  digest:      ${digest}`);
  printHeader("publish this manifest before activation");
  console.log(
    JSON.stringify(
      {
        schema: AUTHORITY_SCHEMA,
        canonical_domain: normalized.domain,
        issuer: account.address.toLowerCase(),
        beneficiary: beneficiary.trim().toLowerCase(),
        policy_digest: digest,
      },
      null,
      2,
    ),
  );

  const result = await submitWrite("create_draft", [
    normalized.subject,
    normalized.domain,
    normalized.sources,
    normalized.clauses,
    authority,
    beneficiary.trim(),
    rightLabel.trim(),
    normalized.interval,
    note,
  ]);
  if (!result.ok) {
    console.error(`create_draft did not succeed: ${result.message}`);
    process.exit(1);
  }
  const ids = await readView<string[]>("list_creator_pledge_ids", [account.address.toLowerCase(), 0, 5]);
  const newId = Array.isArray(ids) && ids.length ? ids[0] : "?";
  console.log(`\ndraft registered as pledge #${newId}`);
  console.log(`next: publish the manifest, then  npx tsx scripts/live/02-pledge.ts activate --id=${newId}`);
}

async function commandManifest() {
  const id = requireFlag("id");
  const pledge = await getPledge(id);
  const proposal = parse<RevisionProposal | null>(await readView<string>("get_revision_proposal", [id]));
  const digest = String(await readView<string>("get_policy_digest", [id]));
  const body = manifestBody(pledge, digest);
  printHeader(`manifest for pledge #${id}${proposal ? " (staged revision digest)" : ""}`);
  const json = JSON.stringify(body, null, 2);
  const out = flagValue("out");
  if (out) {
    writeFileSync(out, json + "\n");
    console.log(`  written to ${out}`);
  }
  console.log(json);
  console.log(`  publish exactly this body at: ${pledge.authority_url}`);
}

async function commandUpdate() {
  const id = requireFlag("id");
  const pledge = await getPledge(id);
  if (pledge.lifecycle !== "DRAFT") {
    console.error("only a draft may be edited");
    process.exit(2);
  }
  const subject = flagValue("subject") ?? pledge.subject;
  const sources = flagValues("source").length ? flagValues("source") : pledge.source_urls;
  const clauses = flagValues("clause").length ? flagValues("clause") : pledge.clauses;
  const interval = flagNumber("interval", pledge.review_interval_seconds);
  const note = flagValue("note") ?? pledge.note;
  const normalized = validatePledgeDraft({
    subject,
    canonicalDomain: pledge.canonical_domain,
    sourceUrls: sources,
    clauses,
    reviewIntervalSeconds: interval,
    beneficiary: pledge.beneficiary,
    rightLabel: pledge.right_label,
    note,
  });
  const result = await submitWrite("update_draft", [
    id,
    normalized.subject,
    normalized.domain,
    normalized.sources,
    normalized.clauses,
    normalized.interval,
    note,
  ]);
  if (!result.ok) {
    console.error(`update_draft did not succeed: ${result.message}`);
    process.exit(1);
  }
  const fresh = await getPledge(id);
  if (fresh.subject === normalized.subject) console.log("draft updated");
  else {
    console.error("state re-read did not confirm the update");
    process.exit(2);
  }
}

async function commandCancel() {
  const id = requireFlag("id");
  const result = await submitWrite("cancel_draft", [id]);
  if (!result.ok) {
    console.error(`cancel_draft did not succeed: ${result.message}`);
    process.exit(1);
  }
  const fresh = await getPledge(id);
  if (fresh.lifecycle !== "CANCELLED") {
    console.error("state re-read did not confirm cancellation");
    process.exit(2);
  }
  console.log(`pledge #${id} cancelled; right closed`);
}

async function commandActivate() {
  const id = requireFlag("id");
  const pledge = await getPledge(id);
  if (pledge.lifecycle !== "DRAFT") {
    console.error(`pledge #${id} is ${pledge.lifecycle}, only drafts activate`);
    process.exit(2);
  }
  const result = await submitWrite("activate_baseline", [id]);
  if (!result.ok) {
    console.error(`activation round failed: ${result.message}`);
    process.exit(1);
  }
  const fresh = await getPledge(id);
  if (fresh.lifecycle === "ACTIVE") {
    console.log(`pledge #${id} is ACTIVE — right ${fresh.right_status}, fresh until ${new Date(fresh.fresh_until * 1000).toISOString()}`);
    return;
  }
  const outcome = fresh.last_activation_result;
  console.error(`activation did not verify the baseline: ${outcome?.outcome ?? "unknown"} — ${outcome?.reason ?? ""}`);
  console.error("check the manifest body and path, fix it, then retry");
  process.exit(2);
}

async function commandCheckpoint() {
  const id = requireFlag("id");
  const pledge = await getPledge(id);
  if (pledge.lifecycle !== "ACTIVE") {
    console.error(`pledge #${id} is ${pledge.lifecycle}, only active pledges accept checkpoints`);
    process.exit(2);
  }
  const base = Math.max(pledge.activated_at, pledge.last_checkpoint_at);
  const nextOpen = base + pledge.review_interval_seconds;
  const now = Math.floor(Date.now() / 1000);
  if (now < nextOpen) {
    console.error(`checkpoint window opens at ${new Date(nextOpen * 1000).toISOString()} (in ${nextOpen - now}s)`);
    process.exit(2);
  }
  const result = await submitWrite("run_checkpoint", [id]);
  if (!result.ok) {
    console.error(`checkpoint round failed: ${result.message}`);
    process.exit(1);
  }
  const fresh = await getPledge(id);
  if (fresh.checkpoint_count !== pledge.checkpoint_count + 1) {
    console.error("state re-read did not confirm the checkpoint");
    process.exit(2);
  }
  console.log(`checkpoint #${fresh.checkpoint_count}: assessment ${fresh.assessment}, right ${fresh.right_status}`);
  const checkpoints = parse<Checkpoint[]>(await readView<string>("get_checkpoints", [id]));
  const latest = checkpoints[checkpoints.length - 1];
  latest.clauses.forEach((clause) => console.log(`  clause[${clause.index}] ${clause.verdict} — ${clause.reason}`));
}

async function commandExercise() {
  const id = requireFlag("id");
  const account = loadAccount();
  const digest = (flagValue("digest") ?? randomBytes(32).toString("hex")).toLowerCase();
  const pledge = await getPledge(id);
  if (pledge.beneficiary !== account.address.toLowerCase()) {
    console.error(`the sample account (${account.address}) is not the beneficiary (${pledge.beneficiary})`);
    process.exit(2);
  }
  const result = await submitWrite("exercise_right", [id, digest]);
  if (!result.ok) {
    console.error(`exercise did not succeed: ${result.message}`);
    process.exit(1);
  }
  const fresh = await getPledge(id);
  if (fresh.exercise_count !== pledge.exercise_count + 1) {
    console.error("state re-read did not confirm the exercise");
    process.exit(2);
  }
  console.log(`right exercised — receipt #${fresh.exercise_count} recorded with digest ${digest.slice(0, 16)}…`);
}

async function commandProposeRevision() {
  const id = requireFlag("id");
  const pledge = await getPledge(id);
  const sources = flagValues("source");
  const clauses = flagValues("clause");
  if (!sources.length || !clauses.length) {
    console.error("propose-revision needs at least one --source= and one --clause=");
    process.exit(1);
  }
  const interval = flagNumber("interval", pledge.review_interval_seconds);
  const note = flagValue("note") ?? pledge.note;
  const normalized = validatePledgeDraft({
    subject: pledge.subject,
    canonicalDomain: pledge.canonical_domain,
    sourceUrls: sources,
    clauses,
    reviewIntervalSeconds: interval,
    beneficiary: pledge.beneficiary,
    rightLabel: pledge.right_label,
    note,
  });
  const result = await submitWrite("propose_revision", [id, normalized.sources, normalized.clauses, normalized.interval, note]);
  if (!result.ok) {
    console.error(`propose_revision did not succeed: ${result.message}`);
    process.exit(1);
  }
  const proposal = parse<RevisionProposal | null>(await readView<string>("get_revision_proposal", [id]));
  if (!proposal) {
    console.error("state re-read did not confirm the staged revision");
    process.exit(2);
  }
  console.log(`revision v${proposal.revision} staged — publish the new manifest, then:`);
  console.log(`  npx tsx scripts/live/02-pledge.ts manifest --id=${id}`);
  console.log(`  npx tsx scripts/live/02-pledge.ts activate-revision --id=${id}`);
}

async function commandActivateRevision() {
  const id = requireFlag("id");
  const pledge = await getPledge(id);
  const result = await submitWrite("activate_revision", [id]);
  if (!result.ok) {
    console.error(`revision verification failed: ${result.message}`);
    process.exit(2);
  }
  const fresh = await getPledge(id);
  if (fresh.active_revision !== pledge.active_revision + 1) {
    console.error("state re-read did not confirm the revision");
    process.exit(2);
  }
  console.log(`revision v${fresh.active_revision} verified and applied — right ${fresh.right_status}`);
}

async function commandArchive() {
  const id = requireFlag("id");
  const result = await submitWrite("archive_pledge", [id]);
  if (!result.ok) {
    console.error(`archive did not succeed: ${result.message}`);
    process.exit(1);
  }
  const fresh = await getPledge(id);
  if (fresh.lifecycle !== "ARCHIVED") {
    console.error("state re-read did not confirm the archive");
    process.exit(2);
  }
  console.log(`pledge #${id} archived; right closed`);
}

const COMMANDS: Record<string, () => Promise<void>> = {
  create: commandCreate,
  manifest: commandManifest,
  update: commandUpdate,
  cancel: commandCancel,
  activate: commandActivate,
  checkpoint: commandCheckpoint,
  exercise: commandExercise,
  "propose-revision": commandProposeRevision,
  "activate-revision": commandActivateRevision,
  archive: commandArchive,
  digest: commandDigest,
  whoami: commandWhoami,
};

async function main() {
  const command = positional(0) ?? "help";
  if (command === "help") {
    const doc = new URL(`file://${__filename}`);
    console.log(`read the header of this file for full usage:\n  ${doc.pathname}`);
    console.log("\ncommands:", Object.keys(COMMANDS).join(", "));
    return;
  }
  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`unknown command "${command}" — ${Object.keys(COMMANDS).join(", ")}`);
    process.exit(1);
  }
  printConnection();
  await handler();
}

main().catch((cause) => {
  console.error("\nsample failed:", (cause as Error)?.message ?? cause);
  process.exit(1);
});
