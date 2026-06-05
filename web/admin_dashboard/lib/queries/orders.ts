"use server";

import { adminApi } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";

export async function getOrders({
  page = 1,
  pageSize = 20,
  status,
  search,
  dateFrom,
  dateTo,
}: {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const response = await adminApi.getOrders({
      page,
      pageSize,
      status,
      search,
      dateFrom,
      dateTo,
    });

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

    throw new Error(response.message || 'Failed to fetch orders');
  } catch (error) {
    console.error('Get orders error:', error);
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

export async function getOrderById(id: string) {
  try {
    const response = await adminApi.getOrderById(id);
    if (response.success && response.data) {
      return {
        order: response.data,
        history: response.data.order_status_history ?? [],
        payments: response.data.payments ?? [],
        error: null,
      };
    }
    throw new Error(response.message || 'Failed to fetch order');
  } catch (error) {
    return {
      order: null,
      history: [],
      payments: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

export async function forceCancelOrder(
  orderId: string,
  adminId: string, // This is automatically handled by backend auth
  reason: string
) {
  try {
    const response = await adminApi.forceCancelOrder(orderId, reason);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to cancel order');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}
