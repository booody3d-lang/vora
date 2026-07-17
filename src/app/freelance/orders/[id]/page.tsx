import { OrderWorkspace } from "@/components/freelance/orders/OrderWorkspace";
import { DEMO_ORDER, DEMO_ORDER_MESSAGES } from "@/lib/freelance/mock-data";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  return (
    <OrderWorkspace
      initialOrder={{ ...DEMO_ORDER, id }}
      initialMessages={DEMO_ORDER_MESSAGES}
      isBuyer
    />
  );
}
