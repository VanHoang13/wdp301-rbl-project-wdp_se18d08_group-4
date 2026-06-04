"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOrderStatusHistory({
  page = 1,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("order_status_history")
    .select(
      `id, from_status, to_status, notes, created_at,
       order:orders!order_status_history_order_id_fkey(id, order_number),
       changer:profiles!order_status_history_changed_by_fkey(id, full_name, role)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

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

export async function getVerificationHistory({
  page = 1,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("profiles")
    .select(
      `id, full_name, business_name, verification_status, verification_notes, verified_at,
       verifier:profiles!profiles_verified_by_fkey(id, full_name)`,
      { count: "exact" }
    )
    .eq("role", "provider")
    .not("verified_at", "is", null)
    .order("verified_at", { ascending: false })
    .range(from, to);

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

export async function getRefundHistory({
  page = 1,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("refunds")
    .select(
      `id, refund_amount, refund_reason, status, processed_at,
       order:orders!refunds_order_id_fkey(id, order_number),
       approver:profiles!refunds_approved_by_fkey(id, full_name)`,
      { count: "exact" }
    )
    .not("processed_at", "is", null)
    .order("processed_at", { ascending: false })
    .range(from, to);

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
