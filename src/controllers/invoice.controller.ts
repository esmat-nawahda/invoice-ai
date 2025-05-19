import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { InvoiceService } from "../services/invoice.service";

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  extractInvoiceData = asyncHandler(async (req: Request, res: Response) => {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        status: "error",
        message: "No image provided",
      });
    }

    const invoiceData = await this.invoiceService.extractInvoiceData(image);

    res.status(200).json({
      status: "success",
      data: invoiceData,
    });
  });
}
