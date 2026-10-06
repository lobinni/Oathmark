import { STUDIONET } from "@/lib/genlayer/network";
import { OATHMARK_CONTRACT_ADDRESS, isContractConfigured } from "@/lib/contract/address";

export const dynamic = "force-dynamic";

/**
 * Liveness for hosting platforms. The database check only runs when a
 * database is provisioned for this deployment; Oathmark itself needs none.
 */
export async function GET() {
  let database: "ok" | "skipped" | "error" = "skipped";
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("@/db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "error";
    }
  }
  const ok = database !== "error";
  return Response.json(
    {
      ok,
      database,
      network: { chainId: STUDIONET.id },
      contract: isContractConfigured() ? OATHMARK_CONTRACT_ADDRESS : null,
    },
    { status: ok ? 200 : 500 },
  );
}
