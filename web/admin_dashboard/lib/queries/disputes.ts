"use server";

import { adminApi } from "@/lib/api";
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
  try {
    const response = await adminApi.getDisputes({ page, pageSize, status });
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
    throw new Error(response.message || 'Failed to fetch disputes');
  } catch (error) {
    console.error('Get disputes error:', error);
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

export async function getDisputeById(id: string) {
  try {
    const response = await adminApi.getDisputeDetails(id);
    if (response.success && response.data) {
      return {
        dispute: response.data,
        messages: response.data.dispute_messages ?? [],
        error: null,
      };
    }
    throw new Error(response.message || 'Failed to fetch dispute');
  } catch (error) {
    return {
      dispute: null,
      messages: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

export async function resolveDispute(
  disputeId: string,
  adminId: string, // Auto-handled by backend
  resolution: string,
  resolutionType: string,
  refundAmount: number | null
) {
  try {
    const response = await adminApi.resolveDispute(disputeId, {
      resolution,
      resolution_type: resolutionType,
      refund_amount: refundAmount ?? undefined,
    });
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to resolve dispute');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
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
  try {
    const response = await adminApi.getRefunds({ page, pageSize, status });
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
    throw new Error(response.message || 'Failed to fetch refunds');
  } catch (error) {
    console.error('Get refunds error:', error);
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

export async function approveRefund(refundId: string, adminId: string) {
  try {
    const response = await adminApi.approveRefund(refundId);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to approve refund');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
