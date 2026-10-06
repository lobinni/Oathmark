import type { CSSProperties } from "react";
import { Scale, ShieldCheck, FileSearch, Landmark, ScrollText, Stamp, Eye, Gavel, type LucideIcon } from "lucide-react";

/**
 * Ambient network illustration: validator-style nodes drifting over dashed
 * consensus paths inside the hero.
 */
type NetNode = {
  Icon: LucideIcon;
  style: CSSProperties;
  size: number;
  delay: string;
  info?: { name: string; line: string };
  left?: boolean;
  tone?: "warn" | "muted";
};

const NODES: NetNode[] = [
  { Icon: ShieldCheck, style: { top: "16%", left: "7%" }, size: 58, delay: "0s", info: { name: "Refund window", line: "Clause preserved" } },
  { Icon: Scale, style: { top: "62%", left: "12%" }, size: 50, delay: "1.2s" },
  { Icon: FileSearch, style: { top: "34%", left: "19%" }, size: 46, delay: "2.1s", tone: "warn" },
  { Icon: Landmark, style: { top: "78%", left: "26%" }, size: 54, delay: "0.6s", info: { name: "Service terms", line: "Right enforceable" }, left: true },
  { Icon: ScrollText, style: { top: "14%", right: "9%" }, size: 56, delay: "1.8s" },
  { Icon: Stamp, style: { top: "58%", right: "14%" }, size: 48, delay: "0.9s", info: { name: "Privacy pledge", line: "Checkpoint stable" } },
  { Icon: Eye, style: { top: "30%", right: "24%" }, size: 44, delay: "2.6s", tone: "muted" },
  { Icon: Gavel, style: { top: "74%", right: "27%" }, size: 52, delay: "1.5s" },
];

export function HeroNetwork() {
  return (
    <div className="o-net" aria-hidden="true">
      <svg className="o-net-paths" viewBox="0 0 1200 680" preserveAspectRatio="none">
        <path d="M76 92 C205 150 128 262 226 324 S104 523 204 607" />
        <path d="M1124 108 C1005 164 1088 260 984 334 S1106 502 1002 596" />
      </svg>
      {NODES.map(({ Icon, style, size, delay, info, left, tone }, index) => (
        <div
          key={index}
          className={`o-net-node${tone === "warn" ? " is-warn" : ""}${tone === "muted" ? " is-muted" : ""}${left ? " info-left" : ""}`}
          style={{ ...style, ["--node-size" as string]: `${size}px`, ["--node-delay" as string]: delay }}
        >
          <Icon size={Math.round(size * 0.42)} strokeWidth={1.6} />
          {info ? (
            <span className="o-net-info">
              <strong>{info.name}</strong>
              <small>{info.line}</small>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
