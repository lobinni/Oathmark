import { createReadClient, createWriteClient } from "@/lib/genlayer/client";
import type { CalldataEncodable } from "genlayer-js/types";
import type { Eip1193Provider } from "@/lib/wallet/types";
import { requireContractAddress } from "./address";
import type {
  Checkpoint,
  PledgeInput,
  PledgeRecord,
  Revision,
  RevisionProposal,
  RightExercise,
} from "./types";

const parse = <T>(value: unknown): T => JSON.parse(String(value)) as T;

/* ------------------------------- reads ---------------------------------- */

export async function readPledge(id: string): Promise<PledgeRecord> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_pledge",
    args: [id],
  });
  return parse<PledgeRecord>(raw);
}

export async function readRevisions(id: string): Promise<Revision[]> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_revisions",
    args: [id],
  });
  return parse<Revision[]>(raw);
}

export async function readCheckpoints(id: string): Promise<Checkpoint[]> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_checkpoints",
    args: [id],
  });
  return parse<Checkpoint[]>(raw);
}

export async function readExercises(id: string): Promise<RightExercise[]> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_exercises",
    args: [id],
  });
  return parse<RightExercise[]>(raw);
}

export async function readPolicyDigest(id: string): Promise<string> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_policy_digest",
    args: [id],
  });
  return String(raw);
}

export async function readRevisionProposal(id: string): Promise<RevisionProposal | null> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_revision_proposal",
    args: [id],
  });
  return parse<RevisionProposal | null>(raw);
}

export async function listPledgeIds(offset = 0, limit = 24): Promise<string[]> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "list_pledge_ids",
    args: [offset, limit],
  });
  return raw as string[];
}

export async function listCreatorPledgeIds(creator: string, offset = 0, limit = 50): Promise<string[]> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "list_creator_pledge_ids",
    args: [creator, offset, limit],
  });
  return raw as string[];
}

export async function readNextPledgeId(): Promise<number> {
  const raw = await createReadClient().readContract({
    address: requireContractAddress(),
    functionName: "get_next_pledge_id",
    args: [],
  });
  return Number(raw);
}

/* ------------------------------- writes --------------------------------- */

async function write(
  account: `0x${string}`,
  provider: Eip1193Provider,
  functionName: string,
  args: CalldataEncodable[],
): Promise<string> {
  return (await createWriteClient(account, provider).writeContract({
    address: requireContractAddress(),
    functionName,
    args,
    value: BigInt(0),
  })) as unknown as string;
}

export const submitCreateDraft = (account: `0x${string}`, provider: Eip1193Provider, input: PledgeInput) =>
  write(account, provider, "create_draft", [
    input.subject,
    input.canonicalDomain,
    input.sourceUrls,
    input.clauses,
    input.authorityUrl,
    input.beneficiary,
    input.rightLabel,
    input.reviewIntervalSeconds,
    input.note,
  ]);

export const submitUpdateDraft = (
  account: `0x${string}`,
  provider: Eip1193Provider,
  id: string,
  input: Pick<PledgeInput, "subject" | "canonicalDomain" | "sourceUrls" | "clauses" | "reviewIntervalSeconds" | "note">,
) =>
  write(account, provider, "update_draft", [
    id,
    input.subject,
    input.canonicalDomain,
    input.sourceUrls,
    input.clauses,
    input.reviewIntervalSeconds,
    input.note,
  ]);

export const submitCancelDraft = (account: `0x${string}`, provider: Eip1193Provider, id: string) =>
  write(account, provider, "cancel_draft", [id]);

export const submitActivateBaseline = (account: `0x${string}`, provider: Eip1193Provider, id: string) =>
  write(account, provider, "activate_baseline", [id]);

export const submitCheckpoint = (account: `0x${string}`, provider: Eip1193Provider, id: string) =>
  write(account, provider, "run_checkpoint", [id]);

export const submitArchive = (account: `0x${string}`, provider: Eip1193Provider, id: string) =>
  write(account, provider, "archive_pledge", [id]);

export const submitProposeRevision = (
  account: `0x${string}`,
  provider: Eip1193Provider,
  id: string,
  input: Pick<PledgeInput, "sourceUrls" | "clauses" | "reviewIntervalSeconds" | "note">,
) => write(account, provider, "propose_revision", [id, input.sourceUrls, input.clauses, input.reviewIntervalSeconds, input.note]);

export const submitActivateRevision = (account: `0x${string}`, provider: Eip1193Provider, id: string) =>
  write(account, provider, "activate_revision", [id]);

export const submitExerciseRight = (
  account: `0x${string}`,
  provider: Eip1193Provider,
  id: string,
  actionDigest: string,
) => write(account, provider, "exercise_right", [id, actionDigest]);
