import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { CurrencyService } from '../services/currency.service';
import { Currency, CurrencyRate } from '../models/currency.model';
import { Business } from '../models/business.model';
import { Invoice } from '../models/invoice.model';
import logger from '../config/logger';

export class CurrencyController extends BaseController<any> {
  private currencyService: CurrencyService;

  constructor() {
    super();
    this.currencyService = new CurrencyService();
  }

  /**
   * Get all available currencies
   */
  public getCurrencies = async (req: Request, res: Response) => {
    try {
      const currencies = await this.currencyService.getAvailableCurrencies();
      
      return this.sendResponse(res, {
        success: true,
        data: currencies,
        message: 'Currencies retrieved successfully'
      });
    } catch (error) {
      logger.error('Failed to get currencies:', error);
      return this.sendError(res, 'Failed to retrieve currencies', 500);
    }
  };

  /**
   * Get exchange rates for multiple currency pairs
   */
  public getExchangeRates = async (req: Request, res: Response) => {
    try {
      const { baseCurrency = 'USD', targetCurrencies } = req.query;
      
      if (!targetCurrencies) {
        return this.sendError(res, 'Target currencies are required', 400);
      }

      const targets = Array.isArray(targetCurrencies) 
        ? targetCurrencies as string[]
        : [targetCurrencies as string];

      const rates = await Promise.all(
        targets.map(async (target) => {
          const rate = await this.currencyService.getExchangeRate(
            baseCurrency as string,
            target
          );
          return {
            from: baseCurrency,
            to: target,
            rate: rate?.rate || null,
            lastUpdated: rate?.lastUpdated || null,
            provider: rate?.provider || null
          };
        })
      );

      return this.sendResponse(res, {
        success: true,
        data: {
          baseCurrency,
          rates,
          timestamp: new Date()
        },
        message: 'Exchange rates retrieved successfully'
      });
    } catch (error) {
      logger.error('Failed to get exchange rates:', error);
      return this.sendError(res, 'Failed to retrieve exchange rates', 500);
    }
  };

  /**
   * Convert amount between currencies
   */
  public convertCurrency = async (req: Request, res: Response) => {
    try {
      const { amount, fromCurrency, toCurrency, forceRefresh } = req.body;

      if (!amount || !fromCurrency || !toCurrency) {
        return this.sendError(res, 'Amount, from currency, and to currency are required', 400);
      }

      if (amount <= 0) {
        return this.sendError(res, 'Amount must be greater than 0', 400);
      }

      const conversion = await this.currencyService.convertCurrency(
        parseFloat(amount),
        fromCurrency,
        toCurrency,
        forceRefresh || false
      );

      return this.sendResponse(res, {
        success: true,
        data: conversion,
        message: 'Currency conversion completed successfully'
      });
    } catch (error) {
      logger.error('Currency conversion failed:', error);
      const message = error instanceof Error ? error.message : 'Currency conversion failed';
      return this.sendError(res, message, 400);
    }
  };

  /**
   * Update exchange rates for a base currency
   */
  public updateExchangeRates = async (req: Request, res: Response) => {
    try {
      const { baseCurrency = 'USD' } = req.body;
      
      const updatedCount = await this.currencyService.updateExchangeRates(baseCurrency);

      return this.sendResponse(res, {
        success: true,
        data: {
          baseCurrency,
          updatedCount,
          timestamp: new Date()
        },
        message: `Updated ${updatedCount} exchange rates for ${baseCurrency}`
      });
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
      return this.sendError(res, 'Failed to update exchange rates', 500);
    }
  };

  /**
   * Get currency preferences for a business
   */
  public getBusinessCurrencyPreferences = async (req: Request, res: Response) => {
    try {
      const businessId = req.params.businessId;
      
      const business = await Business.findById(businessId).select('currencyPreferences currency');
      
      if (!business) {
        return this.sendError(res, 'Business not found', 404);
      }

      return this.sendResponse(res, {
        success: true,
        data: {
          primaryCurrency: business.currency,
          preferences: business.currencyPreferences
        },
        message: 'Currency preferences retrieved successfully'
      });
    } catch (error) {
      logger.error('Failed to get currency preferences:', error);
      return this.sendError(res, 'Failed to retrieve currency preferences', 500);
    }
  };

