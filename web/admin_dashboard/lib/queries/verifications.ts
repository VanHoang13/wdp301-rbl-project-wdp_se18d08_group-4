"use server";

import { adminApi } from "@/lib/api";
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
  try {
    // For pending providers, we use the specific endpoint
    if (status === "pending") {
      const response = await adminApi.getPendingProviders();
      if (response.success) {
        return {
          data: response.data ?? [],
          error: null,
          meta: {
            page: 1,
            pageSize: response.data?.length ?? 0,
            total: response.data?.length ?? 0,
            totalPages: 1,
          },
        };
      }
    }

    // For other statuses, we'd need to create a generic endpoint
    // For now, return empty data
    return {
      data: [],
      error: null,
      meta: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    };
  } catch (error) {
    console.error('Get pending providers error:', error);
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

export async function getProviderDocuments(providerId: string) {
  try {
    const response = await adminApi.getProviderDocuments(providerId);
    if (response.success) {
      return { 
        data: response.data ?? [], 
        error: null 
      };
    }
    throw new Error(response.message || 'Failed to fetch provider documents');
  } catch (error) {
    return { 
      data: [], 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

export async function updateVerificationStatus(
  providerId: string,
  status: VerificationStatus,
  notes: string,
  adminId: string // This is automatically handled by backend auth
) {
  try {
    const action = status === "approved" ? "approve" : "reject";
    const response = await adminApi.verifyProvider(providerId, { action, notes });
    
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to update verification status');
  } catch (error) {
    return { 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}
