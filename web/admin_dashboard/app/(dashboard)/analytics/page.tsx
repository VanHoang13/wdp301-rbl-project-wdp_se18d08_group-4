export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { TrendingUp, BarChart2, DollarSign, Package, CheckCircle, XCircle } from "lucide-react";
import { Star } from "lucide-react";

import {
  getOrderStatistics,
  getTopProviders,
  getPlatformCommissionByMonth,
  getGMVStats,
} from "@/lib/queries/analytics";
import { getRevenueByMonth } from "@/lib/queries/dashboard";
import { formatVND, formatRating, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";

import { AnalyticsChartsClient } from "./analytics-charts-client";

// ---------------------------------------------------------------------------
// Star Rating (server-safe, no client needed)
// ---------------------------------------------------------------------------

function StarRating({ rating, max = 5 }: { rating: number | null; max?: number }) {
  const val = Math.round(rating ?? 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn("w-3.5 h-3.5", i < val ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-gray-300")}
        />
      ))}
      <span className="ml-1 text-xs" style={{ color: "var(--muted)" }}>
        {formatRating(rating)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top Providers Table
// ---------------------------------------------------------------------------

type ProviderRow = {
  id: string;
  full_name: string;
  business_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  total_reviews: number;
  total_orders: number;
  completed_orders?: number;
};

async function TopProvidersSection() {
  const providers = (await getTopProviders(10)) as ProviderRow[];

  return (
    <div
      className="rounded-2xl shadow-sm overflow-hidden"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Top 10 Nhà vận chuyển
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Xếp hạng theo điểm đánh giá
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
          Chưa có dữ liệu nhà vận chuyển.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Hạng", "Nhà vận chuyển", "Tên doanh nghiệp", "Đánh giá", "Tổng đơn", "Hoàn thành"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  className="transition-colors hover:bg-[var(--primary-tint)]/30"
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                        idx === 0 ? "bg-yellow-100 text-yellow-700" :
                        idx === 1 ? "bg-slate-100 text-slate-600" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "text-[var(--muted)]"
                      )}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  {/* Avatar + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 overflow-hidden"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                        ) : (
                          (p.full_name ?? "?")[0].toUpperCase()
                        )}
                      </div>
                      <span className="font-medium" style={{ color: "var(--text)" }}>{p.full_name}</span>
                    </div>
                  </td>

                  {/* Business name */}
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {p.business_name ?? "—"}
                  </td>

                  {/* Rating */}
                  <td className="px-4 py-3">
                    <StarRating rating={p.rating} />
                  </td>

                  {/* Total orders */}
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                    {p.total_orders.toLocaleString("vi-VN")}
                  </td>

                  {/* Completed */}
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {p.completed_orders != null ? p.completed_orders.toLocaleString("vi-VN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order Stats Summary
// ---------------------------------------------------------------------------

type OrderStats = {
  total_orders: number;
  completed_count: number;
  cancelled_count: number;
  total_revenue: number;
  average_order_value: number;
  completion_rate: number;
} | null;

async function OrderStatsSection() {
  const stats = (await getOrderStatistics()) as OrderStats;

  const cards = [
    {
      title: "Tổng đơn hàng",
      value: stats?.total_orders.toLocaleString("vi-VN") ?? "—",
      icon: Package,
      iconBg: "var(--primary-tint)",
      iconColor: "var(--primary)",
    },
    {
      title: "Hoàn thành",
      value: stats?.completed_count.toLocaleString("vi-VN") ?? "—",
      icon: CheckCircle,
      iconBg: "#DCFCE7",
      iconColor: "#16A34A",
    },
    {
      title: "Đã hủy",
      value: stats?.cancelled_count.toLocaleString("vi-VN") ?? "—",
      icon: XCircle,
      iconBg: "#FEE2E2",
      iconColor: "#DC2626",
    },
    {
      title: "Tỷ lệ hoàn thành",
      value: formatPercent(stats?.completion_rate),
      icon: TrendingUp,
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
    },
    {
      title: "Giá trị đơn trung bình",
      value: formatVND(stats?.average_order_value),
      icon: DollarSign,
      iconBg: "var(--primary-tint)",
      iconColor: "var(--primary)",
    },
  ];

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Tổng kết đơn hàng</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Thống kê toàn bộ đơn hàng trên nền tảng</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <StatCard
            key={c.title}
            title={c.title}
            value={c.value}
            icon={c.icon}
            iconBg={c.iconBg}
            iconColor={c.iconColor}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GMV Stats Section
// ---------------------------------------------------------------------------

async function GMVStatsSection() {
  const gmv = await getGMVStats();
  const commission = await getPlatformCommissionByMonth(1);
  const thisMonthCommission = commission.reduce((s, r) => s + r.commission, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="GMV tháng này"
        value={formatVND(gmv.thisGMV)}
        icon={DollarSign}
        iconBg="var(--primary-tint)"
        iconColor="var(--primary)"
      />
      <StatCard
        title="Tăng trưởng so tháng trước"
        value={formatPercent(gmv.growth)}
        delta={gmv.growth}
        deltaLabel="so tháng trước"
        icon={TrendingUp}
        iconBg="#DCFCE7"
        iconColor="#16A34A"
      />
      <StatCard
        title="Hoa hồng nền tảng"
        value={formatVND(thisMonthCommission)}
        icon={BarChart2}
        iconBg="#FEF3C7"
        iconColor="#D97706"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl animate-pulse"
          style={{ height: 80, backgroundColor: "var(--border)", opacity: 0.4 }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component, hands chart data to client
// ---------------------------------------------------------------------------

async function ChartsSection() {
  const [revenueData, commissionData] = await Promise.all([
    getRevenueByMonth(12),
    getPlatformCommissionByMonth(6),
  ]);

  return <AnalyticsChartsClient revenueData={revenueData} commissionData={commissionData} />;
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Phân tích & Báo cáo"
        description="Theo dõi hiệu suất kinh doanh và xu hướng tăng trưởng"
      />

      {/* GMV Stats Row */}
      <Suspense fallback={<SectionSkeleton rows={1} />}>
        <GMVStatsSection />
      </Suspense>

      {/* Charts */}
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <ChartsSection />
      </Suspense>

      {/* Top Providers */}
      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <TopProvidersSection />
      </Suspense>

      {/* Order Stats */}
      <Suspense fallback={<SectionSkeleton rows={1} />}>
        <OrderStatsSection />
      </Suspense>
    </div>
  );
}
