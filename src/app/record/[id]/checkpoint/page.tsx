import { CheckpointPanel } from "@/components/CheckpointPanel";

export const metadata = {
  title: "Run a checkpoint — Oathmark",
};

export default async function CheckpointPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="o-page-pad o-shell">
      <CheckpointPanel id={id} />
    </div>
  );
}
