"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getDisputeById } from "@/lib/admin/mock-data";
import { DisputeDetailView } from "@/components/admin/DisputeDetailView";

export default function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticket = getDisputeById(id);
  if (!ticket) notFound();
  return <DisputeDetailView ticket={ticket} />;
}
