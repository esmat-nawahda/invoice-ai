export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceData {
  // Invoice Header
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;

  // Company Information
  vendor: {
    name: string;
    address?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  // Customer Information
  customer: {
    name: string;
    address?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  // Financial Information
  subtotal: number;
  taxAmount?: number | null;
  taxRate?: number | null;
  discount?: number | null;
  total: number;
  currency: string;

  // Line Items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  // Additional Information
  paymentTerms?: string | null;
  notes?: string | null;
  paymentStatus?: "paid" | "unpaid" | "partial" | null;

  // Metadata
  confidence: number; // Confidence score from the AI model
  extractedAt: string; // Timestamp of extraction
}
