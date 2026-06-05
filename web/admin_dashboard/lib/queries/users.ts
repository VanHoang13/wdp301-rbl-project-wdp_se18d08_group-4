"use server";

import { adminApi } from "@/lib/api";
import type { UserRole, UserStatus } from "@/lib/types";

export async function getUsers({
  role,
  search,
  status,
  page = 1,
  pageSize = 20,
}: {
  role?: UserRole;
  search?: string;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}) {
  try {
    const response = await adminApi.getUsers({
      role,
      search,
      status,
      page,
      pageSize,
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
    
    throw new Error(response.message || 'Failed to fetch users');
  } catch (error) {
    console.error('Get users error:', error);
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

export async function getUserById(id: string) {
  // This would require a new backend endpoint /admin/users/:id
  // For now, we'll use getUsers with search
  try {
    const response = await adminApi.getUsers({ search: id, pageSize: 1 });
    if (response.success && response.data && response.data.length > 0) {
      return { 
        data: response.data[0], 
        error: null 
      };
    }
    return { 
      data: null, 
      error: new Error('User not found') 
    };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

export async function updateUserStatus(id: string, status: UserStatus) {
  try {
    const response = await adminApi.updateUserStatus(id, status);
    if (response.success) {
      return { error: null };
    }
    throw new Error(response.message || 'Failed to update user status');
  } catch (error) {
    return { 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}
