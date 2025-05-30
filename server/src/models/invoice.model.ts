import { Schema, model, Types } from 'mongoose';
import { BaseDocument } from './base.model';

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  unit?: string;
  taxRate?: number;
  discount?: number;
}

export interface IInvoice extends BaseDocument {
  // Business ownership
  business: Types.ObjectId;
  
  // Invoice type
  type: 'received' | 'sent';
  
  // Core invoice information
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  
  // Party information (simplified - just text fields from extraction)
  vendor: {
    name?: string;
    address?: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
  
  customer: {
    name?: string;
    address?: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
  
  // Line items
  lineItems: ILineItem[];
  
  // Financial information
  subtotal: number;
  taxAmount?: number;
  taxRate?: number;
  discountAmount?: number;
  discountRate?: number;
  totalAmount: number;
  currency: string;
  
  // Payment information
  paymentTerms?: string;
  paymentStatus: 'paid' | 'unpaid' | 'partial' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  paidAmount?: number;
  paymentDate?: Date;
  
  // Additional information
  notes?: string;
  reference?: string;
  purchaseOrder?: string;
  
  // Status
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  
  // Original image data
  originalImage: {
    base64: string;
    mimeType: string;
    size: number;
    filename?: string;
  };
  
  // Extraction metadata
  metadata: {
    extractionConfidence: number;
    extractedAt: Date;
    ocrText?: string;
    ocrLanguage: string;
    processingTimeMs: number;
    aiModel: string;
    extractionMethod: 'ocr' | 'manual' | 'api';
    extractedFields?: string[]; // Which fields were successfully extracted
  };
  
  // Tags for organization
  tags?: string[];
  
  // Custom fields (for business-specific data)
  customFields?: Record<string, any>;
  
  // Currency conversion helpers
  convertToTargetCurrency?(targetCurrency: string): Promise<{
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    rate: number;
  }>;
  
  getAmountInMultipleCurrencies?(currencies: string[]): Promise<Array<{
    currency: string;
    amount: number;
    formatted: string;
  }>>;
}

const lineItemSchema = new Schema<ILineItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  unit: { type: String },
  taxRate: { type: Number, min: 0, max: 100 },
  discount: { type: Number, min: 0 }
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  // Business ownership
  business: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true,
    index: true
  },
  
  // Invoice type
  type: {
    type: String,
    required: true,
    enum: ['received', 'sent'],
    index: true
  },
  
  // Core invoice information
  invoiceNumber: { 
    type: String, 
    required: true,
    index: true,
    trim: true
  },
  invoiceDate: { 
    type: Date, 
    required: true,
    index: true
  },
  dueDate: { 
    type: Date,
    index: true
  },
  
  // Party information
  vendor: {
    name: { type: String },
    address: { type: String },
    taxId: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  
  customer: {
    name: { type: String },
    address: { type: String },
    taxId: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  
  // Line items
  lineItems: {
    type: [lineItemSchema],
    default: []
  },
  
  // Financial information
  subtotal: { 
    type: Number, 
    required: true,
    min: 0
  },
  taxAmount: { 
    type: Number,
    min: 0,
    default: 0
  },
  taxRate: { 
    type: Number,
    min: 0,
    max: 100
  },
  discountAmount: { 
    type: Number,
    min: 0,
    default: 0
  },
  discountRate: { 
    type: Number,
    min: 0,
    max: 100
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0,
    index: true
  },
  currency: { 
    type: String, 
    required: true,
    uppercase: true,
    default: 'USD'
  },
  
  // Payment information
  paymentTerms: { type: String },
  paymentStatus: { 
    type: String,
    required: true,
    default: 'unpaid',
    enum: ['paid', 'unpaid', 'partial', 'overdue', 'cancelled'],
    index: true
  },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'paypal', 'other']
  },
  paidAmount: { 
    type: Number,
    min: 0,
    default: 0
  },
  paymentDate: { type: Date },
  
  // Additional information
  notes: { type: String },
  reference: { type: String },
  purchaseOrder: { type: String },
  
  // Status
  status: { 
    type: String,
    required: true,
    default: 'pending',
    enum: ['draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled'],
    index: true
  },
  
  // Original image storage
  originalImage: {
    base64: { 
      type: String, 
      required: true,
      select: false // Don't include in queries by default for performance
    },
    mimeType: { 
      type: String, 
      required: true,
      enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    },
    size: { 
      type: Number, 
      required: true,
      min: 0
    },
    filename: { type: String }
  },
  
