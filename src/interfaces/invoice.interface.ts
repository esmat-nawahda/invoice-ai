export interface InvoiceItem {
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
}

export interface InvoiceData {
  // Invoice Header
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;

  // Company Information
  vendor: {
    name?: string | null;
    address?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  // Customer Information
  customer: {
    name?: string | null;
    address?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  // Financial Information
  subtotal?: number | null;
  taxAmount?: number | null;
  taxRate?: number | null;
  discount?: number | null;
  total?: number | null;
  currency?: string | null;

  // Line Items
  items?: Array<InvoiceItem> | null;

  // Additional Information
  paymentTerms?: string | null;
  notes?: string | null;
  paymentStatus?: "paid" | "unpaid" | "partial" | null;

  // Metadata
  confidence: number; // Confidence score from the AI model
  extractedAt: string; // Timestamp of extraction
}
