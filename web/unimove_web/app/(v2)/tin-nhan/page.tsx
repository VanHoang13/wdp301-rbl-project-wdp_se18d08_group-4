"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import { Container } from "@/components/layout/Container";
import { OrderChatWorkspace } from "@/components/chat/OrderChatWorkspace";
import { Skeleton } from "@/components/ui/skeleton";

function TinNhanContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const withName = searchParams.get("with");
  const listingId = searchParams.get("listingId");
  const buyerIdParam = searchParams.get("buyerId");
  const inboxCategory =
    searchParams.get("tab") === "pass-do" ? "pass-do" : "chuyen-tro";
  const me = getStoredUser()?.id ?? "";
  const buyerId = buyerIdParam ?? (listingId ? me : null);

  return (
    <Container className="py-4">
      <OrderChatWorkspace
        initialOrderId={orderId}
        initialWithName={withName}
        initialListingId={listingId}
        initialBuyerId={buyerId}
        initialTab="messages"
        initialInboxCategory={inboxCategory}
        enableInboxCategoryTabs
        enableNotificationsTab={false}
        className="h-[calc(100vh-68px-2rem)] min-h-[560px]"
      />
    </Container>
  );
}

export default function TinNhanPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-4">
          <Skeleton className="h-[calc(100vh-68px-2rem)] min-h-[560px] rounded-2xl" />
        </Container>
      }
    >
      <TinNhanContent />
    </Suspense>
  );
}
