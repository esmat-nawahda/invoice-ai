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

export interface Invoice {
  _id: string;
  businessId: string;
  businessName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  date: string;
  dueDate?: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: "received" | "sent";
  vendor?: {
    name: string;
    email?: string;
  };
  customer?: {
    name: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  businessId?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
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

  async recalculateBusinessStorage(id: string): Promise<{ message: string; storageUsedMB: number; invoiceCount: number }> {
    return adminApi.post(`/admin/businesses/${id}/recalculate-storage`);
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
    const url = reason
      ? `/admin/businesses/${businessId}/api-keys/${keyId}?reason=${encodeURIComponent(
          reason
        )}`
      : `/admin/businesses/${businessId}/api-keys/${keyId}`;
    return adminApi.delete(url);
  }

  // Platform Statistics
  async getPlatformStatistics(): Promise<PlatformStatistics> {
    return adminApi.get("/admin/statistics");
  }

  // Invoice Management
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoicesResponse> {
    return adminApi.get("/admin/invoices", filters);
  }

  async getBusinessInvoices(
    businessId: string,
    filters: InvoiceFilters = {}
  ): Promise<InvoicesResponse> {
    return adminApi.get(`/admin/businesses/${businessId}/invoices`, filters);
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    return adminApi.get(`/admin/invoices/${id}`);
  }

  async getInvoiceImage(id: string): Promise<{ image: string; mimeType: string; size: number }> {
    return adminApi.get(`/admin/invoices/${id}/image`);
  }

  // Business list (simplified for dropdowns)
  async getBusinesses(): Promise<Business[]> {
    const response = await this.getAllBusinesses({ limit: 1000 });
    return response.businesses;
  }
}

export const adminService = new AdminService();
