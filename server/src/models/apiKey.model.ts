import { Schema, model, Types } from 'mongoose';
import { BaseDocument } from './base.model';
import crypto from 'crypto';

export interface IApiKey extends BaseDocument {
  name: string;
  key: string;
  hashedKey: string;
  business: Types.ObjectId;
  maskedKey: string; // Virtual field
  
  // Permissions
  permissions: {
    invoiceCreate: boolean;
    invoiceRead: boolean;
    invoiceUpdate: boolean;
    invoiceDelete: boolean;
    businessRead: boolean;
    businessUpdate: boolean;
  };
  
  // Rate Limiting
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  
  // Usage tracking
  usage: {
    lastUsedAt?: Date;
    lastUsedIP?: string;
    totalRequests: number;
    todayRequests: number;
    lastResetDate: Date;
  };
  
  // Security
  allowedIPs?: string[];
  allowedDomains?: string[];
  expiresAt?: Date;
  
  status: 'active' | 'revoked' | 'expired';
  revokedAt?: Date;
  revokedReason?: string;
  
  // Methods
  revoke(reason?: string): Promise<void>;
}

const apiKeySchema = new Schema<IApiKey>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    select: false // Never return the actual key in queries
  },
  hashedKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  business: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  
  // Permissions
  permissions: {
    invoiceCreate: {
      type: Boolean,
      default: true
    },
    invoiceRead: {
      type: Boolean,
      default: true
    },
    invoiceUpdate: {
      type: Boolean,
      default: true
    },
    invoiceDelete: {
      type: Boolean,
      default: true
    },
    businessRead: {
      type: Boolean,
      default: true
    },
    businessUpdate: {
      type: Boolean,
      default: false
    }
  },
  
  // Rate Limiting
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60
    },
    requestsPerHour: {
      type: Number,
      default: 1000
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    }
  },
  
  // Usage tracking
  usage: {
    lastUsedAt: { type: Date },
    lastUsedIP: { type: String },
    totalRequests: {
      type: Number,
      default: 0
    },
    todayRequests: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Security
  allowedIPs: [{ 
    type: String,
    validate: {
      validator: function(ip: string) {
        // Basic IP validation (IPv4 and IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
      },
      message: 'Invalid IP address format'
    }
  }],
  allowedDomains: [{ type: String }],
  expiresAt: { type: Date },
  
  status: {
    type: String,
    required: true,
    default: 'active',
    enum: ['active', 'revoked', 'expired'],
    index: true
  },
  revokedAt: { type: Date },
  revokedReason: { type: String }
}, {
  timestamps: true
});

// Indexes
apiKeySchema.index({ business: 1, status: 1 });
apiKeySchema.index({ expiresAt: 1 }, { sparse: true });
apiKeySchema.index({ 'usage.lastResetDate': 1 });

// Generate API key
apiKeySchema.statics.generateApiKey = function() {
  // Generate a secure random API key
  const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
  
  // Hash the key for storage
  const hashedKey = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');
  
  return { key, hashedKey };
};

// Verify API key
apiKeySchema.statics.verifyApiKey = async function(apiKey: string) {
  // Hash the provided key
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
  
  // Find the key by hash
  const keyDoc = await this.findOne({ 
    hashedKey,
    status: 'active'
  }).populate('business');
  
  if (!keyDoc) {
    return null;
  }
  
  // Check if expired
  if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
    keyDoc.status = 'expired';
    await keyDoc.save();
    return null;
  }
  
  return keyDoc;
};

// Instance methods
apiKeySchema.methods.incrementUsage = async function(ip?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Reset daily counter if needed
  if (this.usage.lastResetDate < today) {
    this.usage.todayRequests = 0;
    this.usage.lastResetDate = today;
  }
  
  this.usage.totalRequests += 1;
  this.usage.todayRequests += 1;
  this.usage.lastUsedAt = now;
  if (ip) {
    this.usage.lastUsedIP = ip;
  }
  
  await this.save();
};

apiKeySchema.methods.checkRateLimit = function(): { allowed: boolean; limit?: string; resetIn?: number } {
  const now = new Date();
  // const minuteAgo = new Date(now.getTime() - 60 * 1000);
  // const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // For simplicity, we're checking daily limit from usage.todayRequests
  if (this.usage.todayRequests >= this.rateLimit.requestsPerDay) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const resetIn = tomorrow.getTime() - now.getTime();
    
    return {
      allowed: false,
      limit: 'daily',
      resetIn: Math.ceil(resetIn / 1000) // seconds
    };
  }
  
  // For per-minute and per-hour limits, we'd need to track timestamps
  // This is a simplified version
  return { allowed: true };
};

apiKeySchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions[permission] === true;
};

apiKeySchema.methods.revoke = async function(reason?: string) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  if (reason) {
    this.revokedReason = reason;
  }
  await this.save();
};

// Virtual to mask the key
apiKeySchema.virtual('maskedKey').get(function() {
  if (this.key) {
    return `sk_...${this.key.slice(-4)}`;
  }
  return 'sk_...****';
});

export const ApiKey = model<IApiKey>('ApiKey', apiKeySchema);