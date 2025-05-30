import axios from 'axios';
import type { AxiosInstance } from 'axios';

export interface ApiConfig {
  baseURL: string;
  apiKey?: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // If the response has the format { status: 'success', data: ... }, unwrap it
        if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
          return response.data.data;
        }
        return response.data;
      },
      (error) => {
        const message = error.response?.data?.message || error.response?.data?.error?.message || error.message;
        throw new Error(message);
      }
    );
  }

  setApiKey(apiKey: string) {
    this.client.defaults.headers['X-API-Key'] = apiKey;
  }

  async get<T>(url: string, params?: any): Promise<T> {
    return this.client.get(url, { params });
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.client.post(url, data);
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.client.put(url, data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.client.delete(url);
  }
}

// Default API client for admin (no API key needed for admin operations)
export const adminApi = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

// Factory for business API clients
export const createBusinessApi = (apiKey: string) => {
  return new ApiClient({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
    apiKey,
  });
};

// Types
export interface Business {
  _id: string;
  name: string;
  legalName?: string;
  email: string;
  phone?: string;
  website?: string;
  status: 'active' | 'suspended' | 'inactive' | 'trial';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  timezone: string;
  currency: string;
  language: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  limits: {
    monthlyInvoices: number;
    apiCallsPerDay: number;
    storageGB: number;
    teamMembers: number;
  };
  usage: {
    currentMonth: {
      invoices: number;
      apiCalls: number;
      storageUsedMB: number;
      lastResetDate: string;
    };
    total: {
      invoices: number;
      apiCalls: number;
    };
  };
  settings: {
    invoicePrefix?: string;
    defaultTaxRate?: number;
    defaultPaymentTerms?: string;
    autoExtractFields?: string[];
    webhookUrl?: string;
    emailNotifications: boolean;
  };
  signupDate: string;
  lastLoginDate?: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  _id: string;
  name: string;
  maskedKey: string;
  business: string;
  permissions: {
    invoiceCreate: boolean;
    invoiceRead: boolean;
    invoiceUpdate: boolean;
    invoiceDelete: boolean;
    businessRead: boolean;
    businessUpdate: boolean;
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  usage: {
    lastUsedAt?: string;
    lastUsedIP?: string;
    totalRequests: number;
    todayRequests: number;
    lastResetDate: string;
  };
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  business: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  vendor: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    taxId?: string;
  };
  customer: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
  originalImage?: {
    data: string;
    contentType: string;
    size: number;
  };
  extractionMetadata?: {
    ocrText: string;
    confidence: number;
    processingTime: number;
    language: string;
  };
  paymentHistory?: Array<{
    amount: number;
    date: string;
    method: string;
    reference?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceStatistics {
  totalInvoices: number;
  thisMonth: number;
  totalAmount: number;
  averageAmount: number;
  statusBreakdown: {
    paid: number;
    pending: number;
    overdue: number;
    draft: number;
    sent: number;
    cancelled: number;
  };
  monthlyTrend: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}