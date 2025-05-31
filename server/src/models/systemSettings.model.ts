import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument } from './base.model';

export interface ISystemSettings extends BaseDocument {
  platform: {
    name: string;
    description: string;
    supportEmail: string;
    maintenanceMode: boolean;
    maxUploadSize: number;
    allowedFileTypes: string[];
  };
  billing: {
    defaultCurrency: string;
    taxRate: number;
    trialPeriodDays: number;
    gracePeriodDays: number;
  };
  security: {
    passwordMinLength: number;
    requireTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableApiAccess: boolean;
    enableMultiCurrency: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    webhookNotifications: boolean;
    notificationRetries: number;
  };
}

const systemSettingsSchema = new Schema<ISystemSettings>({
  platform: {
    name: { type: String, required: true, default: 'Invoice AI Platform' },
    description: { type: String, required: true, default: 'Advanced AI-powered invoice processing platform' },
    supportEmail: { type: String, required: true, default: 'support@invoiceai.com' },
    maintenanceMode: { type: Boolean, default: false },
    maxUploadSize: { type: Number, default: 10 }, // MB
    allowedFileTypes: { type: [String], default: ['jpg', 'jpeg', 'png', 'pdf'] }
  },
  billing: {
    defaultCurrency: { type: String, default: 'USD' },
    taxRate: { type: Number, default: 0 },
    trialPeriodDays: { type: Number, default: 14 },
    gracePeriodDays: { type: Number, default: 7 }
  },
  security: {
    passwordMinLength: { type: Number, default: 8, min: 6, max: 32 },
    requireTwoFactor: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 60, min: 15, max: 480 }, // minutes
    maxLoginAttempts: { type: Number, default: 5, min: 3, max: 10 }
  },
  features: {
    enableAnalytics: { type: Boolean, default: true },
    enableNotifications: { type: Boolean, default: true },
    enableApiAccess: { type: Boolean, default: true },
    enableMultiCurrency: { type: Boolean, default: true }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    webhookNotifications: { type: Boolean, default: true },
    notificationRetries: { type: Number, default: 3, min: 1, max: 10 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

systemSettingsSchema.index({ updatedAt: -1 });

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);

export const getSystemSettings = async (): Promise<ISystemSettings> => {
  let settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
  
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  
  return settings;
};

export const updateSystemSettings = async (updates: Partial<ISystemSettings>): Promise<ISystemSettings> => {
  const settings = await getSystemSettings();
  
  Object.assign(settings, updates);
  
  return await settings.save();
};
