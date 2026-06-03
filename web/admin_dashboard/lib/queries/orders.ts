"use server";

import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export async function getOrders({
  page = 1,
  pageSize = 20,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  search?: string;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(
      `id, order_number, status, total_price, service_type, vehicle_size,
       pickup_address, pickup_city, pickup_district,
       delivery_address, delivery_city, delivery_district,
       created_at, completed_at, cancelled_at,
       customer:profiles!orders_customer_id_fkey(id, full_name, email, phone, avatar_url),
       provider:profiles!orders_provider_id_fkey(id, full_name, business_name, phone, avatar_url)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (search) {
    query = query.ilike("order_number", `%${search}%`);
  }

  const { data, error, count } = await query;
  return {
    data: data ?? [],
    error,
    meta: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  };
}

export async function getOrderById(id: string) {
  const supabase = await createClient();
  const [orderRes, historyRes, paymentRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `*, customer:profiles!orders_customer_id_fkey(*), provider:profiles!orders_provider_id_fkey(*)`
      )
      .eq("id", id)
      .single(),
    supabase
      .from("order_status_history")
      .select("*, changer:profiles!order_status_history_changed_by_fkey(id, full_name, role)")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    order: orderRes.data,
    history: historyRes.data ?? [],
    payments: paymentRes.data ?? [],
    error: orderRes.error,
  };
}

export async function forceCancelOrder(
  orderId: string,
  adminId: string,
  reason: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: adminId,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  return { error };
}
