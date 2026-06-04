"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/lib/types";

export async function getUsers({
  role,
  search,
  status,
  page = 1,
  pageSize = 20,
}: {
  role?: UserRole;
  search?: string;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, email, phone, full_name, avatar_url, role, status, student_id, university, business_name, vehicle_type, vehicle_plate, rating, total_reviews, total_orders, total_spent, total_earnings, is_verified, verification_status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
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

export async function getUserById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function updateUserStatus(id: string, status: UserStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error };
}
