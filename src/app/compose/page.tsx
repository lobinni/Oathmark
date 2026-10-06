import { Suspense } from "react";
import { ComposeForm } from "@/components/ComposeForm";

export const metadata = {
  title: "Record a pledge — Oathmark",
  description: "Draft a domain-authorized pledge and submit it to validator consensus.",
};

export default function ComposePage() {
  return (
    <div className="o-page-pad o-shell">
      <div className="o-zone-head">
        <div>
          <div className="o-kicker">Compose</div>
          <h1>
            Record a <em>pledge</em>
          </h1>
          <p>
            Freeze a promise into the ledger: name the subject and domain, bind the exact sources and clauses, and
            choose who may enforce it. Validators do the rest.
          </p>
        </div>
      </div>
      <Suspense fallback={<div className="o-list-state">Preparing…</div>}>
        <ComposeForm />
      </Suspense>
    </div>
  );
}
