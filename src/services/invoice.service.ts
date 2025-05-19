import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { createWorker } from "tesseract.js";
import type { Worker } from "tesseract.js";
import sharp from "sharp";
import { InvoiceData } from "../interfaces/invoice.interface";
import environment from "../config/environment";
import logger from "../config/logger";

export class InvoiceService {
  private model: ChatOpenAI;
  private parser: StructuredOutputParser<typeof invoiceSchema>;
  private worker: Worker | null = null;
  private arabicWorker: Worker | null = null;

  constructor() {
    this.model = new ChatOpenAI({
      openAIApiKey: environment.openai.apiKey,
      modelName: "gpt-4",
      temperature: 0,
      maxTokens: 4096,
    });

    this.parser = StructuredOutputParser.fromZodSchema(invoiceSchema);
    this.initializeOCR();
  }

  private async initializeOCR(): Promise<void> {
    try {
      // Initialize English worker
      this.worker = await createWorker();
      await this.worker.load();
      await this.worker.reinitialize("eng");

      // Initialize Arabic worker
      this.arabicWorker = await createWorker();
      await this.arabicWorker.load();
      await this.arabicWorker.reinitialize("ara");

      logger.info(
        "OCR workers initialized successfully for English and Arabic"
      );
    } catch (error) {
      logger.error("Failed to initialize OCR workers:", error);
      throw new Error("OCR initialization failed");
    }
  }

  private async preprocessImage(base64Image: string): Promise<Buffer> {
    try {
      // Remove the data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Preprocess the image for better OCR results
      const processedBuffer = await sharp(imageBuffer)
        .grayscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      logger.error("Image preprocessing failed:", error);
      throw new Error("Failed to preprocess image");
    }
  }

  private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    if (!this.worker || !this.arabicWorker) {
      throw new Error("OCR workers not initialized");
    }

    try {
      // Try both English and Arabic OCR
      const [englishResult, arabicResult] = await Promise.all([
        this.worker.recognize(imageBuffer),
        this.arabicWorker.recognize(imageBuffer),
      ]);

      // Combine the results, preferring non-empty text
      const englishText = englishResult.data.text.trim();
      const arabicText = arabicResult.data.text.trim();

      // If both have content, combine them
      if (englishText && arabicText) {
        return `${englishText}\n${arabicText}`;
      }

      // Return whichever has content, or empty string if neither
      return englishText || arabicText || "";
    } catch (error) {
      logger.error("OCR text extraction failed:", error);
      throw new Error("Failed to extract text from image");
    }
  }

  async extractInvoiceData(base64Image: string): Promise<InvoiceData> {
    try {
      // Step 1: Preprocess the image
      const processedImage = await this.preprocessImage(base64Image);

      // Step 2: Extract text using OCR
      const extractedText = await this.extractTextFromImage(processedImage);

      // Step 3: Process the extracted text with LLM
      const prompt = PromptTemplate.fromTemplate(`
        You are an expert at extracting structured data from invoice text.
        Analyze the following text extracted from an invoice and extract the information in a structured format.
        If any field is not present in the text, mark it as null.
        
        {format_instructions}
        
        Extracted Invoice Text:
        {text}
      `);

      const input = await prompt.format({
        format_instructions: this.parser.getFormatInstructions(),
        text: extractedText,
      });

      const response = await this.model.invoke(input);
      const responseContent =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      const parsedData = await this.parser.parse(responseContent);

      return {
        ...parsedData,
        confidence: 0.95, // This should be calculated based on OCR and LLM confidence
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Invoice data extraction failed:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    if (this.arabicWorker) {
      await this.arabicWorker.terminate();
      this.arabicWorker = null;
    }
  }
}

// Zod schema for invoice data validation
const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string().optional().nullable(),
  vendor: z.object({
    name: z.string(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }),
  customer: z.object({
    name: z.string(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }),
  subtotal: z.number(),
  taxAmount: z.number().optional().nullable(),
  taxRate: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  total: z.number(),
  currency: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number(),
    })
  ),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentStatus: z.enum(["paid", "unpaid", "partial"]).optional().nullable(),
});
