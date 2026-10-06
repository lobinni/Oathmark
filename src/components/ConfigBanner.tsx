import { OctagonAlert } from "lucide-react";
import { isContractConfigured } from "@/lib/contract/address";

/**
 * Shown wherever on-chain data would appear before a finalized contract
 * address is configured for this deployment of the interface.
 */
export function ConfigBanner() {
  if (isContractConfigured()) return null;
  return (
    <div className="o-config-banner" role="note">
      <OctagonAlert size={16} aria-hidden="true" />
      <span>
        This interface is not linked to a live contract yet. Once the operator links a finalized Studionet deployment
        in the project configuration and redeploys, the ledger goes live with no other change. See the deployment guide
        in the project documentation.
      </span>
    </div>
  );
}