  // Extraction metadata
  metadata: {
    extractionConfidence: { 
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    extractedAt: { 
      type: Date,
      required: true,
      default: Date.now
    },
    ocrText: { 
      type: String,
      select: false // Don't include in queries by default
    },
    ocrLanguage: { 
      type: String,
      required: true,
      default: 'eng',
      enum: ['eng', 'ara', 'mixed']
    },
    processingTimeMs: { 
      type: Number,
      required: true,
      min: 0
    },
    aiModel: { 
      type: String,
      required: true,
      default: 'gpt-4'
    },
    extractionMethod: {
      type: String,
      required: true,
      default: 'ocr',
      enum: ['ocr', 'manual', 'api']
    },
    extractedFields: [{ type: String }]
  },
  
  // Tags
  tags: [{ 
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Custom fields
  customFields: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for multi-tenant queries
invoiceSchema.index({ business: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ business: 1, invoiceDate: -1 });
invoiceSchema.index({ business: 1, type: 1, status: 1 });
invoiceSchema.index({ business: 1, paymentStatus: 1 });
invoiceSchema.index({ business: 1, totalAmount: -1 });
invoiceSchema.index({ business: 1, 'metadata.extractedAt': -1 });

// Text index for search
invoiceSchema.index({ 
  invoiceNumber: 'text',
  'vendor.name': 'text',
  'customer.name': 'text',
  notes: 'text',
  reference: 'text'
});

// Virtual fields
invoiceSchema.virtual('isOverdue').get(function() {
  return this.dueDate && 
         this.dueDate < new Date() && 
         this.paymentStatus === 'unpaid';
});

invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.dueDate || this.paymentStatus === 'paid' || this.paymentStatus === 'cancelled') {
    return 0;
  }
  const today = new Date();
  if (this.dueDate >= today) {
    return 0;
  }
  const diffTime = Math.abs(today.getTime() - this.dueDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

invoiceSchema.virtual('balanceDue').get(function() {
  return Math.max(0, this.totalAmount - (this.paidAmount || 0));
});

// Middleware
invoiceSchema.pre('save', function(next) {
  // Auto-update payment status based on payments
  if (this.isModified('paidAmount') || this.isModified('totalAmount')) {
    const paidAmount = this.paidAmount || 0;
    if (paidAmount >= this.totalAmount) {
      this.paymentStatus = 'paid';
      this.status = 'paid';
      if (!this.paymentDate) {
        this.paymentDate = new Date();
      }
    } else if (paidAmount > 0) {
      this.paymentStatus = 'partial';
    }
  }
  
  // Check for overdue status
  if (this.isModified('dueDate') || this.isModified('paymentStatus')) {
    if (this.dueDate && this.dueDate < new Date() && 
        this.paymentStatus === 'unpaid') {
      this.paymentStatus = 'overdue';
    }
  }
  
  next();
});

// Static methods for business-scoped queries
invoiceSchema.statics.findByBusiness = function(businessId: string, filter = {}) {
  return this.find({ business: businessId, isDeleted: false, ...filter });
};

invoiceSchema.statics.findOverdueByBusiness = function(businessId: string) {
  return this.find({
    business: businessId,
    dueDate: { $lt: new Date() },
    paymentStatus: 'unpaid',
    isDeleted: false
  });
};

invoiceSchema.statics.getStatisticsByBusiness = async function(businessId: string, period?: string) {
  let dateFilter = {};
  
  if (period) {
    const now = new Date();
    switch (period) {
      case 'today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        dateFilter = { $gte: startOfDay };
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { $gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { $gte: monthAgo };
        break;
      case 'year':
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { $gte: yearAgo };
        break;
    }
  }
  
  const matchStage: any = { 
    business: businessId,
    isDeleted: false 
  };
  
  if (Object.keys(dateFilter).length > 0) {
    matchStage.invoiceDate = dateFilter;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalInvoices: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' },
              averageAmount: { $avg: '$totalAmount' }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ],
        byStatus: [
          {
            $group: {
              _id: '$paymentStatus',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ],
        byCurrency: [
          {
            $group: {
              _id: '$currency',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ]
      }
    }
  ]);
};

// Currency conversion instance methods
invoiceSchema.methods.convertToTargetCurrency = async function(targetCurrency: string) {
  const { CurrencyService } = await import('../services/currency.service');
  const currencyService = new CurrencyService();
  
  return currencyService.convertCurrency(
    this.totalAmount,
    this.currency,
    targetCurrency
  );
};

invoiceSchema.methods.getAmountInMultipleCurrencies = async function(currencies: string[]) {
  const { CurrencyService } = await import('../services/currency.service');
  const currencyService = new CurrencyService();
  
  const results = [];
  
  for (const currency of currencies) {
    try {
      const conversion = await currencyService.convertCurrency(
        this.totalAmount,
        this.currency,
        currency
      );
      
      const formatted = await currencyService.formatCurrency(
        conversion.convertedAmount,
        currency
      );
      
      results.push({
        currency,
        amount: conversion.convertedAmount,
        formatted
      });
    } catch (error) {
      // Skip currencies that fail conversion
      console.warn(`Failed to convert to ${currency}:`, error);
    }
  }
  
  return results;
};

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);