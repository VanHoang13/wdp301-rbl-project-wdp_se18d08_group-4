"use server";

import { adminApi } from "@/lib/api";
import type { NotificationPriority } from "@/lib/types";

export async function getAnnouncements({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await adminApi.getAnnouncements({ page, pageSize });
    if (response.success) {
      return {
        data: response.data ?? [],
        error: null,
        meta: response.meta ?? {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }
    throw new Error(response.message || 'Failed to fetch announcements');
  } catch (error) {
    console.error('Get announcements error:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
      meta: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function createAnnouncement({
  title,
  body,
  targetAudience,
  targetCities,
  priority,
  scheduledAt,
  createdBy, // Auto-handled by backend auth
}: {
  title: string;
  body: string;
  targetAudience: "all" | "customers" | "providers";
  targetCities?: string[];
  priority: NotificationPriority;
  scheduledAt?: string;
  createdBy: string;
}) {
  try {
    const response = await adminApi.createAnnouncement({
      title,
      body,
      targetAudience,
      targetCities,
      priority,
      scheduledAt,
    });
    
    if (response.success) {
      return { data: response.data, error: null };
    }
    throw new Error(response.message || 'Failed to create announcement');
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

export async function publishAnnouncement(id: string) {
  try {
    const response = await adminApi.publishAnnouncement(id);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to publish announcement');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

// Note: These notification functions would require additional backend endpoints
export async function getAdminNotifications(userId: string, limit = 5) {
  // TODO: Implement backend endpoint for admin notifications
  return {
    notifications: [],
    unreadCount: 0,
  };
}

export async function markNotificationRead(id: string) {
  // TODO: Implement backend endpoint for marking notifications as read
  return null;
}