  /**
   * Update currency preferences for a business
   */
  public updateBusinessCurrencyPreferences = async (req: Request, res: Response) => {
    try {
      const businessId = req.params.businessId;
      const { baseCurrency, displayCurrencies, autoConvert, exchangeRateProvider } = req.body;

      const updateData: any = {};

      if (baseCurrency) {
        updateData.currency = baseCurrency.toUpperCase();
        updateData['currencyPreferences.baseCurrency'] = baseCurrency.toUpperCase();
      }

      if (displayCurrencies) {
        updateData['currencyPreferences.displayCurrencies'] = displayCurrencies.map((c: string) => c.toUpperCase());
      }

      if (typeof autoConvert === 'boolean') {
        updateData['currencyPreferences.autoConvert'] = autoConvert;
      }

      if (exchangeRateProvider) {
        updateData['currencyPreferences.exchangeRateProvider'] = exchangeRateProvider;
      }

      const business = await Business.findByIdAndUpdate(
        businessId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('currencyPreferences currency');

      if (!business) {
        return this.sendError(res, 'Business not found', 404);
      }

      return this.sendResponse(res, {
        success: true,
        data: {
          primaryCurrency: business.currency,
          preferences: business.currencyPreferences
        },
        message: 'Currency preferences updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update currency preferences:', error);
      return this.sendError(res, 'Failed to update currency preferences', 500);
    }
  };

  /**
   * Get invoice amounts in multiple currencies
   */
  public getInvoiceInMultipleCurrencies = async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const { currencies } = req.query;

      if (!currencies) {
        return this.sendError(res, 'Target currencies are required', 400);
      }

      const targetCurrencies = Array.isArray(currencies) 
        ? currencies as string[]
        : [currencies as string];

      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        return this.sendError(res, 'Invoice not found', 404);
      }

      const conversions = await invoice.getAmountInMultipleCurrencies!(targetCurrencies);

      return this.sendResponse(res, {
        success: true,
        data: {
          invoiceId,
          originalAmount: invoice.totalAmount,
          originalCurrency: invoice.currency,
          conversions,
          timestamp: new Date()
        },
        message: 'Invoice amounts in multiple currencies retrieved successfully'
      });
    } catch (error) {
      logger.error('Failed to get invoice in multiple currencies:', error);
      return this.sendError(res, 'Failed to convert invoice amounts', 500);
    }
  };

  /**
   * Get currency statistics for a business
   */
  public getCurrencyStatistics = async (req: Request, res: Response) => {
    try {
      const businessId = req.params.businessId;
      const { period = 'month' } = req.query;

      // Get invoice statistics grouped by currency
      const stats = await Invoice.aggregate([
        {
          $match: {
            business: businessId,
            isDeleted: false,
            ...(period && this.getDateFilter(period as string))
          }
        },
        {
          $group: {
            _id: '$currency',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            avgAmount: { $avg: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);

      // Get business primary currency for conversion
      const business = await Business.findById(businessId).select('currency currencyPreferences');
      const primaryCurrency = business?.currencyPreferences?.baseCurrency || business?.currency || 'USD';

      // Convert all amounts to primary currency
      const convertedStats = await Promise.all(
        stats.map(async (stat) => {
          if (stat._id === primaryCurrency) {
            return {
              ...stat,
              totalAmountInPrimary: stat.totalAmount,
              avgAmountInPrimary: stat.avgAmount,
              paidAmountInPrimary: stat.paidAmount,
              conversionRate: 1
            };
          }

          try {
            const totalConversion = await this.currencyService.convertCurrency(
              stat.totalAmount,
              stat._id,
              primaryCurrency
            );

            const avgConversion = await this.currencyService.convertCurrency(
              stat.avgAmount,
              stat._id,
              primaryCurrency
            );

            const paidConversion = await this.currencyService.convertCurrency(
              stat.paidAmount || 0,
              stat._id,
              primaryCurrency
            );

            return {
              ...stat,
              totalAmountInPrimary: totalConversion.convertedAmount,
              avgAmountInPrimary: avgConversion.convertedAmount,
              paidAmountInPrimary: paidConversion.convertedAmount,
              conversionRate: totalConversion.rate
            };
          } catch (error) {
            logger.warn(`Failed to convert ${stat._id} to ${primaryCurrency}:`, error);
            return {
              ...stat,
              totalAmountInPrimary: null,
              avgAmountInPrimary: null,
              paidAmountInPrimary: null,
              conversionRate: null
            };
          }
        })
      );

      // Calculate totals
      const totals = convertedStats.reduce(
        (acc, stat) => {
          acc.totalInvoices += stat.count;
          if (stat.totalAmountInPrimary !== null) {
            acc.totalAmountInPrimary += stat.totalAmountInPrimary;
            acc.totalPaidInPrimary += stat.paidAmountInPrimary || 0;
          }
          return acc;
        },
        { totalInvoices: 0, totalAmountInPrimary: 0, totalPaidInPrimary: 0 }
      );

      return this.sendResponse(res, {
        success: true,
        data: {
          primaryCurrency,
          period,
          byCurrency: convertedStats,
          totals,
          timestamp: new Date()
        },
        message: 'Currency statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Failed to get currency statistics:', error);
      return this.sendError(res, 'Failed to retrieve currency statistics', 500);
    }
  };

  private getDateFilter(period: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        return {};
    }

    return { invoiceDate: { $gte: startDate } };
  }
}