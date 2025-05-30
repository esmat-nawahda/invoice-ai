import { adminApi } from "../utils/api";
import type { Business, ApiKey } from "../utils/api";

export interface BusinessFilters {
  page?: number;
  limit?: number;
  status?: string;
  plan?: string;
  search?: string;
}

export interface BusinessListResponse {
  businesses: Business[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PlatformStatistics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalInvoices: number;
  monthlyInvoices: number;
  newBusinessesThisMonth: number;
  businessGrowth: number;
  planBreakdown: {
    free: number;
    starter: number;
    professional: number;
    enterprise: number;
  };
  statusBreakdown: {
    active: number;
    trial: number;
    suspended: number;
    inactive: number;
  };
}


export interface CreateBusinessData {
  name: string;
  email: string;
  plan?: "free" | "starter" | "professional" | "enterprise";
  status?: "active" | "suspended" | "inactive" | "trial";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  businessType?: "company" | "individual" | "non-profit" | "government";
}

export interface CreateApiKeyData {
  name: string;
  permissions?: {
    invoiceCreate: boolean;
    invoiceRead: boolean;
    invoiceUpdate: boolean;
    invoiceDelete: boolean;
    businessRead: boolean;
    businessUpdate: boolean;
  };
}

export interface ApiKeyWithKey extends ApiKey {
  key?: string; // Only available when first created
}

class AdminService {
  // Business Management
  async getAllBusinesses(
    filters: BusinessFilters = {}
  ): Promise<BusinessListResponse> {
    return adminApi.get("/admin/businesses", filters);
  }

  async getBusinessById(
    id: string
  ): Promise<Business & { apiKeysCount: number; recentInvoicesCount: number }> {
    return adminApi.get(`/admin/businesses/${id}`);
  }

  async createBusiness(data: CreateBusinessData): Promise<Business> {
    return adminApi.post("/admin/businesses", data);
  }

  async updateBusiness(
    id: string,
    data: Partial<CreateBusinessData>
  ): Promise<Business> {
    return adminApi.put(`/admin/businesses/${id}`, data);
  }

  async deleteBusiness(id: string): Promise<{ message: string }> {
    return adminApi.delete(`/admin/businesses/${id}`);
  }

  async suspendBusiness(id: string, reason?: string): Promise<Business> {
    return adminApi.post(`/admin/businesses/${id}/suspend`, { reason });
  }

  async activateBusiness(id: string): Promise<Business> {
    return adminApi.post(`/admin/businesses/${id}/activate`);
  }

  async resetBusinessUsage(id: string): Promise<{ message: string }> {
    return adminApi.post(`/admin/businesses/${id}/reset-usage`);
  }

  // API Key Management
  async getBusinessApiKeys(businessId: string): Promise<ApiKey[]> {
    return adminApi.get(`/admin/businesses/${businessId}/api-keys`);
  }

  async createBusinessApiKey(
    businessId: string,
    data: CreateApiKeyData
  ): Promise<ApiKeyWithKey> {
    return adminApi.post(`/admin/businesses/${businessId}/api-keys`, data);
  }

  async revokeApiKey(
    businessId: string,
    keyId: string,
    reason?: string
  ): Promise<{ message: string }> {
    return adminApi.delete(
      `/admin/businesses/${businessId}/api-keys/${keyId}`,
      { reason }
    );
  }

  // Platform Statistics
  async getPlatformStatistics(): Promise<PlatformStatistics> {
    return adminApi.get("/admin/statistics");
  }
}

export const adminService = new AdminService();
