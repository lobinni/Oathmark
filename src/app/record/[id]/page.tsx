import { RecordDetail } from "@/components/RecordDetail";

export const metadata = {
  title: "Pledge record — Oathmark",
};

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="o-page-pad o-shell">
      <RecordDetail id={id} />
    </div>
  );
}
