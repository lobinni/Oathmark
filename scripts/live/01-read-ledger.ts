/**
 * Live sample 01 — read the Oathmark ledger on Studionet.
 *
 * Read-only: needs no wallet, no key, no GEN. Usage:
 *
 *   npx tsx scripts/live/01-read-ledger.ts                 # connection + recent pledges
 *   npx tsx scripts/live/01-read-ledger.ts --limit=5       # newest 5 pledges
 *   npx tsx scripts/live/01-read-ledger.ts --id=1          # full dump of pledge #1
 *   npx tsx scripts/live/01-read-ledger.ts --creator=0x…   # pledges by one creator
 */

import {
  readView,
  printConnection,
  printHeader,
  summarizePledge,
  dumpPledge,
  dumpCheckpoints,
  dumpRevisions,
  dumpExercises,
  dumpProposal,
  flagValue,
  flagNumber,
} from "./_lib";
import type { Checkpoint, PledgeRecord, RevisionProposal, RightExercise, Revision } from "@/lib/contract/types";

const parse = <T>(raw: unknown): T => JSON.parse(String(raw)) as T;

async function main() {
  printHeader("connection");
  printConnection();

  const nextId = await readView<number>("get_next_pledge_id", []);
  console.log(`\npledges issued so far: ${Math.max(0, nextId - 1)}`);

  const pledgeId = flagValue("id");
  const creator = flagValue("creator");

  if (creator) {
    printHeader(`pledges by ${creator}`);
    const ids = await readView<string[]>("list_creator_pledge_ids", [creator, 0, 100]);
    if (ids.length === 0) console.log("  none");
    for (const id of ids) {
      const record = parse<PledgeRecord>(await readView<string>("get_pledge", [id]));
      console.log("  " + summarizePledge(record));
    }
    return;
  }

  if (pledgeId) {
    const record = parse<PledgeRecord>(await readView<string>("get_pledge", [pledgeId]));
    dumpPledge(record);

    const checkpoints = parse<Checkpoint[]>(await readView<string>("get_checkpoints", [pledgeId]));
    dumpCheckpoints(checkpoints);

    const revisions = parse<Revision[]>(await readView<string>("get_revisions", [pledgeId]));
    dumpRevisions(revisions);

    const exercises = parse<RightExercise[]>(await readView<string>("get_exercises", [pledgeId]));
    dumpExercises(exercises);

    const proposal = parse<RevisionProposal | null>(await readView<string>("get_revision_proposal", [pledgeId]));
    dumpProposal(proposal);

    const digest = await readView<string>("get_policy_digest", [pledgeId]);
    printHeader("current policy digest");
    console.log(`  ${digest}`);
    return;
  }

  const limit = flagNumber("limit", 10);
  printHeader(`newest pledges (up to ${limit})`);
  const ids = await readView<string[]>("list_pledge_ids", [0, limit]);
  if (ids.length === 0) {
    console.log("  the ledger is empty — create the first pledge with scripts/live/02-pledge.ts");
    return;
  }
  for (const id of ids) {
    const record = parse<PledgeRecord>(await readView<string>("get_pledge", [id]));
    console.log("  " + summarizePledge(record));
  }
}

main().catch((cause) => {
  console.error("\nread sample failed:", (cause as Error)?.message ?? cause);
  process.exit(1);
});
