import Link from "next/link";
import { ArrowUpRight, Globe, TimerReset, History } from "lucide-react";
import type { PledgeRecord } from "@/lib/contract/types";
import { StatusSeal, effectiveAssessment, effectiveRight } from "./StatusSeal";
import { formatInterval, shortAddress } from "@/lib/contract/digest";

export function RecordCard({ record }: { record: PledgeRecord }) {
  const assessment = effectiveAssessment(record);
  const right = effectiveRight(record);

  return (
    <Link href={`/record/${record.id}`} className="o-card" aria-label={`Pledge ${record.id}: ${record.subject}`}>
      <div className="o-card-head">
        <StatusSeal status={record.lifecycle === "ACTIVE" ? assessment : record.lifecycle} />
        <StatusSeal status={right} />
      </div>
      <h3>{record.subject}</h3>
      <p>{record.right_label}</p>
      <div className="o-card-meta">
        <span className="o-chip">
          <Globe size={11} aria-hidden="true" />
          {record.canonical_domain}
        </span>
        <span className="o-chip">
          <TimerReset size={11} aria-hidden="true" />
          {formatInterval(record.review_interval_seconds)}
        </span>
        <span className="o-chip">
          <History size={11} aria-hidden="true" />
          {record.checkpoint_count} checkpoints
        </span>
      </div>
      <div className="o-card-foot">
        <span className="o-mono">
          Pledge #{record.id} · {shortAddress(record.creator)}
        </span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}
