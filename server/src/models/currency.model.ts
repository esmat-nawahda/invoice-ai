import { Schema, model } from 'mongoose';
import { BaseDocument } from './base.model';

export interface ICurrencyRate extends BaseDocument {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  provider: string;
  lastUpdated: Date;
  isActive: boolean;
}

export interface ICurrency extends BaseDocument {
  code: string; // ISO 4217 currency code (USD, EUR, etc.)
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  country?: string;
  region?: string;
}

const currencyRateSchema = new Schema<ICurrencyRate>({
  baseCurrency: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 3,
    index: true
  },
  targetCurrency: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 3,
    index: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  provider: {
    type: String,
    required: true,
    enum: ['exchangerate-api', 'fixer', 'openexchangerates', 'manual'],
    default: 'exchangerate-api'
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const currencySchema = new Schema<ICurrency>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    maxlength: 3,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  decimalPlaces: {
    type: Number,
    required: true,
    default: 2,
    min: 0,
    max: 4
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  country: {
    type: String
  },
  region: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
currencyRateSchema.index({ baseCurrency: 1, targetCurrency: 1 }, { unique: true });
currencyRateSchema.index({ baseCurrency: 1, targetCurrency: 1, lastUpdated: -1 });

// Virtual for rate age
currencyRateSchema.virtual('ageHours').get(function() {
  const now = new Date();
  const diffMs = now.getTime() - this.lastUpdated.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
});

// Static methods
currencyRateSchema.statics.getRate = async function(from: string, to: string) {
  if (from === to) return 1;
  
  const rate = await this.findOne({
    baseCurrency: from.toUpperCase(),
    targetCurrency: to.toUpperCase(),
    isActive: true
  }).sort({ lastUpdated: -1 });
  
  return rate?.rate || null;
};

currencyRateSchema.statics.getLatestRates = async function(baseCurrency: string) {
  return this.find({
    baseCurrency: baseCurrency.toUpperCase(),
    isActive: true
  }).sort({ lastUpdated: -1 });
};

currencySchema.statics.getActiveCurrencies = function() {
  return this.find({ isActive: true }).sort({ code: 1 });
};

currencySchema.statics.findByCode = function(code: string) {
  return this.findOne({ code: code.toUpperCase(), isActive: true });
};

export const CurrencyRate = model<ICurrencyRate>('CurrencyRate', currencyRateSchema);
export const Currency = model<ICurrency>('Currency', currencySchema);