import { CurrencyRate, Currency, ICurrencyRate, ICurrency } from '../models/currency.model';
import logger from '../config/logger';
import { BaseService } from './base.service';

interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  rateAge: number; // in hours
  provider: string;
}

interface ExchangeRateAPIResponse {
  result: string;
  conversion_rates: Record<string, number>;
  base_code: string;
  time_last_update_unix: number;
}

export class CurrencyService extends BaseService<any> {
  private readonly RATE_CACHE_HOURS = 1; // Cache rates for 1 hour
  private readonly API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

  constructor() {
    super({} as any);
    this.initializeDefaultCurrencies();
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    forceRefresh = false
  ): Promise<ConversionResult> {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();

      // Same currency, no conversion needed
      if (from === to) {
        return {
          originalAmount: amount,
          originalCurrency: from,
          convertedAmount: amount,
          targetCurrency: to,
          rate: 1,
          rateAge: 0,
          provider: 'same_currency'
        };
      }

      // Get exchange rate
      const rateData = await this.getExchangeRate(from, to, forceRefresh);
      
      if (!rateData) {
        throw new Error(`Exchange rate not available for ${from} to ${to}`);
      }

      const convertedAmount = this.roundCurrency(amount * rateData.rate, to);

      return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount,
        targetCurrency: to,
        rate: rateData.rate,
        rateAge: this.calculateRateAge(rateData.lastUpdated),
        provider: rateData.provider
      };
    } catch (error) {
      logger.error('Currency conversion failed:', error);
      throw error;
    }
  }

  /**
   * Convert multiple amounts in different currencies to a target currency
   */
  async convertMultipleCurrencies(
    amounts: Array<{ amount: number; currency: string }>,
    targetCurrency: string,
    forceRefresh = false
  ): Promise<{
    conversions: ConversionResult[];
    totalInTargetCurrency: number;
    targetCurrency: string;
  }> {
    const conversions: ConversionResult[] = [];
    let total = 0;

    for (const { amount, currency } of amounts) {
      const conversion = await this.convertCurrency(amount, currency, targetCurrency, forceRefresh);
      conversions.push(conversion);
      total += conversion.convertedAmount;
    }

    return {
      conversions,
      totalInTargetCurrency: this.roundCurrency(total, targetCurrency),
      targetCurrency: targetCurrency.toUpperCase()
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    forceRefresh = false
  ): Promise<ICurrencyRate | null> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: 1,
        provider: 'same_currency',
        lastUpdated: new Date(),
        isActive: true
      } as any;
    }

    // Try to get cached rate first
    if (!forceRefresh) {
      const cachedRate = await CurrencyRate.findOne({
        baseCurrency: from,
        targetCurrency: to,
        isActive: true
      }).sort({ lastUpdated: -1 });

      if (cachedRate && this.isRateValid(cachedRate)) {
        return cachedRate;
      }
    }

    // Fetch fresh rates
    return await this.fetchAndCacheRate(from, to);
  }

  /**
   * Get all available currencies
   */
  async getAvailableCurrencies(): Promise<ICurrency[]> {
    return Currency.find({ isActive: true }).sort({ code: 1 });
  }

  /**
   * Get currency information by code
   */
  async getCurrencyInfo(code: string): Promise<ICurrency | null> {
    return Currency.findOne({ code: code.toUpperCase(), isActive: true });
  }

  /**
   * Update all exchange rates for a base currency
   */
  async updateExchangeRates(baseCurrency = 'USD'): Promise<number> {
    try {
      logger.info(`Updating exchange rates for ${baseCurrency}...`);
      
      const response = await fetch(`${this.API_BASE_URL}/${baseCurrency}`);
      
      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data = await response.json() as ExchangeRateAPIResponse;
      
      if (data.result !== 'success') {
        throw new Error('Exchange rate API returned error result');
      }

      let updatedCount = 0;
      const updateTime = new Date(data.time_last_update_unix * 1000);

      // Update rates for all target currencies
      for (const [targetCurrency, rate] of Object.entries(data.conversion_rates)) {
        await CurrencyRate.updateOne(
          {
            baseCurrency: baseCurrency.toUpperCase(),
            targetCurrency: targetCurrency.toUpperCase()
          },
          {
            baseCurrency: baseCurrency.toUpperCase(),
            targetCurrency: targetCurrency.toUpperCase(),
            rate,
            provider: 'exchangerate-api',
            lastUpdated: updateTime,
            isActive: true
          },
          { upsert: true }
        );
        updatedCount++;
      }

      logger.info(`Updated ${updatedCount} exchange rates for ${baseCurrency}`);
      return updatedCount;
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
      throw error;
    }
  }

  /**
   * Format currency amount with proper symbol and decimals
   */
  async formatCurrency(amount: number, currencyCode: string): Promise<string> {
    const currency = await this.getCurrencyInfo(currencyCode);
    
    if (!currency) {
      // Fallback formatting
      return `${currencyCode} ${amount.toFixed(2)}`;
    }

    const formattedAmount = amount.toFixed(currency.decimalPlaces);
    return `${currency.symbol}${formattedAmount}`;
  }

  /**
   * Get exchange rates for multiple currency pairs
   */
  async getMultipleRates(pairs: Array<{ from: string; to: string }>): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const { from, to } of pairs) {
      try {
        const result = await this.convertCurrency(1, from, to);
        results.push(result);
      } catch (error) {
        logger.warn(`Failed to get rate for ${from}/${to}:`, error);
      }
    }

    return results;
  }

  /**
   * Private helper methods
   */
  private async fetchAndCacheRate(from: string, to: string): Promise<ICurrencyRate | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/${from}`);
      
      if (!response.ok) {
        logger.warn(`Exchange rate API error: ${response.status}`);
        return null;
      }

      const data = await response.json() as ExchangeRateAPIResponse;
      
      if (data.result !== 'success' || !data.conversion_rates[to]) {
        logger.warn(`No rate found for ${from}/${to}`);
        return null;
      }

      const rate = data.conversion_rates[to];
      const updateTime = new Date(data.time_last_update_unix * 1000);

      // Cache the rate
      const rateDoc = await CurrencyRate.updateOne(
        { baseCurrency: from, targetCurrency: to },
        {
          baseCurrency: from,
          targetCurrency: to,
          rate,
          provider: 'exchangerate-api',
          lastUpdated: updateTime,
          isActive: true
        },
        { upsert: true, new: true }
      );

      return await CurrencyRate.findOne({ baseCurrency: from, targetCurrency: to });
    } catch (error) {
      logger.error(`Failed to fetch exchange rate ${from}/${to}:`, error);
      return null;
    }
  }

  private isRateValid(rate: ICurrencyRate): boolean {
    const ageHours = (new Date().getTime() - rate.lastUpdated.getTime()) / (1000 * 60 * 60);
    return ageHours < this.RATE_CACHE_HOURS;
  }

  private roundCurrency(amount: number, currencyCode: string): number {
    // Default to 2 decimal places, can be enhanced with currency-specific rules
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  private calculateRateAge(lastUpdated: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  private async initializeDefaultCurrencies(): Promise<void> {
    try {
      const defaultCurrencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, country: 'United States' },
        { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, region: 'Europe' },
        { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, country: 'United Kingdom' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, country: 'Japan' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, country: 'Canada' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, country: 'Australia' },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, country: 'Switzerland' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2, country: 'China' },
        { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimalPlaces: 2, country: 'Israel' },
        { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimalPlaces: 2, country: 'Saudi Arabia' },
        { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, country: 'United Arab Emirates' },
        { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', decimalPlaces: 2, country: 'Egypt' },
        { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', decimalPlaces: 3, country: 'Jordan' },
        { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', decimalPlaces: 3, country: 'Kuwait' }
      ];

      for (const currencyData of defaultCurrencies) {
        await Currency.updateOne(
          { code: currencyData.code },
          { ...currencyData, isActive: true },
          { upsert: true }
        );
      }

      logger.info('Default currencies initialized');
    } catch (error) {
      logger.error('Failed to initialize default currencies:', error);
    }
  }

  /**
   * Calculate weighted average exchange rate for multiple invoices
   */
  async calculateWeightedAverageRate(
    invoices: Array<{ amount: number; currency: string }>,
    targetCurrency: string
  ): Promise<number> {
    let totalWeightedRate = 0;
    let totalAmount = 0;

    for (const invoice of invoices) {
      if (invoice.currency === targetCurrency) {
        totalWeightedRate += invoice.amount * 1; // Rate of 1 for same currency
        totalAmount += invoice.amount;
      } else {
        const rate = await this.getExchangeRate(invoice.currency, targetCurrency);
        if (rate) {
          totalWeightedRate += invoice.amount * rate.rate;
          totalAmount += invoice.amount;
        }
      }
    }

    return totalAmount > 0 ? totalWeightedRate / totalAmount : 0;
  }
}