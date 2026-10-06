"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isContractConfigured } from "@/lib/contract/address";
import { listPledgeIds, readPledge } from "@/lib/contract/adapter";
import type { PledgeRecord } from "@/lib/contract/types";
import { effectiveAssessment } from "./StatusSeal";
import { RecordCard } from "./RecordCard";
import { ConfigBanner } from "./ConfigBanner";

const PAGE_SIZE = 24;

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "ACTIVE", label: "Active" },
  { key: "STABLE", label: "Stable" },
  { key: "ATTENTION", label: "Review" },
  { key: "BROKEN", label: "Broken" },
  { key: "CLOSED", label: "Closed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matches(record: PledgeRecord, filter: FilterKey): boolean {
  const assessment = effectiveAssessment(record);
  switch (filter) {
    case "ALL":
      return true;
    case "DRAFT":
      return record.lifecycle === "DRAFT";
    case "ACTIVE":
      return record.lifecycle === "ACTIVE";
    case "STABLE":
      return record.lifecycle === "ACTIVE" && assessment === "STABLE";
    case "ATTENTION":
      return record.lifecycle === "ACTIVE" && ["REVIEW_REQUIRED", "SOURCE_UNAVAILABLE", "INCONCLUSIVE", "EXPIRED", "UNCHECKED"].includes(assessment);
    case "BROKEN":
      return record.lifecycle === "ACTIVE" && assessment === "BROKEN";
    case "CLOSED":
      return record.lifecycle === "CANCELLED" || record.lifecycle === "ARCHIVED";
  }
}

export function LedgerIndex() {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [records, setRecords] = useState<PledgeRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isContractConfigured()) return;
    setError(null);
    try {
      const ids = await listPledgeIds(0, PAGE_SIZE);
      const loaded = await Promise.all(ids.map((id) => readPledge(id)));
      setRecords(loaded);
    } catch (cause) {
      setError((cause as Error)?.message ?? "The ledger could not be reached.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => (records ?? []).filter((record) => matches(record, filter)), [records, filter]);

  if (!isContractConfigured()) {
    return (
      <div className="o-detail-stack">
        <ConfigBanner />
        <div className="o-list-state">
          The promise ledger is ready to receive pledges.
          <span style={{ color: "var(--o-faint)" }}>Connect a finalized Studionet deployment to make it live.</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="o-list-state">
        <span>{error}</span>
        <button className="o-btn o-btn--ghost" type="button" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (records === null) {
    return (
      <div className="o-list-state">
        <LoaderCircle size={30} className="o-spin" style={{ color: "var(--o-accent-dark)" }} aria-hidden="true" />
        Reading the ledger…
      </div>
    );
  }

  return (
    <div className="o-detail-stack">
      <div className="o-filter-row" aria-label="Ledger filters">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`o-filter-button${filter === item.key ? " is-active" : ""}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="o-list-state">No pledges match this view yet.</div>
      ) : (
        <div className="o-card-grid">
          {visible.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
