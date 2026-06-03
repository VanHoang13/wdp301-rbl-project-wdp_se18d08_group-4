"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOrderStatistics(startDate?: string, endDate?: string) {
  const supabase = await createClient();

  const params: Record<string, string> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const { data, error } = await supabase.rpc("get_order_statistics", params);
  if (!error && data) return data;

  // Fallback
  let query = supabase.from("orders").select("status, total_price");
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: orders } = await query;
  if (!orders) return null;

  const total = orders.length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const revenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + Number(o.total_price), 0);

  return {
    total_orders: total,
    completed_count: completed,
    cancelled_count: cancelled,
    total_revenue: revenue,
    average_order_value: completed > 0 ? revenue / completed : 0,
    completion_rate: total > 0 ? (completed / total) * 100 : 0,
  };
}

export async function getTopProviders(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_top_providers", { p_limit: limit });
  if (!error && data) return data;

  // Fallback
  const { data: providers } = await supabase
    .from("profiles")
    .select(
      "id, full_name, business_name, avatar_url, rating, total_reviews, total_orders"
    )
    .eq("role", "provider")
    .eq("is_verified", true)
    .order("rating", { ascending: false })
    .limit(limit);

  return providers ?? [];
}

export async function getPlatformCommissionByMonth(months = 6) {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data } = await supabase
    .from("provider_earnings")
    .select("platform_commission, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (!data) return [];

  const map = new Map<string, number>();
  for (const row of data) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + Number(row.platform_commission));
  }

  return Array.from(map.entries()).map(([month, commission]) => ({
    month,
    commission,
  }));
}

export async function getGMVStats() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const [thisMonth, lastMonth] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("paid_at", startOfMonth),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("paid_at", startOfLastMonth)
      .lte("paid_at", endOfLastMonth),
  ]);

  const thisGMV = (thisMonth.data ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0
  );
  const lastGMV = (lastMonth.data ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0
  );
  const growth = lastGMV > 0 ? ((thisGMV - lastGMV) / lastGMV) * 100 : 0;

  return { thisGMV, lastGMV, growth };
}
