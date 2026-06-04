export const dynamic = "force-dynamic";
import { Suspense } from "react";
import Link from "next/link";
import {
  DollarSign,
  Package,
  Users,
  ShieldCheck,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

import {
  getAdminDashboardStats,
  getRevenueByMonth,
  getOrderStatusDistribution,
  getLatestOrders,
} from "@/lib/queries/dashboard";
import { formatVND, formatDateTime, formatOrderNumber } from "@/lib/formatters";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

import { RevenueChart } from "./revenue-chart";
import { OrderDonutChart } from "./order-donut-chart";
import { OrdersTableClient } from "./orders-table-client";

/* ─────────────────────────────────────────────────────────────────────────────
   Skeleton placeholders
───────────────────────────────────────────────────────────────────────────── */

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCard
          key={i}
          title=""
          value=""
          icon={DollarSign}
          loading
        />
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl"
      style={{
        height,
        backgroundColor: "var(--border)",
        opacity: 0.5,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stat Cards Section (server)
───────────────────────────────────────────────────────────────────────────── */

async function StatCardsSection() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Doanh thu hôm qua"
        value={formatVND(stats.gmv_yesterday)}
        icon={DollarSign}
        iconBg="var(--primary-tint)"
        iconColor="var(--primary)"
      />
      <StatCard
        title="Đơn hàng hôm qua"
        value={stats.orders_yesterday.toLocaleString("vi-VN")}
        icon={Package}
        iconBg="#FEF3C7"
        iconColor="#D97706"
      />
      <StatCard
        title="Người dùng đang hoạt động"
        value={stats.active_users.toLocaleString("vi-VN")}
        icon={Users}
        iconBg="#DCFCE7"
        iconColor="#16A34A"
      />
      <Link href="/verifications" className="block">
        <StatCard
          title="Chờ xác minh"
          value={stats.pending_verifications.toLocaleString("vi-VN")}
          icon={ShieldCheck}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
          className="cursor-pointer"
        />
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Revenue Chart Section (server → hands data to client chart)
───────────────────────────────────────────────────────────────────────────── */

async function RevenueChartSection() {
  const data = await getRevenueByMonth(12);
  return (
    <div
      className="rounded-2xl p-5 shadow-sm"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Doanh thu theo tháng
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            12 tháng gần nhất
          </p>
        </div>
      </div>
      <RevenueChart data={data} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Order Status Donut Section (server → hands data to client chart)
───────────────────────────────────────────────────────────────────────────── */

async function OrderDonutSection() {
  const data = await getOrderStatusDistribution();
  return (
    <div
      className="rounded-2xl p-5 shadow-sm"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Phân bổ trạng thái đơn hàng
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Tất cả thời gian
        </p>
      </div>
      <OrderDonutChart data={data} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Latest Orders Section (server initial load, then client pagination)
───────────────────────────────────────────────────────────────────────────── */

async function LatestOrdersSection() {
  const result = await getLatestOrders(1, 10);

  return (
    <div
      className="rounded-2xl shadow-sm overflow-hidden"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Đơn hàng mới nhất
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {result.meta.total} đơn hàng
          </p>
        </div>
        <Link
          href="/orders"
          className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--primary)" }}
        >
          Xem tất cả
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Table (client for row-click navigation + pagination) */}
      {result.data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Chưa có đơn hàng nào"
          description="Các đơn hàng mới sẽ xuất hiện tại đây."
        />
      ) : (
        <OrdersTableClient initialData={result} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description="Theo dõi hiệu suất nền tảng UniMove"
      />

      {/* Stat Cards */}
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCardsSection />
      </Suspense>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Suspense fallback={<ChartSkeleton height={320} />}>
            <RevenueChartSection />
          </Suspense>
        </div>
        <div className="xl:col-span-1">
          <Suspense fallback={<ChartSkeleton height={320} />}>
            <OrderDonutSection />
          </Suspense>
        </div>
      </div>

      {/* Latest Orders */}
      <Suspense
        fallback={
          <div
            className="rounded-2xl shadow-sm"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <ChartSkeleton height={400} />
          </div>
        }
      >
        <LatestOrdersSection />
      </Suspense>
    </div>
  );
}
