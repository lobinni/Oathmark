/**
 * Shared helpers for the live Studionet samples (scripts/live).
 *
 * Read samples need nothing but the committed contract address. Write samples
 * additionally need a funded Studionet private key, supplied through the
 * environment (never committed, never printed):
 *
 *   OATHMARK_SAMPLE_PRIVATE_KEY=0x... npx tsx scripts/live/02-pledge.ts <command>
 *
 * Fund the account from the GenLayer Studio "Accounts" panel (sandbox
 * accounts come pre-funded); the public GenLayer faucet targets a different
 * network and does not work on Studionet.
 */

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CalldataEncodable } from "genlayer-js/types";
import { STUDIONET } from "@/lib/genlayer/network";
import { OATHMARK_CONTRACT_ADDRESS, requireContractAddress } from "@/lib/contract/address";
import { waitForSuccessfulFinality } from "@/lib/contract/finality";
import type { Checkpoint, PledgeRecord, RevisionProposal, RightExercise, Revision } from "@/lib/contract/types";

export const address = requireContractAddress();

/* ------------------------------ CLI parsing ----------------------------- */

export function flagValue(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

export function flagValues(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .filter((arg) => arg.startsWith(prefix))
    .map((arg) => arg.slice(prefix.length));
}

export function flagNumber(name: string, fallback: number): number {
  const raw = flagValue(name);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function positional(index: number): string | null {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  return args[index] ?? null;
}

export function requireFlag(name: string): string {
  const value = flagValue(name);
  if (value === null || value === "") {
    console.error(`missing required flag --${name}=`);
    process.exit(1);
  }
  return value;
}

/* ------------------------------- clients -------------------------------- */

export function readClient() {
  return createClient({ chain: studionet });
}

export function loadAccount() {
  const key = (process.env.OATHMARK_SAMPLE_PRIVATE_KEY ?? process.env.PRIVATE_KEY ?? "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    console.error(
      [
        "A funded Studionet private key is required for writes.",
        "Set OATHMARK_SAMPLE_PRIVATE_KEY=0x<64 hex chars> in your shell (see .env.example).",
        "Fund the account from the GenLayer Studio Accounts panel — the public faucet funds a different network.",
      ].join("\n"),
    );
    process.exit(1);
  }
  return createAccount(key as `0x${string}`);
}

export function writeClient() {
  const account = loadAccount();
  return { client: createClient({ chain: studionet, account }), account };
}

/* ------------------------------ raw access ------------------------------ */

export async function readView<T>(functionName: string, args: CalldataEncodable[]): Promise<T> {
  const raw = await readClient().readContract({ address, functionName, args });
  return raw as T;
}

export async function submitWrite(
  functionName: string,
  args: CalldataEncodable[],
): Promise<{ ok: boolean; hash?: string; message?: string }> {
  const { client } = writeClient();
  const hash = (await client.writeContract({
    address,
    functionName,
    args,
    value: BigInt(0),
  })) as unknown as string;
  console.log(`tx submitted: ${hash}`);
  console.log(`  explorer:   ${STUDIONET.explorerUrl}/tx/${hash}`);
  console.log("  waiting for FINALIZED + MAJORITY_AGREE + successful leader execution…");
  const finality = await waitForSuccessfulFinality(hash);
  if (!finality.ok) {
    return { ok: false, hash, message: finality.message };
  }
  return { ok: true, hash };
}

/* ------------------------------ formatting ------------------------------ */

const line = (label: string, value: unknown) => console.log(`  ${label.padEnd(24)} ${String(value)}`);

export function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

export function printConnection() {
  console.log(`network:   ${STUDIONET.name} (chain ${STUDIONET.id})`);
  console.log(`rpc:       ${STUDIONET.rpcUrl}`);
  console.log(`contract:  ${OATHMARK_CONTRACT_ADDRESS}`);
  console.log(`explorer:  ${STUDIONET.explorerUrl}/address/${OATHMARK_CONTRACT_ADDRESS}`);
}

export function summarizePledge(record: PledgeRecord): string {
  return [
    `#${record.id}`,
    record.lifecycle.padEnd(9),
    record.assessment.padEnd(19),
    record.right_status.padEnd(12),
    `cp:${String(record.checkpoint_count).padStart(2)}`,
    record.canonical_domain.padEnd(28),
    record.subject.slice(0, 42),
  ].join("  ");
}

export function dumpPledge(record: PledgeRecord) {
  printHeader(`pledge #${record.id} — ${record.subject}`);
  line("lifecycle", record.lifecycle);
  line("assessment", record.assessment);
  line("right status", record.right_status);
  line("right label", record.right_label);
  line("canonical domain", record.canonical_domain);
  line("authority url", record.authority_url);
  line("authority verified", record.authority_verified);
  line("creator", record.creator);
  line("beneficiary", record.beneficiary);
  line("review interval (s)", record.review_interval_seconds);
  line("active revision", record.active_revision);
  line("created at", `${record.created_at} (${new Date(record.created_at * 1000).toISOString()})`);
  line("activated at", record.activated_at || "—");
  line("last checkpoint at", record.last_checkpoint_at || "—");
  line("last successful at", record.last_successful_at || "—");
  line("fresh until", record.fresh_until ? `${record.fresh_until} (${new Date(record.fresh_until * 1000).toISOString()})` : "—");
  line("checkpoint count", record.checkpoint_count);
  line("exercise count", record.exercise_count);
  line("sources", "");
  record.source_urls.forEach((url, index) => console.log(`    [${index}] ${url}`));
  line("clauses", "");
  record.clauses.forEach((clause, index) => console.log(`    [${index}] ${clause}`));
  if (record.note) line("note", record.note);
  if (record.last_activation_result) {
    printHeader("last activation result");
    line("outcome", record.last_activation_result.outcome);
    line("reason", record.last_activation_result.reason);
  }
}

export function dumpCheckpoints(checkpoints: Checkpoint[]) {
  printHeader(`checkpoints (${checkpoints.length})`);
  checkpoints.forEach((checkpoint) => {
    line("at", `${checkpoint.at} (${new Date(checkpoint.at * 1000).toISOString()})`);
    line("outcome", checkpoint.outcome);
    line("requester", checkpoint.requester);
    line("revision", checkpoint.revision);
    line("reason", checkpoint.reason);
    checkpoint.clauses.forEach((clause) => {
      console.log(
        `    clause[${clause.index}] ${clause.verdict} (source ${clause.source_index}) ${clause.excerpt ? `“${clause.excerpt.slice(0, 80)}”` : ""}`,
      );
    });
    checkpoint.sources.forEach((source) => {
      console.log(
        `    source[${source.source_index}] ${source.coverage} http:${source.http_status} len:${source.content_length} sha:${source.content_sha256.slice(0, 16)}…`,
      );
    });
    console.log("    ---");
  });
}

export function dumpRevisions(revisions: Revision[]) {
  printHeader(`verified revisions (${revisions.length})`);
  revisions.forEach((revision) => {
    line(`revision ${revision.revision}`, `${revision.outcome} at ${new Date(revision.at * 1000).toISOString()}`);
    line("  digest", revision.policy_digest);
    line("  reason", revision.reason);
  });
}

export function dumpExercises(exercises: RightExercise[]) {
  printHeader(`exercise receipts (${exercises.length})`);
  exercises.forEach((exercise) => {
    line("receipt", exercise.receipt_id);
    line("beneficiary", exercise.beneficiary);
    line("action digest", exercise.action_digest);
    line("at", `${exercise.at} (${new Date(exercise.at * 1000).toISOString()})`);
  });
}

export function dumpProposal(proposal: RevisionProposal | null) {
  printHeader("staged revision proposal");
  if (!proposal) {
    console.log("  none");
    return;
  }
  line("revision", proposal.revision);
  line("proposed at", new Date(proposal.proposed_at * 1000).toISOString());
  line("policy digest", proposal.policy_digest);
  line("review interval (s)", proposal.review_interval_seconds);
  console.log("    sources:", proposal.source_urls.join(", "));
  console.log("    clauses:", proposal.clauses.join(" | "));
}
