export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getOrders } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import type { OrderStatus } from "@/lib/types";
import { OrdersClient } from "./orders-client";

type SearchParams = Promise<{
  status?: string;
  search?: string;
  page?: string;
}>;

async function OrdersContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status as OrderStatus | undefined;
  const search = params.search;
  const page = Number(params.page ?? 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, meta, error } = await getOrders({
    page,
    pageSize: 20,
    status: status || undefined,
    search: search || undefined,
  });

  if (error) {
    return (
      <div
        className="rounded-xl p-4 text-sm"
        style={{ backgroundColor: "var(--card)", color: "var(--muted)", border: "1px solid var(--border)" }}
      >
        Lỗi tải dữ liệu: {error.message}
      </div>
    );
  }

  return (
    <OrdersClient
      orders={data as any[]}
      meta={meta}
      activeStatus={status}
      currentSearch={search ?? ""}
      adminId={user?.id ?? ""}
    />
  );
}

function OrdersSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-48 rounded-xl" style={{ backgroundColor: "var(--border)" }} />
        <div className="h-10 w-64 rounded-xl" style={{ backgroundColor: "var(--border)" }} />
      </div>
      {/* Table skeleton */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="h-12" style={{ backgroundColor: "var(--surface)" }} />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-16 border-t"
            style={{ borderColor: "var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Quản lý Đơn hàng"
        description="Xem và quản lý tất cả đơn hàng trên hệ thống"
      />
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
