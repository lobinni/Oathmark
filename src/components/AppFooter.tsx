import Link from "next/link";
import { STUDIONET } from "@/lib/genlayer/network";

export function AppFooter() {
  return (
    <footer className="o-footer">
      <div className="o-shell o-footer-inner">
        <Link className="o-brand" href="/" aria-label="Oathmark home">
          <span className="o-brand-mark" aria-hidden="true" />
          <strong>Oathmark</strong>
          <span style={{ color: "var(--o-accent)" }}>Promise Ledger</span>
        </Link>
        <div className="o-footer-meta">
          <div>
            Consensus-enforced pledges · <a href={STUDIONET.explorerUrl} target="_blank" rel="noopener noreferrer">{STUDIONET.name}</a>
          </div>
          <div>Chain 61999 · No oracle, no backend, no administrator</div>
        </div>
      </div>
    </footer>
  );
}
