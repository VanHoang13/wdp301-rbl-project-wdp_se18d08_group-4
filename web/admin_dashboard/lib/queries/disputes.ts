"use server";

import { createClient } from "@/lib/supabase/server";
import type { DisputeStatus } from "@/lib/types";

export async function getDisputes({
  page = 1,
  pageSize = 20,
  status,
}: {
  page?: number;
  pageSize?: number;
  status?: DisputeStatus;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("disputes")
    .select(
      `id, dispute_type, subject, status, priority, refund_amount, created_at, resolved_at,
       order:orders!disputes_order_id_fkey(id, order_number, total_price),
       raiser:profiles!disputes_raised_by_fkey(id, full_name, role, avatar_url)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

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

export async function getDisputeById(id: string) {
  const supabase = await createClient();
  const [disputeRes, messagesRes] = await Promise.all([
    supabase
      .from("disputes")
      .select(
        `*, order:orders!disputes_order_id_fkey(*, customer:profiles!orders_customer_id_fkey(id, full_name), provider:profiles!orders_provider_id_fkey(id, full_name, business_name)),
         raiser:profiles!disputes_raised_by_fkey(id, full_name, role, avatar_url),
         against:profiles!disputes_against_user_id_fkey(id, full_name, role, avatar_url)`
      )
      .eq("id", id)
      .single(),
    supabase
      .from("dispute_messages")
      .select("*, sender:profiles!dispute_messages_sender_id_fkey(id, full_name, role, avatar_url)")
      .eq("dispute_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    dispute: disputeRes.data,
    messages: messagesRes.data ?? [],
    error: disputeRes.error,
  };
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: string,
  resolutionType: string,
  refundAmount: number | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("disputes")
    .update({
      status: "resolved",
      resolution,
      resolution_type: resolutionType,
      refund_amount: refundAmount,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  return { error };
}

export async function getRefunds({
  page = 1,
  pageSize = 20,
  status,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("refunds")
    .select(
      `id, refund_amount, refund_reason, status, created_at, processed_at,
       order:orders!refunds_order_id_fkey(id, order_number),
       requester:profiles!refunds_requested_by_fkey(id, full_name, role)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

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

export async function approveRefund(refundId: string, adminId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("refunds")
    .update({
      status: "completed",
      approved_by: adminId,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", refundId);
  return { error };
}
