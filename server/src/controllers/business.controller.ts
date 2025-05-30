import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { Business } from "../models/business.model";
import { ApiKey } from "../models/apiKey.model";
import { Invoice } from "../models/invoice.model";
import logger from "../config/logger";

export class BusinessController {
  // Get current business info
  getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;

    res.status(200).json({
      status: "success",
      data: {
        id: business._id,
        name: business.name,
        email: business.email,
        plan: business.plan,
        status: business.status,
        usage: business.usage,
        limits: business.limits,
        settings: business.settings,
        createdAt: business.createdAt,
      },
    });
  });

  // Update business info
  updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const allowedUpdates = [
      'name', 'legalName', 'phone', 'website', 
      'address', 'industry', 'timezone', 'language',
      'settings', 'billing'
    ];

    // Filter out non-allowed fields
    const updates: any = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedBusiness = await Business.findByIdAndUpdate(
      business._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      data: updatedBusiness,
    });
  });

  // Get API keys
  getApiKeys = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;

    const apiKeys = await ApiKey.find({ 
      business: business._id,
      status: 'active'
    }).select('-hashedKey');

    res.status(200).json({
      status: "success",
      data: apiKeys,
    });
  });

  // Create new API key
  createApiKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const { name, permissions, rateLimit, allowedIPs, allowedDomains, expiresAt } = req.body;

    // Generate new API key
    const { key, hashedKey } = (ApiKey as any).generateApiKey();

    const apiKey = await ApiKey.create({
      name: name || 'Default API Key',
      key,
      hashedKey,
      business: business._id,
      permissions: permissions || {
        invoiceCreate: true,
        invoiceRead: true,
        invoiceUpdate: true,
        invoiceDelete: true,
        businessRead: true,
        businessUpdate: false,
      },
      rateLimit: rateLimit || {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      allowedIPs,
      allowedDomains,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    logger.info(`New API key created for business ${business.name}`);

    res.status(201).json({
      status: "success",
      data: {
        id: apiKey._id,
        name: apiKey.name,
        key: key, // Only return the actual key on creation
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt,
      },
      message: "Save this API key securely. It won't be shown again.",
    });
  });

  // Revoke API key
  revokeApiKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const { keyId } = req.params;
    const { reason } = req.body;

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      business: business._id,
      status: 'active'
    });

    if (!apiKey) {
      res.status(404).json({
        status: "error",
        message: "API key not found",
      });
      return;
    }

    await (apiKey as any).revoke(reason);

    logger.info(`API key ${(apiKey as any).maskedKey} revoked for business ${business.name}`);

    res.status(200).json({
      status: "success",
      message: "API key revoked successfully",
    });
  });

  // Get usage statistics
  getUsageStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const { period = 'month' } = req.query;

    // Get invoice statistics
    const invoiceStats = await (Invoice as any).getStatisticsByBusiness(
      business._id,
      period as string
    );

    // Calculate storage used
    const storageUsed = await Invoice.aggregate([
      { 
        $match: { 
          business: business._id,
          isDeleted: false 
        } 
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$originalImage.size' }
        }
      }
    ]);

    const result = invoiceStats[0] || {
      overview: [{ totalInvoices: 0 }]
    };

    res.status(200).json({
      status: "success",
      data: {
        usage: {
          current: business.usage.currentMonth,
          total: business.usage.total,
          storageUsedMB: Math.round((storageUsed[0]?.totalSize || 0) / 1024 / 1024),
        },
        limits: business.limits,
        invoiceStats: result.overview[0] || {},
        remainingQuota: {
          invoices: Math.max(0, business.limits.monthlyInvoices - business.usage.currentMonth.invoices),
          apiCalls: Math.max(0, business.limits.apiCallsPerDay - business.usage.currentMonth.apiCalls),
        },
      },
    });
  });

  // Get billing history
  getBillingHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // This would integrate with your payment provider
    // For now, return mock data
    res.status(200).json({
      status: "success",
      data: {
        currentPlan: req.business.plan,
        billingCycle: 'monthly',
        nextBillingDate: req.business.subscriptionEndsAt,
        paymentMethod: req.business.billing.method,
        invoices: [], // Would come from payment provider
      },
    });
  });

  // Change plan
  changePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const { plan } = req.body;

    if (!['free', 'starter', 'professional', 'enterprise'].includes(plan)) {
      res.status(400).json({
        status: "error",
        message: "Invalid plan",
      });
      return;
    }

    // This would integrate with payment provider for subscription management
    // For now, just update the plan
    business.plan = plan;
    business.status = 'active';
    await business.save();

    logger.info(`Business ${business.name} changed plan to ${plan}`);

    res.status(200).json({
      status: "success",
      data: {
        plan: business.plan,
        limits: business.limits,
      },
      message: `Successfully upgraded to ${plan} plan`,
    });
  });

  // Export data
  exportData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const { format = 'json', startDate, endDate } = req.query;

    const query: any = {
      business: business._id,
      isDeleted: false,
    };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate as string);
      if (endDate) query.invoiceDate.$lte = new Date(endDate as string);
    }

    const invoices = await Invoice.find(query)
      .select('-originalImage.base64 -metadata.ocrText')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const csv = this.convertToCSV(invoices);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        status: "success",
        data: invoices,
      });
    }
  });

  private convertToCSV(invoices: any[]): string {
    if (invoices.length === 0) return '';

    // Define headers
    const headers = [
      'Invoice Number', 'Date', 'Due Date', 'Type',
      'Vendor Name', 'Customer Name', 'Total Amount',
      'Currency', 'Payment Status', 'Status'
    ];

    // Convert invoices to CSV rows
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.invoiceDate,
      inv.dueDate || '',
      inv.type,
      inv.vendor?.name || '',
      inv.customer?.name || '',
      inv.totalAmount,
      inv.currency,
      inv.paymentStatus,
      inv.status
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}