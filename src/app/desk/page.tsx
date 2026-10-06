import { DeskClient } from "@/components/DeskClient";

export const metadata = {
  title: "Creator desk — Oathmark",
  description: "Every pledge you created, loaded from the contract.",
};

export default function DeskPage() {
  return (
    <div className="o-page-pad o-shell">
      <div className="o-zone-head">
        <div>
          <div className="o-kicker">Creator desk</div>
          <h1>
            Your <em>pledges</em>
          </h1>
          <p>
            Records you created, in reverse order. Open any record to activate its baseline, run checkpoints, stage a
            revision, or archive it.
          </p>
        </div>
      </div>
      <DeskClient />
    </div>
  );
}
