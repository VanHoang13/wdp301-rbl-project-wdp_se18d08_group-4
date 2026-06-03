"use server";

import { createClient } from "@/lib/supabase/server";

export async function getReviews({
  page = 1,
  pageSize = 20,
  flagged,
  hidden,
}: {
  page?: number;
  pageSize?: number;
  flagged?: boolean;
  hidden?: boolean;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("reviews")
    .select(
      `id, rating, comment, tags, images, is_published, is_flagged, flagged_reason, is_hidden, hidden_reason, created_at,
       customer:profiles!reviews_customer_id_fkey(id, full_name, avatar_url),
       provider:profiles!reviews_provider_id_fkey(id, full_name, business_name, avatar_url),
       order:orders!reviews_order_id_fkey(id, order_number)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (flagged !== undefined) query = query.eq("is_flagged", flagged);
  if (hidden !== undefined) query = query.eq("is_hidden", hidden);

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

export async function hideReview(reviewId: string, reason: string, adminId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({
      is_hidden: true,
      hidden_reason: reason,
      is_published: false,
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);
  return { error };
}

export async function unhideReview(reviewId: string, adminId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({
      is_hidden: false,
      hidden_reason: null,
      is_published: true,
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);
  return { error };
}

export async function flagReview(reviewId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({
      is_flagged: true,
      flagged_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);
  return { error };
}
