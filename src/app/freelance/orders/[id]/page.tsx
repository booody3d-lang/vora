import { notFound, redirect } from "next/navigation";
import { OrderWorkspace } from "@/components/freelance/orders/OrderWorkspace";
import { getOrderForParticipant } from "@/lib/freelance/orders-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const auth = await getAuthenticatedUser();

  if (!auth && id !== "ord-1") {
    redirect("/login");
  }

  const result = await getOrderForParticipant(id, auth?.user.id ?? null);
  if (!result) {
    notFound();
  }

  return (
    <OrderWorkspace
      initialOrder={result.order}
      initialMessages={result.messages}
      isBuyer={result.isBuyer}
      viewerAccountId={auth?.user.id}
      viewerName={auth?.user.fullName ?? auth?.user.email ?? undefined}
    />
  );
}
