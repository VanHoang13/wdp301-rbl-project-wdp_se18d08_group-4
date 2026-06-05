"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Package,
  Users,
  ShieldCheck,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

import { adminApi, apiClient } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { formatVND } from "@/lib/formatters";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

import { RevenueChart } from "./revenue-chart";
import { OrderDonutChart } from "./order-donut-chart";
import { OrdersTableClient } from "./orders-table-client";


/* ─────────────────────────────────────────────────────────────────────────────
   Dashboard Page - Client Component
───────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderDistribution, setOrderDistribution] = useState<any[]>([]);
  const [latestOrders, setLatestOrders] = useState<any>({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // Set token in API client
    apiClient.setToken(token);

    // Load dashboard data
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Load all data in parallel
      const [statsRes, revenueRes, distributionRes, ordersRes] = await Promise.all([
        adminApi.getDashboard().catch(err => ({ success: false, error: err.message })),
        adminApi.getRevenueByMonth({ months: 12 }).catch(err => ({ success: false, error: err.message })),
        adminApi.getOrderStatusDistribution().catch(err => ({ success: false, error: err.message })),
        adminApi.getLatestOrders({ page: 1, pageSize: 10 }).catch(err => ({ success: false, error: err.message })),
      ]);

      // Set stats
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        setStats({
          gmv_yesterday: 0,
          orders_yesterday: 0,
          active_users: 0,
          pending_verifications: 0,
          open_disputes: 0,
          platform_commission: 0,
        });
      }

      // Set revenue data
      if (revenueRes.success && revenueRes.data) {
        setRevenueData(revenueRes.data.map((item: any) => ({
          date: item.month,
          revenue: item.revenue,
          orders: 0,
        })));
      }

      // Set order distribution
      if (distributionRes.success && distributionRes.data) {
        setOrderDistribution(distributionRes.data);
      }

      // Set latest orders
      if (ordersRes.success) {
        setLatestOrders({
          data: ordersRes.data ?? [],
          meta: ordersRes.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        });
      }

    } catch (err) {
      console.error('Error loading dashboard:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);

      // If unauthorized, redirect to login
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.warn('Received 401 - clearing token and redirecting to login');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        // Clear cookies
        document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'admin_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Use setTimeout to ensure redirect happens after state updates
        setTimeout(() => router.push('/login'), 100);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tổng quan"
          description="Theo dõi hiệu suất nền tảng UniMove"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard key={i} title="" value="" icon={DollarSign} loading />
          ))}
        </div>
        <div className="animate-pulse rounded-2xl bg-gray-200 h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tổng quan"
          description="Theo dõi hiệu suất nền tảng UniMove"
        />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600 font-medium mb-2">Lỗi tải dữ liệu</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description="Theo dõi hiệu suất nền tảng UniMove"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Doanh thu hôm qua"
          value={formatVND(stats?.gmv_yesterday ?? 0)}
          icon={DollarSign}
          iconBg="var(--primary-tint)"
          iconColor="var(--primary)"
        />
        <StatCard
          title="Đơn hàng hôm qua"
          value={(stats?.orders_yesterday ?? 0).toLocaleString("vi-VN")}
          icon={Package}
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />
        <StatCard
          title="Người dùng đang hoạt động"
          value={(stats?.active_users ?? 0).toLocaleString("vi-VN")}
          icon={Users}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
        />
        <Link href="/verifications" className="block">
          <StatCard
            title="Chờ xác minh"
            value={(stats?.pending_verifications ?? 0).toLocaleString("vi-VN")}
            icon={ShieldCheck}
            iconBg="#FEE2E2"
            iconColor="#DC2626"
            className="cursor-pointer"
          />
        </Link>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
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
            <RevenueChart data={revenueData} />
          </div>
        </div>
        <div className="xl:col-span-1">
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
            <OrderDonutChart data={orderDistribution} />
          </div>
        </div>
      </div>

      {/* Latest Orders */}
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
              {latestOrders.meta.total} đơn hàng
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

        {/* Table */}
        {latestOrders.data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Chưa có đơn hàng nào"
            description="Các đơn hàng mới sẽ xuất hiện tại đây."
          />
        ) : (
          <OrdersTableClient initialData={latestOrders} />
        )}
      </div>
    </div>
  );
}
