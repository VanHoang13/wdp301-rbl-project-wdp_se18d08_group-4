"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationPriority } from "@/lib/types";

export async function getAnnouncements({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("announcements")
    .select(
      "id, title, body, target_audience, priority, is_published, sent_count, read_count, scheduled_at, published_at, created_at",
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

export async function createAnnouncement({
  title,
  body,
  targetAudience,
  targetCities,
  priority,
  scheduledAt,
  createdBy,
}: {
  title: string;
  body: string;
  targetAudience: "all" | "customers" | "providers";
  targetCities?: string[];
  priority: NotificationPriority;
  scheduledAt?: string;
  createdBy: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      body,
      target_audience: targetAudience,
      target_cities: targetCities ?? null,
      priority,
      scheduled_at: scheduledAt ?? null,
      is_published: !scheduledAt,
      published_at: !scheduledAt ? new Date().toISOString() : null,
      created_by: createdBy,
    })
    .select()
    .single();

  return { data, error };
}

export async function publishAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  return { error };
}

export async function getAdminNotifications(userId: string, limit = 5) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("notifications")
    .select("id, title, body, is_read, created_at, notification_type", {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const unreadCount = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return {
    notifications: data ?? [],
    unreadCount: unreadCount.count ?? 0,
  };
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
}
