import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { InvoiceService } from "../services/invoice.service";
import { Invoice } from "../models/invoice.model";
import logger from "../config/logger";

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  // Extract invoice data from image
  extractInvoice = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { image, type = "received", saveToDatabase = true } = req.body;

      if (!image) {
        res.status(400).json({
          status: "error",
          message: "No image provided",
        });
        return;
      }

      const business = req.business;
      const startTime = Date.now();

      // Extract data from invoice
      const extractedData = await this.invoiceService.extractInvoiceData(image);
      const processingTime = Date.now() - startTime;

      let savedInvoice = null;

      if (saveToDatabase) {
        try {
          // Determine which fields were successfully extracted
          const extractedFields = [];
          if (extractedData.invoiceNumber)
            extractedFields.push("invoiceNumber");
          if (extractedData.invoiceDate) extractedFields.push("invoiceDate");
          if (extractedData.vendor?.name) extractedFields.push("vendor");
          if (extractedData.customer?.name) extractedFields.push("customer");
          if (extractedData.items && extractedData.items.length > 0)
            extractedFields.push("lineItems");
          if (extractedData.total) extractedFields.push("totalAmount");

          // Create invoice record
          const invoiceToSave = {
            business: business._id,
            type,
            invoiceNumber: extractedData.invoiceNumber || `INV-${Date.now()}`,
            invoiceDate:
              this.parseDate(extractedData.invoiceDate) || new Date(),
            dueDate: this.parseDate(extractedData.dueDate) || undefined,
            vendor: {
              name: extractedData.vendor?.name,
              address: extractedData.vendor?.address,
              taxId: extractedData.vendor?.taxId,
              email: extractedData.vendor?.email,
              phone: extractedData.vendor?.phone,
            },
            customer: {
              name: extractedData.customer?.name,
              address: extractedData.customer?.address,
              taxId: extractedData.customer?.taxId,
              email: extractedData.customer?.email,
              phone: extractedData.customer?.phone,
            },
            lineItems:
              extractedData.items?.map((item: any) => ({
                description: item.description || "Item",
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                amount: item.amount || 0,
              })) || [],
            subtotal: extractedData.subtotal || 0,
            taxAmount: extractedData.taxAmount || 0,
            taxRate: extractedData.taxRate,
            discountAmount: extractedData.discount || 0,
            totalAmount: extractedData.total || 0,
            currency: extractedData.currency || business.currency,
            paymentTerms: extractedData.paymentTerms,
            paymentStatus: extractedData.paymentStatus || "unpaid",
            notes: extractedData.notes,
            originalImage: {
              base64: image,
              mimeType: this.detectMimeType(image),
              size: Buffer.from(
                image.includes('base64,') 
                  ? image.split('base64,')[1] 
                  : image,
                "base64"
              ).length,
            },
            metadata: {
              extractionConfidence: extractedData.confidence || 0.95,
              extractedAt: new Date(),
              ocrLanguage: "mixed",
              processingTimeMs: processingTime,
              aiModel: "gpt-4",
              extractionMethod: "ocr",
              extractedFields,
            },
          };

          savedInvoice = await Invoice.create(invoiceToSave);

          // Increment business usage with actual storage size
          const storageSizeMB = invoiceToSave.originalImage.size / (1024 * 1024); // Convert bytes to MB
          await business.incrementUsage("invoice", 1, storageSizeMB);

          logger.info(
            `Invoice ${savedInvoice.invoiceNumber} created for business ${business.name}`
          );
        } catch (error) {
          logger.error("Failed to save extracted invoice:", error);
          // Continue to return extracted data even if save fails
        }
      }

      res.status(200).json({
        status: "success",
        data: {
          extracted: extractedData,
          saved: savedInvoice
            ? {
                id: savedInvoice._id,
                invoiceNumber: savedInvoice.invoiceNumber,
                totalAmount: savedInvoice.totalAmount,
                currency: savedInvoice.currency,
              }
            : null,
        },
      });
    }
  );

  // Get all invoices for the business
  findAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const business = req.business;
    const {
      page = 1,
      limit = 20,
      type,
      status,
      paymentStatus,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      sortBy = "invoiceDate",
      sortOrder = "desc",
    } = req.query;

    const query: any = {
      business: business._id,
      isDeleted: false,
    };

    if (type) query.type = type;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {
      query.$text = { $search: search as string };
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate as string);
      if (endDate) query.invoiceDate.$lte = new Date(endDate as string);
    }

    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .select("-originalImage.base64 -metadata.ocrText"),
      Invoice.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        invoices,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  });

  // Get single invoice
  findById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const business = req.business;

      const invoice = await Invoice.findOne({
        _id: id,
        business: business._id,
        isDeleted: false,
      }).select("-originalImage.base64 -metadata.ocrText");

      if (!invoice) {
        res.status(404).json({
          status: "error",
          message: "Invoice not found",
        });
        return;
      }

      res.status(200).json({
        status: "success",
        data: invoice,
      });
    }
  );

  // Update invoice
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const business = req.business;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.business;
    delete updateData.originalImage;
    delete updateData.metadata;

    // Recalculate totals if line items are updated
    if (updateData.lineItems) {
      let subtotal = 0;
      updateData.lineItems.forEach((item: any) => {
        item.amount = item.quantity * item.unitPrice;
        subtotal += item.amount;
      });

      updateData.subtotal = subtotal;

      if (updateData.taxRate) {
        updateData.taxAmount = subtotal * (updateData.taxRate / 100);
      }

      if (updateData.discountRate) {
        updateData.discountAmount = subtotal * (updateData.discountRate / 100);
      }

      updateData.totalAmount =
        subtotal +
        (updateData.taxAmount || 0) -
        (updateData.discountAmount || 0);
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, business: business._id, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    ).select("-originalImage.base64 -metadata.ocrText");

    if (!invoice) {
      res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: invoice,
    });
  });

  // Delete invoice (soft delete)
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const business = req.business;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, business: business._id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!invoice) {
      res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Invoice deleted successfully",
    });
  });

  // Record payment
  recordPayment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const business = req.business;
      const { amount, paymentMethod, paymentDate, notes } = req.body;

      const invoice = await Invoice.findOne({
        _id: id,
        business: business._id,
        isDeleted: false,
      });

      if (!invoice) {
        res.status(404).json({
          status: "error",
          message: "Invoice not found",
        });
        return;
      }

      const newPaidAmount = (invoice.paidAmount || 0) + amount;

      if (newPaidAmount > invoice.totalAmount) {
        res.status(400).json({
          status: "error",
          message: "Payment amount exceeds invoice total",
        });
        return;
      }

      invoice.paidAmount = newPaidAmount;
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
      if (paymentDate) invoice.paymentDate = new Date(paymentDate);
      if (notes) {
        invoice.notes = invoice.notes ? `${invoice.notes}\n${notes}` : notes;
      }

      await invoice.save();

      res.status(200).json({
        status: "success",
        data: invoice,
      });
    }
  );

  // Get invoice statistics
  getStatistics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const business = req.business;
      const { period = "month" } = req.query;

      const statistics = await (Invoice as any).getStatisticsByBusiness(
        business._id,
        period as string
      );

      const result = statistics[0] || {
        overview: [
          {
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            averageAmount: 0,
          },
        ],
        byType: [],
        byStatus: [],
        byCurrency: [],
      };

      res.status(200).json({
        status: "success",
        data: {
          overview: result.overview[0] || {},
          breakdown: {
            byType: result.byType,
            byStatus: result.byStatus,
            byCurrency: result.byCurrency,
          },
        },
      });
    }
  );

  // Get invoice image
  getImage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const business = req.business;

      const invoice = await Invoice.findOne({
        _id: id,
        business: business._id,
        isDeleted: false,
      }).select("originalImage");

      if (!invoice) {
        res.status(404).json({
          status: "error",
          message: "Invoice not found",
        });
        return;
      }

      res.status(200).json({
        status: "success",
        data: {
          image: invoice.originalImage.base64,
          mimeType: invoice.originalImage.mimeType,
          size: invoice.originalImage.size,
        },
      });
    }
  );

  // Bulk operations
  bulkUpdate = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const business = req.business;
      const { ids, updates } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Invoice IDs array is required",
        });
        return;
      }

      // Remove fields that shouldn't be updated
      delete updates.business;
      delete updates.originalImage;
      delete updates.metadata;

      const result = await Invoice.updateMany(
        {
          _id: { $in: ids },
          business: business._id,
          isDeleted: false,
        },
        updates
      );

      res.status(200).json({
        status: "success",
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        },
      });
    }
  );

  // Register a new invoice from JSON data
  registerInvoice = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { type, invoiceData, originalImage } = req.body;
      const business = req.business;

      try {
        // Prepare the invoice object
        const invoiceToSave: any = {
          business: business._id,
          type,
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: this.parseDate(invoiceData.invoiceDate) || new Date(),
          dueDate: this.parseDate(invoiceData.dueDate),
          vendor: {
            name: invoiceData.vendor?.name,
            address: invoiceData.vendor?.address,
            taxId: invoiceData.vendor?.taxId,
            email: invoiceData.vendor?.email,
            phone: invoiceData.vendor?.phone,
          },
          customer: {
            name: invoiceData.customer?.name,
            address: invoiceData.customer?.address,
            taxId: invoiceData.customer?.taxId,
            email: invoiceData.customer?.email,
            phone: invoiceData.customer?.phone,
          },
          lineItems: invoiceData.lineItems?.map((item: any) => ({
            description: item.description || "Item",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: item.amount || item.quantity * item.unitPrice || 0,
          })) || [],
          subtotal: invoiceData.subtotal || 0,
          taxAmount: invoiceData.taxAmount || 0,
          taxRate: invoiceData.taxRate,
          discountAmount: invoiceData.discountAmount || 0,
          totalAmount: invoiceData.totalAmount || 0,
          currency: invoiceData.currency || business.currency,
          paymentTerms: invoiceData.paymentTerms,
          paymentStatus: invoiceData.paymentStatus || "unpaid",
          notes: invoiceData.notes,
          metadata: {
            extractionConfidence: invoiceData.confidence || 1.0,
            extractedAt: invoiceData.extractedAt || new Date(),
            source: "api_registration",
            registeredAt: new Date(),
          },
        };

        // Add original image if provided
        if (originalImage?.base64) {
          const base64Data = originalImage.base64.includes('base64,') 
            ? originalImage.base64.split('base64,')[1] 
            : originalImage.base64;
          
          invoiceToSave.originalImage = {
            base64: originalImage.base64,
            mimeType: originalImage.mimeType || this.detectMimeType(originalImage.base64),
            size: Buffer.from(base64Data, "base64").length,
          };
        }

        // Create the invoice
        const savedInvoice = await Invoice.create(invoiceToSave);

        // Increment business usage
        const storageSizeMB = invoiceToSave.originalImage?.size 
          ? invoiceToSave.originalImage.size / (1024 * 1024) 
          : 0;
        await business.incrementUsage("invoice", 1, storageSizeMB);

        logger.info(
          `Invoice ${savedInvoice.invoiceNumber} registered for business ${business.name} via API`
        );

        res.status(201).json({
          status: "success",
          data: {
            id: savedInvoice._id,
            invoiceNumber: savedInvoice.invoiceNumber,
            invoiceDate: savedInvoice.invoiceDate,
            vendor: savedInvoice.vendor,
            customer: savedInvoice.customer,
            totalAmount: savedInvoice.totalAmount,
            currency: savedInvoice.currency,
            paymentStatus: savedInvoice.paymentStatus,
            createdAt: savedInvoice.createdAt,
          },
        });
      } catch (error) {
        logger.error("Failed to register invoice:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to register invoice",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  private detectMimeType(base64: string): string {
    if (base64.startsWith("data:")) {
      const matches = base64.match(/^data:([^;]+);/);
      if (matches) return matches[1];
    }

    // Default to jpeg if can't detect
    return "image/jpeg";
  }

  private parseDate(dateStr: string | null | undefined): Date | undefined {
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return undefined;
  }
}
