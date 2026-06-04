"use server";

import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, RevenueDataPoint } from "@/lib/types";

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  // Use the existing RPC function from the DB
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
  if (!error && data) {
    return data as DashboardStats;
  }

  // Fallback: manual queries if RPC unavailable
  const [gmvRes, ordersRes, usersRes, pendingRes, disputesRes, commissionRes] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("paid_at", new Date(Date.now() - 86400000).toISOString()),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["customer", "provider"])
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "provider")
        .eq("verification_status", "pending"),
      supabase
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("provider_earnings")
        .select("platform_commission")
        .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);

  const gmv = (gmvRes.data ?? []).reduce(
    (sum: number, r: { amount: number }) => sum + Number(r.amount),
    0
  );
  const commission = (commissionRes.data ?? []).reduce(
    (sum: number, r: { platform_commission: number }) =>
      sum + Number(r.platform_commission),
    0
  );

  return {
    gmv_yesterday: gmv,
    orders_yesterday: ordersRes.count ?? 0,
    active_users: usersRes.count ?? 0,
    pending_verifications: pendingRes.count ?? 0,
    open_disputes: disputesRes.count ?? 0,
    platform_commission: commission,
  };
}

export async function getRevenueByMonth(months = 12): Promise<RevenueDataPoint[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("status", "completed")
    .gte("paid_at", since.toISOString())
    .order("paid_at", { ascending: true });

  if (error || !data) return [];

  // Group by month
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const row of data) {
    if (!row.paid_at) continue;
    const d = new Date(row.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(key) ?? { revenue: 0, orders: 0 };
    map.set(key, {
      revenue: existing.revenue + Number(row.amount),
      orders: existing.orders + 1,
    });
  }

  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue,
    orders: v.orders,
  }));
}

export async function getOrderStatusDistribution(): Promise<
  { status: string; count: number }[]
> {
  const supabase = await createClient();
  const statuses = [
    "pending",
    "matched",
    "accepted",
    "picking_up",
    "picked_up",
    "in_progress",
    "completed",
    "cancelled",
    "disputed",
  ];

  const results = await Promise.all(
    statuses.map((s) =>
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", s)
    )
  );

  return statuses.map((s, i) => ({
    status: s,
    count: results[i].count ?? 0,
  }));
}

export async function getLatestOrders(page = 1, pageSize = 10) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, total_price, created_at,
       pickup_address, pickup_city,
       delivery_address, delivery_city,
       customer:profiles!orders_customer_id_fkey(id, full_name, avatar_url),
       provider:profiles!orders_provider_id_fkey(id, full_name, business_name, avatar_url)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    data: data ?? [],
    meta: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  };
}
