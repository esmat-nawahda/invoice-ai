import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { createWorker, PSM, OEM } from "tesseract.js";
import type { Worker } from "tesseract.js";
import sharp from "sharp";
import { InvoiceData } from "../interfaces/invoice.interface";
import environment from "../config/environment";
import logger from "../config/logger";

/**
 * Enhanced Invoice Service with Advanced Multilingual OCR Support
 * 
 * Features:
 * - Multi-language OCR support (Arabic, English, Hebrew)
 * - Advanced image preprocessing with multiple enhancement strategies
 * - Intelligent OCR result selection based on confidence and content quality
 * - Robust error handling and fallback mechanisms
 * - Smart text extraction with OCR error correction
 * 
 * Supported Languages:
 * - English (eng): Latin script, left-to-right
 * - Arabic (ara): Arabic script, right-to-left
 * - Hebrew (heb): Hebrew script, right-to-left
 * - Mixed language combinations for maximum accuracy
 * 
 * OCR Strategies:
 * 1. Multilingual workers (eng+ara+heb) for mixed-language invoices
 * 2. Individual language workers for language-specific content
 * 3. Language pair workers for bilingual documents
 * 4. Multiple image preprocessing techniques
 * 5. Confidence-based result selection
 * 6. Emergency fallback with relaxed OCR settings
 */
export class InvoiceService {
  private model: ChatOpenAI;
  private parser: StructuredOutputParser<typeof invoiceSchema>;
  private workers: Map<string, Worker> = new Map();
  private readonly SUPPORTED_LANGUAGES = ['eng', 'ara', 'heb', 'eng+ara', 'eng+heb', 'ara+heb', 'eng+ara+heb'];

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
      // Initialize workers for different language combinations
      const languageConfigs = [
        { key: 'eng', lang: 'eng' },
        { key: 'ara', lang: 'ara' },
        { key: 'heb', lang: 'heb' },
        { key: 'eng+ara', lang: 'eng+ara' },
        { key: 'eng+heb', lang: 'eng+heb' },
        { key: 'multilang', lang: 'eng+ara+heb' }
      ];

      for (const config of languageConfigs) {
        try {
          const worker = await createWorker();
          await worker.load();
          await worker.reinitialize(config.lang);
          
          // Configure worker for better accuracy
          await worker.setParameters({
            tessedit_char_whitelist: '',
            tessedit_pageseg_mode: PSM.AUTO_OSD, // Automatic page segmentation with OSD
            tessedit_ocr_engine_mode: OEM.LSTM_ONLY, // Neural nets LSTM engine only
            preserve_interword_spaces: '1'
          });
          
          this.workers.set(config.key, worker);
          logger.info(`OCR worker initialized for ${config.key}`);
        } catch (error) {
          logger.warn(`Failed to initialize ${config.key} worker:`, error);
          
          // Provide helpful error message for missing language data
          if (error instanceof Error && error.message.includes('404')) {
            logger.warn(`Language data for ${config.lang} may be missing. Ensure .traineddata files are available.`);
          }
        }
      }

      if (this.workers.size === 0) {
        throw new Error('No OCR workers could be initialized');
      }

