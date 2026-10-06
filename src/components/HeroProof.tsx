"use client";

import { useEffect, useState } from "react";
import { isContractConfigured } from "@/lib/contract/address";
import { readNextPledgeId } from "@/lib/contract/adapter";

export function HeroProof() {
  const [pledgeCount, setPledgeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isContractConfigured()) return;
    let cancelled = false;
    readNextPledgeId()
      .then((next) => {
        if (!cancelled) setPledgeCount(Math.max(0, next - 1));
      })
      .catch(() => {
        if (!cancelled) setPledgeCount(-1);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="o-hero-proof" aria-label="Platform status">
      <span className="is-live">
        <i />
        {isContractConfigured()
          ? pledgeCount === null
            ? "Reading the ledger…"
            : pledgeCount < 0
              ? "Live on Studionet"
              : `${pledgeCount} pledge${pledgeCount === 1 ? "" : "s"} on record`
          : "Awaiting deployment"}
      </span>
      <span>
        <i />
        Validator-enforced rights
      </span>
      <span>
        <i />
        Studionet · Chain 61999
      </span>
    </div>
  );
}
