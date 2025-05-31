import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { Business } from "../models/business.model";
import { ApiKey } from "../models/apiKey.model";
import { Invoice } from "../models/invoice.model";
import { CurrencyService } from "../services/currency.service";
import { getSystemSettings, updateSystemSettings, ISystemSettings } from "../models/systemSettings.model";
import logger from "../config/logger";

export class AdminController extends BaseController<any> {
  private currencyService: CurrencyService;

  constructor() {
    super();
    this.currencyService = new CurrencyService();
  }
  // Get all businesses with pagination and filtering
  public getAllBusinesses = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const plan = req.query.plan as string;
      const search = req.query.search as string;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (status) filter.status = status;
      if (plan) filter.plan = plan;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const [businesses, total] = await Promise.all([
        Business.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Business.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.sendResponse(res, {
        businesses,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      logger.error("Error fetching businesses:", error);
      this.sendError(res, "Failed to fetch businesses", 500);
    }
  };

  // Get specific business by ID
  public getBusinessById = async (req: Request, res: Response) => {
    try {
      const business = await Business.findById(req.params.id).lean();

      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      // Get API keys count
      const apiKeysCount = await ApiKey.countDocuments({
        business: business._id,
        status: "active",
      });

      // Get recent invoices count
      const recentInvoicesCount = await Invoice.countDocuments({
        business: business._id,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });

      this.sendResponse(res, {
        ...business,
        apiKeysCount,
        recentInvoicesCount,
      });
    } catch (error) {
      logger.error("Error fetching business:", error);
      this.sendError(res, "Failed to fetch business", 500);
    }
  };

  // Create new business
  public createBusiness = async (req: Request, res: Response) => {
    try {
      const businessData = {
        name: req.body.name,
        email: req.body.email,
        plan: req.body.plan || "free",
        status: req.body.status || "trial",
        address: req.body.address || { country: "US" },
        businessType: req.body.businessType || "company",
      };

      // Check if email already exists
      const existingBusiness = await Business.findOne({
        email: businessData.email,
      });
      if (existingBusiness) {
        return this.sendError(
          res,
          "Business with this email already exists",
          400
        );
      }

      const business = await Business.create(businessData);

      logger.info(
        `Admin created new business: ${business.name} (${business.email})`
      );

      this.sendResponse(res, business, 201);
    } catch (error) {
      logger.error("Error creating business:", error);
      this.sendError(res, "Failed to create business", 500);
    }
  };

  // Update business
  public updateBusiness = async (req: Request, res: Response) => {
    try {
      const business = await Business.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      logger.info(`Admin updated business: ${business.name} (${business._id})`);

      this.sendResponse(res, business);
    } catch (error) {
      logger.error("Error updating business:", error);
      this.sendError(res, "Failed to update business", 500);
    }
  };

  // Delete business
  public deleteBusiness = async (req: Request, res: Response) => {
    try {
      const business = await Business.findById(req.params.id);

      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      // Revoke all API keys
      await ApiKey.updateMany(
        { business: business._id },
        {
          status: "revoked",
          revokedAt: new Date(),
          revokedReason: "Business deleted",
        }
      );

      // Soft delete by setting status to inactive
      business.status = "inactive";
      await business.save();

      logger.info(`Admin deleted business: ${business.name} (${business._id})`);

      this.sendResponse(res, { message: "Business deleted successfully" });
    } catch (error) {
      logger.error("Error deleting business:", error);
      this.sendError(res, "Failed to delete business", 500);
    }
  };

  // Get business API keys
  public getBusinessApiKeys = async (req: Request, res: Response) => {
    try {
      const apiKeys = await ApiKey.find({ business: req.params.id })
        .select("-key -hashedKey") // Don't expose the actual keys
        .sort({ createdAt: -1 });

      this.sendResponse(res, apiKeys);
    } catch (error) {
      logger.error("Error fetching API keys:", error);
      this.sendError(res, "Failed to fetch API keys", 500);
    }
  };

  // Create API key for business
  public createBusinessApiKey = async (req: Request, res: Response) => {
    try {
      const business = await Business.findById(req.params.id);
      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      const { key, hashedKey } = (ApiKey as any).generateApiKey();

      const apiKey = await ApiKey.create({
        name: req.body.name,
        key,
        hashedKey,
        business: business._id,
        permissions: req.body.permissions || {
          invoiceCreate: true,
          invoiceRead: true,
          invoiceUpdate: true,
          invoiceDelete: false,
          businessRead: true,
          businessUpdate: false,
        },
      });

      logger.info(`Admin created API key for business: ${business.name}`);

      // Return the key only once (for admin to give to business)
      this.sendResponse(
        res,
        {
          id: apiKey._id,
          name: apiKey.name,
          key, // Only returned once!
          maskedKey: apiKey.maskedKey,
          permissions: apiKey.permissions,
          createdAt: apiKey.createdAt,
        },
        201
      );
    } catch (error) {
      logger.error("Error creating API key:", error);
      this.sendError(res, "Failed to create API key", 500);
    }
  };

  // Revoke API key
  public revokeApiKey = async (req: Request, res: Response) => {
    try {
      const apiKey = await ApiKey.findOne({
        _id: req.params.keyId,
        business: req.params.businessId,
      });

      if (!apiKey) {
        return this.sendError(res, "API key not found", 404);
      }

      await apiKey.revoke(req.body.reason || "Revoked by admin");

      logger.info(
        `Admin revoked API key: ${apiKey.name} for business ${req.params.businessId}`
      );

      this.sendResponse(res, { message: "API key revoked successfully" });
    } catch (error) {
      logger.error("Error revoking API key:", error);
      this.sendError(res, "Failed to revoke API key", 500);
    }
  };

  // Get platform statistics
  public getPlatformStatistics = async (_req: Request, res: Response) => {
    try {
      const [
        totalBusinesses,
        activeBusinesses,
        totalInvoices,
        monthlyInvoices,
        businessesByPlan,
        businessesByStatus,
      ] = await Promise.all([
        Business.countDocuments(),
        Business.countDocuments({ status: "active" }),
        Invoice.countDocuments(),
        Invoice.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        Business.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
        Business.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      // Get monthly growth
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const [newBusinessesThisMonth, newBusinessesLastMonth] =
        await Promise.all([
          Business.countDocuments({
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          }),
          Business.countDocuments({
            createdAt: {
              $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          }),
        ]);

      const businessGrowth =
        newBusinessesLastMonth > 0
          ? ((newBusinessesThisMonth - newBusinessesLastMonth) /
              newBusinessesLastMonth) *
            100
          : 0;

      // Format plan and status breakdowns
      const planBreakdown = businessesByPlan.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as any);

      const statusBreakdown = businessesByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as any);

      this.sendResponse(res, {
        totalBusinesses,
        activeBusinesses,
        totalInvoices,
        monthlyInvoices,
        newBusinessesThisMonth,
        businessGrowth: Math.round(businessGrowth * 100) / 100,
        planBreakdown,
        statusBreakdown,
      });
    } catch (error) {
      logger.error("Error fetching platform statistics:", error);
      this.sendError(res, "Failed to fetch statistics", 500);
    }
  };

  // Reset business usage
  public resetBusinessUsage = async (req: Request, res: Response) => {
    try {
      const business = await Business.findById(req.params.id);
      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      await business.resetMonthlyUsage();

      logger.info(`Admin reset usage for business: ${business.name}`);

      this.sendResponse(res, { message: "Usage reset successfully" });
    } catch (error) {
      logger.error("Error resetting business usage:", error);
      this.sendError(res, "Failed to reset usage", 500);
    }
  };

  // Recalculate business storage
  public recalculateBusinessStorage = async (req: Request, res: Response) => {
    try {
      const businessId = req.params.id;
      const business = await Business.findById(businessId);
      
      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      // Get all invoices for this business in the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const invoices = await Invoice.find({
        business: businessId,
        createdAt: { $gte: startOfMonth }
      }).select('originalImage.size');
      
      // Calculate total storage used
      let totalStorageMB = 0;
      let invoiceCount = 0;
      
      for (const invoice of invoices) {
        if (invoice.originalImage?.size) {
          totalStorageMB += invoice.originalImage.size / (1024 * 1024);
          invoiceCount++;
        }
      }
      
      // Update business storage usage
      await Business.updateOne(
        { _id: businessId },
        { 
          $set: { 
            'usage.currentMonth.storageUsedMB': totalStorageMB 
          } 
        }
      );
      
      logger.info(`Recalculated storage for business ${business.name}: ${totalStorageMB.toFixed(2)} MB from ${invoiceCount} invoices`);

      this.sendResponse(res, { 
        message: "Storage recalculated successfully",
        storageUsedMB: totalStorageMB,
        invoiceCount: invoiceCount
      });
    } catch (error) {
      logger.error("Error recalculating business storage:", error);
      this.sendError(res, "Failed to recalculate storage", 500);
    }
  };

  // Suspend business
  public suspendBusiness = async (req: Request, res: Response) => {
    try {
      const business = await Business.findByIdAndUpdate(
        req.params.id,
        { status: "suspended" },
        { new: true }
      );

      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      logger.info(
        `Admin suspended business: ${business.name} - Reason: ${req.body.reason || "No reason provided"}`
      );

      this.sendResponse(res, business);
    } catch (error) {
      logger.error("Error suspending business:", error);
      this.sendError(res, "Failed to suspend business", 500);
    }
  };

  // Activate business
  public activateBusiness = async (req: Request, res: Response) => {
    try {
      const business = await Business.findByIdAndUpdate(
        req.params.id,
        { status: "active" },
        { new: true }
      );

      if (!business) {
        return this.sendError(res, "Business not found", 404);
      }

      logger.info(`Admin activated business: ${business.name}`);

      this.sendResponse(res, business);
    } catch (error) {
      logger.error("Error activating business:", error);
      this.sendError(res, "Failed to activate business", 500);
    }
  };

  // Get all invoices with pagination and filtering
  public getAllInvoices = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const businessId = req.query.businessId as string;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};