      logger.info(`OCR workers initialized successfully for ${this.workers.size} language configurations`);
    } catch (error) {
      logger.error("Failed to initialize OCR workers:", error);
      throw new Error("OCR initialization failed");
    }
  }

  private async preprocessImage(base64Image: string): Promise<{ original: Buffer; enhanced: Buffer; highContrast: Buffer }> {
    try {
      // Remove the data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 0, height = 0 } = metadata;

      // Calculate target size (min 1200px width for better OCR)
      const targetWidth = Math.max(1200, width * 2);
      const targetHeight = Math.round((targetWidth / width) * height);

      // Create multiple versions for different OCR attempts
      const [enhanced, highContrast] = await Promise.all([
        // Enhanced version - best for clear text
        sharp(imageBuffer)
          .resize(targetWidth, targetHeight, { 
            kernel: sharp.kernel.lanczos3,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .grayscale()
          .normalize()
          .sharpen({ sigma: 1, m1: 1, m2: 2 })
          .gamma(1.2)
          .toBuffer(),
        
        // High contrast version - better for faded/low quality text
        sharp(imageBuffer)
          .resize(targetWidth, targetHeight, { 
            kernel: sharp.kernel.lanczos3,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .grayscale()
          .normalise({ lower: 1, upper: 99 })
          .linear(1.5, -(128 * 0.5))
          .sharpen({ sigma: 1.5, m1: 1, m2: 3 })
          .threshold(128)
          .toBuffer()
      ]);

      return {
        original: imageBuffer,
        enhanced,
        highContrast
      };
    } catch (error) {
      logger.error("Image preprocessing failed:", error);
      throw new Error("Failed to preprocess image");
    }
  }

  private async extractTextFromImage(imageBuffers: { original: Buffer; enhanced: Buffer; highContrast: Buffer }): Promise<{ text: string; confidence: number; language: string }> {
    if (this.workers.size === 0) {
      throw new Error("OCR workers not initialized");
    }

    try {
      const ocrResults: Array<{ text: string; confidence: number; language: string }> = [];
      
      // Try different language combinations with different image preprocessing
      const ocrTasks = [];
      
      // Strategy 1: Try multilingual worker first with enhanced image
      if (this.workers.has('multilang')) {
        ocrTasks.push(
          this.performOCR(this.workers.get('multilang')!, imageBuffers.enhanced, 'eng+ara+heb')
        );
      }
      
      // Strategy 2: Try individual languages with enhanced image
      for (const lang of ['eng', 'ara', 'heb']) {
        if (this.workers.has(lang)) {
          ocrTasks.push(
            this.performOCR(this.workers.get(lang)!, imageBuffers.enhanced, lang)
          );
        }
      }
      
      // Strategy 3: Try language pairs with high contrast image
      for (const lang of ['eng+ara', 'eng+heb']) {
        if (this.workers.has(lang)) {
          ocrTasks.push(
            this.performOCR(this.workers.get(lang)!, imageBuffers.highContrast, lang)
          );
        }
      }
      
      // Strategy 4: Fallback with original image
      if (this.workers.has('eng')) {
        ocrTasks.push(
          this.performOCR(this.workers.get('eng')!, imageBuffers.original, 'eng-fallback')
        );
      }

      // Execute all OCR tasks
      const results = await Promise.allSettled(ocrTasks);
      
      // Collect successful results
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.text.trim().length > 10) {
          ocrResults.push(result.value);
        }
      }

      if (ocrResults.length === 0) {
        logger.warn('No successful OCR results, attempting emergency fallback');
        // Emergency fallback with relaxed parameters
        if (this.workers.has('eng')) {
          const fallbackResult = await this.performOCRWithRelaxedSettings(
            this.workers.get('eng')!, 
            imageBuffers.enhanced
          );
          if (fallbackResult.text.trim()) {
            ocrResults.push({ ...fallbackResult, language: 'eng-emergency' });
          }
        }
      }

      // Select best result based on confidence and text length
      const bestResult = this.selectBestOCRResult(ocrResults);
      
      logger.info(`OCR completed with ${ocrResults.length} results, best: ${bestResult.language} (confidence: ${bestResult.confidence})`);
      
      return bestResult;
    } catch (error) {
      logger.error("OCR text extraction failed:", error);
      throw new Error("Failed to extract text from image");
    }
  }

  private async performOCR(worker: Worker, imageBuffer: Buffer, language: string): Promise<{ text: string; confidence: number; language: string }> {
    try {
      const result = await worker.recognize(imageBuffer);
      const text = result.data.text.trim();
      const confidence = result.data.confidence / 100; // Convert to 0-1 scale
      
      return { text, confidence, language };
    } catch (error) {
      logger.warn(`OCR failed for language ${language}:`, error);
      return { text: '', confidence: 0, language };
    }
  }

  private async performOCRWithRelaxedSettings(worker: Worker, imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      // Temporarily set more permissive settings
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Uniform block of text
        tessedit_ocr_engine_mode: OEM.DEFAULT, // Legacy + LSTM engines
        tessedit_char_blacklist: '',
        tessedit_char_whitelist: ''
      });
      
      const result = await worker.recognize(imageBuffer);
      
      // Restore default settings
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO_OSD,
        tessedit_ocr_engine_mode: OEM.LSTM_ONLY
      });
      
      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence / 100
      };
    } catch (error) {
      logger.error('Emergency OCR failed:', error);
      return { text: '', confidence: 0 };
    }
  }

  private selectBestOCRResult(results: Array<{ text: string; confidence: number; language: string }>): { text: string; confidence: number; language: string } {
    if (results.length === 0) {
      return { text: '', confidence: 0, language: 'none' };
    }

    if (results.length === 1) {
      return results[0];
    }

    // Score results based on multiple factors
    const scoredResults = results.map(result => {
      const textLength = result.text.length;
      const wordCount = result.text.split(/\s+/).length;
      const hasNumbers = /\d/.test(result.text);
      const hasCommonInvoiceTerms = /\b(invoice|bill|receipt|total|amount|date|tax|subtotal|\$|€|£|₪|ر\.س|د\.إ)\b/i.test(result.text);
      
      let score = result.confidence * 0.4; // Base confidence weight
      score += Math.min(textLength / 1000, 0.3); // Text length (up to 30%)
      score += Math.min(wordCount / 50, 0.2); // Word count (up to 20%)
      score += hasNumbers ? 0.05 : 0; // Bonus for numbers
      score += hasCommonInvoiceTerms ? 0.05 : 0; // Bonus for invoice terms
      
      return { ...result, score };
    });

    // Sort by score and return the best
    scoredResults.sort((a, b) => b.score - a.score);
    
    const bestResult = scoredResults[0];
    logger.info(`Selected OCR result: ${bestResult.language} (score: ${bestResult.score.toFixed(3)}, confidence: ${bestResult.confidence.toFixed(3)})`);
    
    return bestResult;
  }

  async extractInvoiceData(base64Image: string): Promise<InvoiceData> {
    try {
      // Step 1: Preprocess the image with multiple enhancement strategies
      const processedImages = await this.preprocessImage(base64Image);

      // Step 2: Extract text using advanced multilingual OCR
      const ocrResult = await this.extractTextFromImage(processedImages);
      
      if (!ocrResult.text.trim()) {
        logger.warn('OCR extracted no readable text from image');
        throw new Error('No readable text could be extracted from the image. Please ensure the image is clear and contains readable text.');
      }

      logger.info(`OCR extracted ${ocrResult.text.length} characters using ${ocrResult.language}`);

      // Step 3: Process the extracted text with enhanced LLM prompt
      const prompt = PromptTemplate.fromTemplate(`
        You are an expert at extracting structured data from invoice text that may contain Arabic, English, or Hebrew.
        The text below was extracted from an invoice image using OCR and may contain:
        - Mixed languages (Arabic, English, Hebrew)
        - OCR errors or misrecognized characters
        - Numbers in different formats
        - Dates in various formats
        - Currency symbols (₪, $, €, £, ر.س, د.إ, etc.)
        
        Instructions:
        1. Carefully analyze the text and extract invoice information
        2. Handle OCR errors intelligently (e.g., 'lnvoice' → 'Invoice', '0' → 'O')
        3. Recognize dates in multiple formats (DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.)
        4. Identify currency amounts even with OCR errors
        5. Extract vendor and customer information from any language
        6. If field content is unclear or missing, mark as null
        7. For line items, extract as much detail as possible
        
        Language context: OCR was performed using {language}
        OCR confidence: {confidence}
        
        {format_instructions}
        
        Extracted Invoice Text:
        {text}
        
        Additional guidance:
        - Look for common invoice keywords in multiple languages:
          * English: Invoice, Bill, Receipt, Total, Amount, Date, Tax, Subtotal
          * Arabic: فاتورة, إجمالي, المبلغ, التاريخ, ضريبة, المجموع الفرعي
          * Hebrew: חשבונית, סכום, תאריך, מס, סה"כ
        - Be flexible with number formats (1,234.56 or 1.234,56 or ١٢٣٤٫٥٦)
        - Handle RTL (right-to-left) text layout considerations
      `);

      const input = await prompt.format({
        format_instructions: this.parser.getFormatInstructions(),
        text: ocrResult.text,
        language: ocrResult.language,
        confidence: ocrResult.confidence.toFixed(2)
      });

      const response = await this.model.invoke(input);
      const responseContent =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      const parsedData = await this.parser.parse(responseContent);

      // Calculate overall confidence based on OCR and text quality
      const overallConfidence = this.calculateOverallConfidence(ocrResult, parsedData);

      logger.info(`Invoice extraction completed with confidence: ${overallConfidence.toFixed(2)}`);

      return {
        ...parsedData,
        confidence: overallConfidence,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Invoice data extraction failed:", error);
      throw error;
    }
  }

  private calculateOverallConfidence(ocrResult: { confidence: number; text: string }, parsedData: any): number {
    let confidence = ocrResult.confidence * 0.6; // OCR confidence weight
    
    // Bonus for successfully extracted fields
    const extractedFields = [
      parsedData.invoiceNumber,
      parsedData.invoiceDate,
      parsedData.total,
      parsedData.vendor?.name,
      parsedData.customer?.name
    ].filter(field => field && field !== null && field !== '');
    
    confidence += (extractedFields.length / 5) * 0.3; // Field extraction bonus
    
    // Bonus for reasonable text length
    if (ocrResult.text.length > 100) {
      confidence += 0.05;
    }
    
    // Penalty for very short text (likely poor OCR)
    if (ocrResult.text.length < 50) {
      confidence -= 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  async cleanup(): Promise<void> {
    const terminationPromises = [];
    
    for (const [key, worker] of this.workers.entries()) {
      terminationPromises.push(
        worker.terminate().then(() => {
          logger.info(`OCR worker ${key} terminated`);
        }).catch(error => {
          logger.warn(`Error terminating OCR worker ${key}:`, error);
        })
      );
    }
    
    await Promise.all(terminationPromises);
    this.workers.clear();
    
    logger.info('All OCR workers cleaned up');
  }
}

// Zod schema for invoice data validation
const invoiceSchema = z.object({
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  vendor: z.object({
    name: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }),
  customer: z.object({
    name: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }),
  subtotal: z.number().optional().nullable(),
  taxAmount: z.number().optional().nullable(),
  taxRate: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  total: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        description: z.string().optional().nullable(),
        quantity: z.number().optional().nullable(),
        unitPrice: z.number().optional().nullable(),
        amount: z.number().optional().nullable(),
      })
    )
    .optional()
    .nullable(),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentStatus: z.enum(["paid", "unpaid", "partial"]).optional().nullable(),
});
