import Link from "next/link";
import { ArrowDown, PenLine } from "lucide-react";
import { HeroNetwork } from "@/components/HeroNetwork";
import { HeroProof } from "@/components/HeroProof";
import { LedgerIndex } from "@/components/LedgerIndex";

export default function HomePage() {
  return (
    <>
      <section className="o-shell" aria-labelledby="hero-title">
        <div className="o-hero">
          <HeroNetwork />
          <div className="o-hero-copy" style={{ width: "100%" }}>
            <div className="o-kicker">GenLayer Studionet · Chain 61999</div>
            <h1 className="o-hero-title" id="hero-title">
              Promises, held
              <br />
              <em>under oath.</em>
            </h1>
            <p className="o-hero-sub">
              Oathmark binds a public promise to the domain that made it. Validator consensus verifies the pledge,
              watches it over time, and keeps or revokes an enforceable right — no oracle, no backend, no taking
              anyone&apos;s word for it.
            </p>
            <div className="o-hero-actions">
              <a className="o-btn o-btn--accent" href="#ledger">
                <ArrowDown size={14} aria-hidden="true" />
                Open the ledger
              </a>
              <Link className="o-btn o-btn--ghost" href="/compose">
                <PenLine size={14} aria-hidden="true" />
                Record a pledge
              </Link>
            </div>
            <HeroProof />
          </div>
          <div className="o-net" aria-hidden="true" />
          <div className="o-hero-corner-meta">
            <span>Consensus enforcement</span>
            <span>UTC</span>
            <span>Live network</span>
          </div>
        </div>
      </section>

      <section className="o-zone o-shell" id="ledger" aria-labelledby="ledger-title">
        <div className="o-zone-head">
          <div>
            <div className="o-kicker">Public record</div>
            <h2 id="ledger-title">
              The <em>Ledger</em>
            </h2>
            <p>
              Every pledge published here was authorized by its own domain and judged by independent validators.
              Refreshing this page reconstructs the record from contract reads alone.
            </p>
          </div>
        </div>
        <LedgerIndex />
      </section>

      <section className="o-shell" aria-labelledby="lifecycle-title">
        <div className="o-band o-zone" style={{ padding: "110px 0" }}>
          <div className="o-shell" style={{ position: "relative" }}>
            <div className="o-zone-head">
              <div>
                <div className="o-kicker">Authority first</div>
                <h2 id="lifecycle-title">
                  Judged by <em>Consensus</em>
                </h2>
                <p>
                  A wallet signature proves who clicked. Only the canonical domain can prove the promise is theirs —
                  and only validators decide whether the evidence still supports it.
                </p>
              </div>
            </div>
            <div className="o-steps">
              <div className="o-step">
                <small>Phase 01 · Draft</small>
                <h4>Pledge drafted</h4>
                <p>
                  A creator names the subject, the canonical domain, up to four official sources, one to five reliance
                  clauses, a beneficiary, and the named right at stake.
                </p>
              </div>
              <div className="o-step">
                <small>Phase 02 · Authority</small>
                <h4>Domain authorizes</h4>
                <p>
                  The domain publishes a manifest at its well-known path committing to the exact policy digest.
                  Validators fetch it themselves and refuse anything that does not match.
                </p>
              </div>
              <div className="o-step">
                <small>Phase 03 · Baseline</small>
                <h4>Baseline verified</h4>
                <p>
                  Validators read every source in full, confirm each clause is materially supported, and activate the
                  pledge. The beneficiary&apos;s right becomes enforceable.
                </p>
              </div>
              <div className="o-step">
                <small>Phase 04 · Watch</small>
                <h4>Checkpoints enforce</h4>
                <p>
                  Anyone may trigger a checkpoint once each interval. Consensus re-reads the sources and keeps,
                  suspends, or revokes the right — and only the beneficiary may exercise it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="o-zone o-shell" aria-labelledby="verdicts-title">
        <div className="o-zone-head">
          <div>
            <div className="o-kicker">Clause-level judgment</div>
            <h2 id="verdicts-title">
              What consensus <em>decides</em>
            </h2>
            <p>
              Bytes changing is not the question. Validators judge whether the practical meaning of a promise
              survived — and that verdict gates what the contract permits next.
            </p>
          </div>
        </div>
        <div className="o-steps o-steps--light">
          <div className="o-step">
            <small>Outcome · Stable</small>
            <h4>Promise kept</h4>
            <p>All clauses remain materially preserved. Freshness renews and the named right stays enforceable.</p>
          </div>
          <div className="o-step">
            <small>Outcome · Review required</small>
            <h4>Promise narrowed</h4>
            <p>A clause now carries a material limitation. The right suspends until the pledge is revised and re-verified.</p>
          </div>
          <div className="o-step">
            <small>Outcome · Broken</small>
            <h4>Promise abandoned</h4>
            <p>A clause vanished or is contradicted by the official source. Consensus revokes the right outright.</p>
          </div>
          <div className="o-step">
            <small>Outcome · Unavailable</small>
            <h4>Evidence missing</h4>
            <p>Unreachable, oversized, or conflicting evidence fails closed — nothing becomes stable on guesswork.</p>
          </div>
        </div>
      </section>
    </>
  );
}
