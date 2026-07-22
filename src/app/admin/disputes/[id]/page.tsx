import { notFound } from "next/navigation";
import { getDisputeForAdmin } from "@/lib/admin/admin-disputes-store";
import { getDisputeById } from "@/lib/admin/mock-data";
import { DisputeDetailView } from "@/components/admin/DisputeDetailView";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = (await getDisputeForAdmin(id)) ?? getDisputeById(id);
  if (!ticket) notFound();
  return <DisputeDetailView ticket={ticket} />;
}
