"use server";

import type { DashboardStats, RevenueDataPoint } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await fetch(`${API_URL}/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data as DashboardStats;
    }
    throw new Error(data.message || 'Failed to fetch dashboard stats');
  } catch (error) {
    console.error('Dashboard stats error:', error);
    // Return default values on error
    return {
      gmv_yesterday: 0,
      orders_yesterday: 0,
      active_users: 0,
      pending_verifications: 0,
      open_disputes: 0,
      platform_commission: 0,
    };
  }
}

export async function getRevenueByMonth(months = 12): Promise<RevenueDataPoint[]> {
  try {
    const response = await fetch(`${API_URL}/admin/analytics/revenue?months=${months}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data.map((item: any) => ({
        date: item.month,
        revenue: item.revenue,
        orders: 0,
      }));
    }
    return [];
  } catch (error) {
    console.error('Revenue by month error:', error);
    return [];
  }
}

export async function getOrderStatusDistribution(): Promise<
  { status: string; count: number }[]
> {
  try {
    const response = await fetch(`${API_URL}/admin/dashboard/order-status-distribution`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Order status distribution error:', error);
    return [];
  }
}

export async function getLatestOrders(page = 1, pageSize = 10) {
  try {
    const response = await fetch(
      `${API_URL}/admin/dashboard/latest-orders?page=${page}&pageSize=${pageSize}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();
    
    if (data.success) {
      return {
        data: data.data ?? [],
        meta: data.meta ?? {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }
    throw new Error(data.message || 'Failed to fetch latest orders');
  } catch (error) {
    console.error('Latest orders error:', error);
    return {
      data: [],
      meta: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    };
  }
}
