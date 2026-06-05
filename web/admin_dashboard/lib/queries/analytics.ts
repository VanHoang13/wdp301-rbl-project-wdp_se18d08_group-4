"use server";

import { adminApi } from "@/lib/api";

export async function getOrderStatistics(startDate?: string, endDate?: string) {
  try {
    const response = await adminApi.getOrderStatistics({ startDate, endDate });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Get order statistics error:', error);
    return null;
  }
}

export async function getTopProviders(limit = 10) {
  try {
    const response = await adminApi.getTopProviders({ limit });
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Get top providers error:', error);
    return [];
  }
}

export async function getPlatformCommissionByMonth(months = 6) {
  try {
    const response = await adminApi.getPlatformCommissionByMonth({ months });
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Get platform commission error:', error);
    return [];
  }
}

export async function getGMVStats() {
  try {
    const response = await adminApi.getGMVStats();
    if (response.success && response.data) {
      return response.data;
    }
    return { thisGMV: 0, lastGMV: 0, growth: 0 };
  } catch (error) {
    console.error('Get GMV stats error:', error);
    return { thisGMV: 0, lastGMV: 0, growth: 0 };
  }
}