      if (businessId && businessId.trim() !== "") filter.business = businessId;
      if (status && status.trim() !== "") filter.status = status;
      if (type && type.trim() !== "") filter.type = type;

      // Date range filter - use invoiceDate field
      if (
        (dateFrom && dateFrom.trim() !== "") ||
        (dateTo && dateTo.trim() !== "")
      ) {
        filter.invoiceDate = {};
        if (dateFrom && dateFrom.trim() !== "")
          filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo && dateTo.trim() !== "")
          filter.invoiceDate.$lte = new Date(dateTo);
      }

      // Search filter
      if (search && search.trim() !== "") {
        filter.$or = [
          { invoiceNumber: { $regex: search, $options: "i" } },
          { "vendor.name": { $regex: search, $options: "i" } },
          { "customer.name": { $regex: search, $options: "i" } },
        ];
      }

      const [invoices, total] = await Promise.all([
        Invoice.find(filter)
          .populate("business", "name")
          .select("-originalImage.base64 -metadata.ocrText") // Exclude large fields for performance
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Invoice.countDocuments(filter),
      ]);

      // Add business name and map fields to match frontend expectations
      const invoicesWithBusinessName = invoices.map((invoice) => ({
        ...invoice,
        businessName: (invoice.business as any)?.name || "Unknown Business",
        amount: invoice.totalAmount, // Map totalAmount to amount
        currency: invoice.currency,
        date: invoice.invoiceDate, // Map invoiceDate to date for frontend
      }));

      const totalPages = Math.ceil(total / limit);

      this.sendResponse(res, {
        invoices: invoicesWithBusinessName,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      logger.error("Error fetching invoices:", error);
      this.sendError(res, "Failed to fetch invoices", 500);
    }
  };

  // Get specific invoice by ID
  public getInvoiceById = async (req: Request, res: Response) => {
    try {
      const invoice = await Invoice.findById(req.params.id)
        .populate("business", "name email")
        .select("-originalImage.base64") // Exclude base64 image from details
        .lean();

      if (!invoice) {
        return this.sendError(res, "Invoice not found", 404);
      }

      // Map fields to match frontend expectations
      const mappedInvoice = {
        ...invoice,
        businessName: (invoice.business as any)?.name || "Unknown Business",
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        vendor: invoice.vendor || {},
        customer: invoice.customer || {},
        items: (invoice.lineItems || []).map((item) => ({
          description: item.description || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          total: item.amount || 0, // Map amount to total
          taxRate: item.taxRate || 0,
          unit: item.unit || "",
        })),
        subtotal: invoice.subtotal || 0,
        tax: invoice.taxAmount || 0,
        total: invoice.totalAmount || 0,
        currency: invoice.currency || "USD",
        notes: invoice.notes || "",
        status: invoice.status,
        type: invoice.type,
        extractionMetadata: invoice.metadata
          ? {
              confidence: invoice.metadata.extractionConfidence || 0,
              processingTime: invoice.metadata.processingTimeMs || 0,
              language: invoice.metadata.ocrLanguage || "eng",
              ocrText: invoice.metadata.ocrText || "",
            }
          : null,
        paymentHistory: invoice.paymentDate
          ? [
              {
                amount: invoice.paidAmount || 0,
                date: invoice.paymentDate,
                method: invoice.paymentMethod || "Unknown",
                reference: invoice.reference || "",
              },
            ]
          : [],
        attachments: [],
      };

      this.sendResponse(res, mappedInvoice);
    } catch (error) {
      logger.error("Error fetching invoice:", error);
      this.sendError(res, "Failed to fetch invoice", 500);
    }
  };

  // Get invoices for specific business
  public getBusinessInvoices = async (req: Request, res: Response) => {
    try {
      const businessId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = { business: businessId };

      if (status && status.trim() !== "") filter.status = status;
      if (type && type.trim() !== "") filter.type = type;

      // Date range filter - use invoiceDate field
      if (
        (dateFrom && dateFrom.trim() !== "") ||
        (dateTo && dateTo.trim() !== "")
      ) {
        filter.invoiceDate = {};
        if (dateFrom && dateFrom.trim() !== "")
          filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo && dateTo.trim() !== "")
          filter.invoiceDate.$lte = new Date(dateTo);
      }

      // Search filter
      if (search && search.trim() !== "") {
        filter.$or = [
          { invoiceNumber: { $regex: search, $options: "i" } },
          { "vendor.name": { $regex: search, $options: "i" } },
          { "customer.name": { $regex: search, $options: "i" } },
        ];
      }

      // Debug logs
      logger.info(`Fetching invoices for business: ${businessId}`);
      logger.info(`Filter:`, filter);

      // Check total invoices for this business
      const totalInvoicesForBusiness = await Invoice.countDocuments({
        business: businessId,
      });
      logger.info(
        `Total invoices for business ${businessId}: ${totalInvoicesForBusiness}`
      );

      const [invoices, total] = await Promise.all([
        Invoice.find(filter)
          .select("-originalImage.base64 -metadata.ocrText") // Exclude large fields for performance
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Invoice.countDocuments(filter),
      ]);

      logger.info(
        `Found ${invoices.length} invoices with current filter, total: ${total}`
      );

      // Map fields to match frontend expectations
      const invoicesWithMappedFields = invoices.map((invoice) => ({
        ...invoice,
        amount: invoice.totalAmount, // Map totalAmount to amount
        currency: invoice.currency,
        date: invoice.invoiceDate, // Map invoiceDate to date for frontend
      }));

      const totalPages = Math.ceil(total / limit);

      this.sendResponse(res, {
        invoices: invoicesWithMappedFields,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      logger.error("Error fetching business invoices:", error);
      this.sendError(res, "Failed to fetch business invoices", 500);
    }
  };

  // Get invoice image
  public getInvoiceImage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findById(id).select("originalImage");

      if (!invoice) {
        return this.sendError(res, "Invoice not found", 404);
      }

      this.sendResponse(res, {
        image: invoice.originalImage.base64,
        mimeType: invoice.originalImage.mimeType,
        size: invoice.originalImage.size,
      });
    } catch (error) {
      logger.error("Error fetching invoice image:", error);
      this.sendError(res, "Failed to fetch invoice image", 500);
    }
  };

  // Get analytics data
  public getAnalytics = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      // Parse dates
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Set time to start and end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get business growth data
      const businessGrowth = await this.getBusinessGrowthData(start, end, groupBy as string);
      
      // Get invoice analytics
      const invoiceAnalytics = await this.getInvoiceAnalytics(start, end);
      
      // Get revenue analytics
      const revenueAnalytics = await this.getRevenueAnalytics(start, end);
      
      // Get usage analytics
      const usageAnalytics = await this.getUsageAnalytics(start, end);
      
      // Get top businesses
      const topBusinesses = await this.getTopBusinesses(start, end);
      
      // Get currency analytics
      const currencyAnalytics = await this.getCurrencyAnalytics(start, end);

      this.sendResponse(res, {
        dateRange: { start, end },
        businessGrowth,
        invoiceAnalytics,
        revenueAnalytics,
        usageAnalytics,
        topBusinesses,
        currencyAnalytics
      });
    } catch (error) {
      logger.error("Error fetching analytics:", error);
      this.sendError(res, "Failed to fetch analytics", 500);
    }
  };

  // Helper method to get business growth data
  private async getBusinessGrowthData(start: Date, end: Date, groupBy: string) {
    const groupByFormat = groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'week' ? '%Y-%U' : '%Y-%m';
    
    const businessGrowth = await Business.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: "$createdAt" }
          },
          count: { $sum: 1 },
          byPlan: {
            $push: "$plan"
          }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          planBreakdown: {
            free: {
              $size: {
                $filter: {
                  input: "$byPlan",
                  cond: { $eq: ["$$this", "free"] }
                }
              }
            },
            starter: {
              $size: {
                $filter: {
                  input: "$byPlan",
                  cond: { $eq: ["$$this", "starter"] }
                }
              }
            },
            professional: {
              $size: {
                $filter: {
                  input: "$byPlan",
                  cond: { $eq: ["$$this", "professional"] }
                }
              }
            },
            enterprise: {
              $size: {
                $filter: {
                  input: "$byPlan",
                  cond: { $eq: ["$$this", "enterprise"] }
                }
              }
            }
          }
        }
      }
    ]);

    return businessGrowth;
  }

  // Helper method to get invoice analytics
  private async getInvoiceAnalytics(start: Date, end: Date) {
    const invoiceStats = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
                avgAmount: { $avg: "$totalAmount" },
                byType: {
                  $push: "$type"
                },
                byStatus: {
                  $push: "$status"
                }
              }
            }
          ],
          dailyStats: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 },
                amount: { $sum: "$totalAmount" }
              }
            },
            { $sort: { _id: 1 } }
          ],
          currencyBreakdown: [
            {
              $group: {
                _id: "$currency",
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" }
              }
            }
          ]
        }
      }
    ]);

    const stats = invoiceStats[0];
    const totalStats = stats.totalStats[0] || {
      totalCount: 0,
      totalAmount: 0,
      avgAmount: 0,
      byType: [],
      byStatus: []
    };

    // Calculate type and status breakdowns
    const typeBreakdown = {
      received: totalStats.byType.filter((t: string) => t === 'received').length,
      sent: totalStats.byType.filter((t: string) => t === 'sent').length
    };

    const statusBreakdown = {
      draft: totalStats.byStatus.filter((s: string) => s === 'draft').length,
      pending: totalStats.byStatus.filter((s: string) => s === 'pending').length,
      approved: totalStats.byStatus.filter((s: string) => s === 'approved').length,
      rejected: totalStats.byStatus.filter((s: string) => s === 'rejected').length,
      paid: totalStats.byStatus.filter((s: string) => s === 'paid').length,
      cancelled: totalStats.byStatus.filter((s: string) => s === 'cancelled').length
    };

    return {
      total: totalStats.totalCount,
      totalAmount: totalStats.totalAmount,
      averageAmount: totalStats.avgAmount,
      typeBreakdown,
      statusBreakdown,
      dailyStats: stats.dailyStats,
      currencyBreakdown: stats.currencyBreakdown
    };
  }

  // Helper method to get revenue analytics
  private async getRevenueAnalytics(start: Date, end: Date) {
    // This is a placeholder - in a real system, you'd track actual revenue from subscriptions
    const planPricing = {
      free: 0,
      starter: 29,
      professional: 99,
      enterprise: 299
    };

    const businesses = await Business.find({
      status: 'active',
      createdAt: { $lte: end }
    }).select('plan createdAt');

    const monthlyRevenue: { [key: string]: number } = {};
    const mrr = businesses.reduce((total, business) => {
      return total + (planPricing[business.plan as keyof typeof planPricing] || 0);
    }, 0);

    return {
      mrr,
      arr: mrr * 12,
      growthRate: 0, // Would calculate based on historical data
      revenueByPlan: {
        free: businesses.filter(b => b.plan === 'free').length * planPricing.free,
        starter: businesses.filter(b => b.plan === 'starter').length * planPricing.starter,
        professional: businesses.filter(b => b.plan === 'professional').length * planPricing.professional,
        enterprise: businesses.filter(b => b.plan === 'enterprise').length * planPricing.enterprise
      }
    };
  }

  // Helper method to get usage analytics
  private async getUsageAnalytics(start: Date, end: Date) {
    const businesses = await Business.find({}).select('usage limits plan');
    
    const totalUsage = businesses.reduce((acc, business) => {
      return {
        invoices: acc.invoices + business.usage.currentMonth.invoices,
        apiCalls: acc.apiCalls + business.usage.currentMonth.apiCalls,
        storageGB: acc.storageGB + (business.usage.currentMonth.storageUsedMB / 1024)
      };
    }, { invoices: 0, apiCalls: 0, storageGB: 0 });

    const usageByPlan = {
      free: { invoices: 0, apiCalls: 0, storageGB: 0, businesses: 0 },
      starter: { invoices: 0, apiCalls: 0, storageGB: 0, businesses: 0 },
      professional: { invoices: 0, apiCalls: 0, storageGB: 0, businesses: 0 },
      enterprise: { invoices: 0, apiCalls: 0, storageGB: 0, businesses: 0 }
    };

    businesses.forEach(business => {
      const plan = business.plan as keyof typeof usageByPlan;
      if (usageByPlan[plan]) {
        usageByPlan[plan].invoices += business.usage.currentMonth.invoices;
        usageByPlan[plan].apiCalls += business.usage.currentMonth.apiCalls;
        usageByPlan[plan].storageGB += business.usage.currentMonth.storageUsedMB / 1024;
        usageByPlan[plan].businesses += 1;
      }
    });

    return {
      total: totalUsage,
      byPlan: usageByPlan,
      utilizationRate: {
        invoices: businesses.reduce((acc, b) => acc + (b.usage.currentMonth.invoices / b.limits.monthlyInvoices), 0) / businesses.length,
        apiCalls: businesses.reduce((acc, b) => acc + (b.usage.currentMonth.apiCalls / b.limits.apiCallsPerDay), 0) / businesses.length,
        storage: businesses.reduce((acc, b) => acc + ((b.usage.currentMonth.storageUsedMB / 1024) / b.limits.storageGB), 0) / businesses.length
      }
    };
  }

  // Helper method to get top businesses
  private async getTopBusinesses(start: Date, end: Date) {
    const topByInvoices = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: "$business",
          invoiceCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" }
        }
      },
      {
        $sort: { invoiceCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: "businesses",
          localField: "_id",
          foreignField: "_id",
          as: "business"
        }
      },
      {
        $unwind: "$business"
      },
      {
        $project: {
          businessId: "$_id",
          businessName: "$business.name",
          plan: "$business.plan",
          invoiceCount: 1,
          totalAmount: 1
        }
      }
    ]);

    return topByInvoices;
  }

  // Helper method to get currency analytics
  private async getCurrencyAnalytics(start: Date, end: Date) {
    try {
      // Get invoice data by currency
      const currencyData = await Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            isDeleted: false
          }
        },
        {
          $group: {
            _id: '$currency',
            totalAmount: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 },
            avgAmount: { $avg: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);

      // Convert all amounts to USD for comparison
      const convertedData = await Promise.all(
        currencyData.map(async (item) => {
          try {
            if (item._id === 'USD') {
              return {
                currency: item._id,
                originalTotalAmount: item.totalAmount,
                totalAmountUSD: item.totalAmount,
                originalAvgAmount: item.avgAmount,
                avgAmountUSD: item.avgAmount,
                originalPaidAmount: item.paidAmount,
                paidAmountUSD: item.paidAmount,
                invoiceCount: item.invoiceCount,
                conversionRate: 1
              };
            }

            const totalConversion = await this.currencyService.convertCurrency(
              item.totalAmount,
              item._id,
              'USD'
            );

            const avgConversion = await this.currencyService.convertCurrency(
              item.avgAmount,
              item._id,
              'USD'
            );

            const paidConversion = await this.currencyService.convertCurrency(
              item.paidAmount || 0,
              item._id,
              'USD'
            );

            return {
              currency: item._id,
              originalTotalAmount: item.totalAmount,
              totalAmountUSD: totalConversion.convertedAmount,
              originalAvgAmount: item.avgAmount,
              avgAmountUSD: avgConversion.convertedAmount,
              originalPaidAmount: item.paidAmount,
              paidAmountUSD: paidConversion.convertedAmount,
              invoiceCount: item.invoiceCount,
              conversionRate: totalConversion.rate
            };
          } catch (error) {
            logger.warn(`Failed to convert ${item._id} to USD:`, error);
            return {
              currency: item._id,
              originalTotalAmount: item.totalAmount,
              totalAmountUSD: null,
              originalAvgAmount: item.avgAmount,
              avgAmountUSD: null,
              originalPaidAmount: item.paidAmount,
              paidAmountUSD: null,
              invoiceCount: item.invoiceCount,
              conversionRate: null
            };
          }
        })
      );

      // Calculate totals
      const totals = convertedData.reduce(
        (acc, item) => {
          acc.totalInvoices += item.invoiceCount;
          if (item.totalAmountUSD !== null) {
            acc.totalAmountUSD += item.totalAmountUSD;
            acc.totalPaidUSD += item.paidAmountUSD || 0;
          }
          return acc;
        },
        { totalInvoices: 0, totalAmountUSD: 0, totalPaidUSD: 0 }
      );

      // Get most popular currencies
      const popularCurrencies = convertedData
        .sort((a, b) => b.invoiceCount - a.invoiceCount)
        .slice(0, 5);

      return {
        byCurrency: convertedData,
        totals,
        popularCurrencies,
        totalCurrencies: convertedData.length,
        baseCurrency: 'USD'
      };
    } catch (error) {
      logger.error('Failed to get currency analytics:', error);
      return {
        byCurrency: [],
        totals: { totalInvoices: 0, totalAmountUSD: 0, totalPaidUSD: 0 },
        popularCurrencies: [],
        totalCurrencies: 0,
        baseCurrency: 'USD',
        error: 'Failed to load currency analytics'
      };
    }
  }

  // Get system settings
  public getSystemSettings = async (_req: Request, res: Response) => {
    try {
      const settings = await getSystemSettings();
      this.sendResponse(res, settings);
    } catch (error) {
      logger.error("Error fetching system settings:", error);
      this.sendError(res, "Failed to fetch system settings", 500);
    }
  };

  // Update system settings
  public updateSystemSettings = async (req: Request, res: Response) => {
    try {
      const updates = req.body as Partial<ISystemSettings>;
      const settings = await updateSystemSettings(updates);
      
      logger.info(`Admin updated system settings`);
      
      this.sendResponse(res, settings);
    } catch (error) {
      logger.error("Error updating system settings:", error);
      this.sendError(res, "Failed to update system settings", 500);
    }
  };
}
