"use server";

import { adminApi } from "@/lib/api";

export async function getOrderStatusHistory({
  page = 1,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await adminApi.getOrderStatusHistory({ page, pageSize });
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
    throw new Error(response.message || 'Failed to fetch order history');
  } catch (error) {
    console.error('Get order status history error:', error);
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

export async function getVerificationHistory({
  page = 1,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await adminApi.getVerificationHistory({ page, pageSize });
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
    throw new Error(response.message || 'Failed to fetch verification history');
  } catch (error) {
    console.error('Get verification history error:', error);
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

export async function getRefundHistory({
  page = 1,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await adminApi.getRefundHistory({ page, pageSize });
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
    throw new Error(response.message || 'Failed to fetch refund history');
  } catch (error) {
    console.error('Get refund history error:', error);
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
