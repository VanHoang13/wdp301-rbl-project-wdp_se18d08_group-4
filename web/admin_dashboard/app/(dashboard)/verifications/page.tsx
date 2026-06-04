export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getPendingProviders } from "@/lib/queries/verifications";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VerificationStatus } from "@/lib/types";
import { VerificationsClient } from "./verifications-client";

type SearchParams = Promise<{
  tab?: string;
  page?: string;
}>;

async function VerificationsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = (params.tab ?? "pending") as VerificationStatus;
  const page = Number(params.page ?? 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, meta, error } = await getPendingProviders({
    page,
    pageSize: 20,
    status: tab,
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
    <VerificationsClient
      providers={data}
      meta={meta}
      activeTab={tab}
      adminId={user?.id ?? ""}
    />
  );
}

function VerificationsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {/* Tab skeleton */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-9 w-28 rounded-lg"
            style={{ backgroundColor: "var(--border)" }}
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="h-12" style={{ backgroundColor: "var(--surface)" }} />
        {[1, 2, 3, 4, 5].map((i) => (
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

export default function VerificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Xác minh Nhà vận chuyển"
        description="Duyệt hoặc từ chối hồ sơ đăng ký nhà vận chuyển"
      />
      <Suspense fallback={<VerificationsSkeleton />}>
        <VerificationsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
