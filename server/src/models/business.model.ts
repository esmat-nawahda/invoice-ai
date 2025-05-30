import { Schema, model } from 'mongoose';
import { BaseDocument } from './base.model';

export interface IBusiness extends BaseDocument {
  // Basic Information
  name: string;
  legalName?: string;
  email: string;
  phone?: string;
  website?: string;
  
  // Business Details
  taxId?: string;
  registrationNumber?: string;
  industry?: string;
  businessType: 'company' | 'individual' | 'non-profit' | 'government';
  
  // Address
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  
  // Account Settings
  status: 'active' | 'suspended' | 'inactive' | 'trial';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  timezone: string;
  currency: string;
  language: string;
  
  // Billing Information
  billing: {
    method?: 'credit_card' | 'invoice' | 'bank_transfer';
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  
  // Usage Limits (based on plan)
  limits: {
    monthlyInvoices: number;
    apiCallsPerDay: number;
    storageGB: number;
    teamMembers: number;
  };
  
  // Current Usage
  usage: {
    currentMonth: {
      invoices: number;
      apiCalls: number;
      storageUsedMB: number;
      lastResetDate: Date;
    };
    total: {
      invoices: number;
      apiCalls: number;
    };
  };
  
  // Settings
  settings: {
    invoicePrefix?: string;
    defaultTaxRate?: number;
    defaultPaymentTerms?: string;
    autoExtractFields?: string[];
    webhookUrl?: string;
    emailNotifications: boolean;
  };
  
  // Metadata
  signupDate: Date;
  lastLoginDate?: Date;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  
  // Methods
  resetMonthlyUsage(): Promise<void>;
}

const businessSchema = new Schema<IBusiness>({
  // Basic Information
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  legalName: { 
    type: String,
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: { type: String },
  website: { type: String },
  
  // Business Details
  taxId: { 
    type: String,
    unique: true,
    sparse: true
  },
  registrationNumber: { 
    type: String,
    unique: true,
    sparse: true
  },
  industry: { type: String },
  businessType: {
    type: String,
    required: true,
    default: 'company',
    enum: ['company', 'individual', 'non-profit', 'government']
  },
  
  // Address
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { 
      type: String,
      required: true,
      uppercase: true,
      default: 'US'
    }
  },
  
  // Account Settings
  status: {
    type: String,
    required: true,
    default: 'trial',
    enum: ['active', 'suspended', 'inactive', 'trial'],
    index: true
  },
  plan: {
    type: String,
    required: true,
    default: 'free',
    enum: ['free', 'starter', 'professional', 'enterprise'],
    index: true
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  language: {
    type: String,
    required: true,
    default: 'en'
  },
  
  // Billing Information
  billing: {
    method: {
      type: String,
      enum: ['credit_card', 'invoice', 'bank_transfer']
    },
    email: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String }
    }
  },
  
  // Usage Limits
  limits: {
    monthlyInvoices: {
      type: Number,
      default: 50, // Free plan default
      required: true
    },
    apiCallsPerDay: {
      type: Number,
      default: 100, // Free plan default
      required: true
    },
    storageGB: {
      type: Number,
      default: 1, // Free plan default
      required: true
    },
    teamMembers: {
      type: Number,
      default: 1, // Free plan default
      required: true
    }
  },
  
  // Current Usage
  usage: {
    currentMonth: {
      invoices: {
        type: Number,
        default: 0
      },
      apiCalls: {
        type: Number,
        default: 0
      },
      storageUsedMB: {
        type: Number,
        default: 0
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      }
    },
    total: {
      invoices: {
        type: Number,
        default: 0
      },
      apiCalls: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Settings
  settings: {
    invoicePrefix: { type: String },
    defaultTaxRate: {
      type: Number,
      min: 0,
      max: 100
    },
    defaultPaymentTerms: { type: String },
    autoExtractFields: [{
      type: String,
      enum: ['all', 'invoiceNumber', 'date', 'amount', 'vendor', 'items', 'tax']
    }],
    webhookUrl: { type: String },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  
  // Metadata
  signupDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastLoginDate: { type: Date },
  trialEndsAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 14); // 14 day trial
      return date;
    }
  },
  subscriptionEndsAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
businessSchema.index({ status: 1, plan: 1 });
businessSchema.index({ 'usage.currentMonth.lastResetDate': 1 });

// Virtual for checking if trial expired
businessSchema.virtual('isTrialExpired').get(function() {
  return this.status === 'trial' && this.trialEndsAt && this.trialEndsAt < new Date();
});

// Virtual for checking if subscription expired
businessSchema.virtual('isSubscriptionExpired').get(function() {
  return this.subscriptionEndsAt && this.subscriptionEndsAt < new Date();
});

// Methods
businessSchema.methods.incrementUsage = async function(type: 'invoice' | 'apiCall', amount = 1, storageMB = 0) {
  const update: any = {
    $inc: {
      [`usage.currentMonth.${type}s`]: amount,
      [`usage.total.${type}s`]: amount
    }
  };
  
  if (type === 'invoice' && storageMB > 0) {
    // Increment storage used by actual size
    update.$inc['usage.currentMonth.storageUsedMB'] = storageMB;
  } else if (type === 'invoice') {
    // Default to 1MB if no size provided
    update.$inc['usage.currentMonth.storageUsedMB'] = 1;
  }
  
  await this.updateOne(update);
};

businessSchema.methods.resetMonthlyUsage = async function() {
  this.usage.currentMonth = {
    invoices: 0,
    apiCalls: 0,
    storageUsedMB: this.usage.currentMonth.storageUsedMB, // Keep storage
    lastResetDate: new Date()
  };
  await this.save();
};

businessSchema.methods.canUseAPI = function(): boolean {
  // Check if account is active
  if (this.status === 'suspended' || this.status === 'inactive') {
    return false;
  }
  
  // Check trial expiration
  if (this.status === 'trial' && this.isTrialExpired) {
    return false;
  }
  
  // Check subscription expiration
  if (this.status === 'active' && this.isSubscriptionExpired) {
    return false;
  }
  
  // Check daily API limit
  if (this.usage.currentMonth.apiCalls >= this.limits.apiCallsPerDay) {
    return false;
  }
  
  return true;
};

businessSchema.methods.canCreateInvoice = function(): boolean {
  // Check monthly invoice limit
  return this.usage.currentMonth.invoices < this.limits.monthlyInvoices;
};

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    monthlyInvoices: 50,
    apiCallsPerDay: 100,
    storageGB: 1,
    teamMembers: 1
  },
  starter: {
    monthlyInvoices: 500,
    apiCallsPerDay: 1000,
    storageGB: 10,
    teamMembers: 3
  },
  professional: {
    monthlyInvoices: 5000,
    apiCallsPerDay: 10000,
    storageGB: 100,
    teamMembers: 10
  },
  enterprise: {
    monthlyInvoices: -1, // Unlimited
    apiCallsPerDay: -1, // Unlimited
    storageGB: 1000,
    teamMembers: -1 // Unlimited
  }
};

// Update limits when plan changes
businessSchema.pre('save', function(next) {
  if (this.isModified('plan')) {
    const planLimits = PLAN_LIMITS[this.plan];
    if (planLimits) {
      this.limits = planLimits;
    }
  }
  
  // Auto-suspend if trial expired
  if (this.status === 'trial' && this.trialEndsAt && this.trialEndsAt < new Date()) {
    this.status = 'suspended';
  }
  
  next();
});

// Static methods
businessSchema.statics.findActive = function() {
  return this.find({ 
    status: { $in: ['active', 'trial'] },
    $or: [
      { trialEndsAt: { $gt: new Date() } },
      { status: 'active' }
    ]
  });
};

businessSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

export const Business = model<IBusiness>('Business', businessSchema);