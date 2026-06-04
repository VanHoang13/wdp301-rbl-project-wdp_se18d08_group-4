"use server";

import { createClient } from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/types";

export async function getPendingProviders({
  page = 1,
  pageSize = 20,
  status = "pending",
}: {
  page?: number;
  pageSize?: number;
  status?: VerificationStatus;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, avatar_url, business_name, vehicle_type, vehicle_plate, verification_status, verification_notes, verified_at, created_at, rating, total_orders",
      { count: "exact" }
    )
    .eq("role", "provider")
    .eq("verification_status", status)
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

export async function getProviderDocuments(providerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("provider_documents")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

export async function updateVerificationStatus(
  providerId: string,
  status: VerificationStatus,
  notes: string,
  adminId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      verification_status: status,
      is_verified: status === "approved",
      verification_notes: notes,
      verified_at: status !== "pending" ? new Date().toISOString() : null,
      verified_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);
  return { error };
}
