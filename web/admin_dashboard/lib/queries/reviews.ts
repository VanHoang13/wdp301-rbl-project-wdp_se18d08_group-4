"use server";

import { adminApi } from "@/lib/api";

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
  try {
    const response = await adminApi.getReviews({
      page,
      pageSize,
      flagged: flagged === undefined ? 'all' : String(flagged),
      hidden: hidden === undefined ? 'all' : String(hidden),
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
    throw new Error(response.message || 'Failed to fetch reviews');
  } catch (error) {
    console.error('Get reviews error:', error);
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

export async function hideReview(reviewId: string, reason: string, adminId: string) {
  try {
    const response = await adminApi.hideReview(reviewId, reason);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to hide review');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

export async function unhideReview(reviewId: string, adminId: string) {
  try {
    const response = await adminApi.unhideReview(reviewId);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to unhide review');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

export async function flagReview(reviewId: string, reason: string) {
  try {
    const response = await adminApi.flagReview(reviewId, reason);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to flag review');
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
