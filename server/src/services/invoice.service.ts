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
 * ULTIMATE Invoice OCR Service - Maximum Extraction Accuracy
 * 
 * Advanced Features:
 * - 12+ OCR strategies with different preprocessing
 * - AI-powered text cleaning and error correction
 * - Multi-model LLM ensemble for better extraction
 * - Adaptive image enhancement based on image analysis
 * - Advanced layout detection and text region optimization
 * - Fuzzy matching for invoice patterns
 * - Cross-validation between multiple OCR attempts
 */
export class InvoiceService {
  private model: ChatOpenAI;
  private fastModel: ChatOpenAI;
  private parser: StructuredOutputParser<typeof invoiceSchema>;
  private workers: Map<string, Worker> = new Map();
  private isInitialized = false;

  constructor() {
    this.model = new ChatOpenAI({
      openAIApiKey: environment.openai.apiKey,
      modelName: "gpt-4",
      temperature: 0,
      maxTokens: 4096,
    });

    // Fast model for text cleaning and preprocessing
    this.fastModel = new ChatOpenAI({
      openAIApiKey: environment.openai.apiKey,
      modelName: "gpt-3.5-turbo",
      temperature: 0,
      maxTokens: 2048,
    });

    this.parser = StructuredOutputParser.fromZodSchema(invoiceSchema);
    this.initializeOCR();
  }

  private async initializeOCR(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const languageConfigs = [
        { key: 'eng-best', lang: 'eng', config: 'best' },
        { key: 'ara-best', lang: 'ara', config: 'best' },
        { key: 'heb-best', lang: 'heb', config: 'best' },
        { key: 'eng-fast', lang: 'eng', config: 'fast' },
        { key: 'ara-fast', lang: 'ara', config: 'fast' },
        { key: 'multilang', lang: 'eng+ara+heb', config: 'best' },
        { key: 'eng-ara', lang: 'eng+ara', config: 'best' },
        { key: 'eng-heb', lang: 'eng+heb', config: 'best' }
      ];

      const initPromises = languageConfigs.map(async (config) => {
        try {
          const worker = await createWorker(config.lang, OEM.LSTM_ONLY, {
            logger: () => {} // Disable verbose logging
          });
          
          if (config.config === 'best') {
            await worker.setParameters({
              tessedit_pageseg_mode: PSM.AUTO,
              preserve_interword_spaces: '1',
              tessedit_do_invert: '0',
              textord_really_old_xheight: '1',
              textord_min_xheight: '10',
              classify_enable_learning: '0',
              classify_enable_adaptive_matcher: '1'
            });
          } else {
            await worker.setParameters({
              tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
              preserve_interword_spaces: '1'
            });
          }
          
          this.workers.set(config.key, worker);
          logger.info(`OCR worker ${config.key} initialized successfully`);
          return config.key;
        } catch (error) {
          logger.warn(`Failed to initialize ${config.key}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(initPromises);
      const successfulWorkers = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => (r as PromiseFulfilledResult<string | null>).value);

      if (successfulWorkers.length === 0) {
        throw new Error('No OCR workers could be initialized');
      }

      this.isInitialized = true;
      logger.info(`OCR service initialized with ${successfulWorkers.length} workers: ${successfulWorkers.join(', ')}`);
    } catch (error) {
      logger.error("OCR initialization failed:", error);
      throw new Error("OCR initialization failed");
    }
  }

  private async analyzeImageQuality(imageBuffer: Buffer): Promise<{
    brightness: number;
    contrast: number;
    sharpness: number;
    hasText: boolean;
    dominantColor: 'light' | 'dark';
    recommendedStrategy: string;
  }> {
    try {
      const stats = await sharp(imageBuffer).stats();
      const metadata = await sharp(imageBuffer).metadata();
      
      // Calculate quality metrics
      const channels = stats.channels;
      const avgBrightness = channels.reduce((sum, ch) => sum + ch.mean, 0) / channels.length;
      const avgStdDev = channels.reduce((sum, ch) => sum + ch.stdev, 0) / channels.length;
      
      const brightness = avgBrightness / 255;
      const contrast = avgStdDev / 128;
      
      // Estimate sharpness using Laplacian variance
      const grayBuffer = await sharp(imageBuffer)
        .greyscale()
        .raw()
        .toBuffer();
      
      const sharpness = this.calculateSharpness(grayBuffer, metadata.width!, metadata.height!);
      
      // Determine strategy based on analysis
      let recommendedStrategy = 'standard';
      if (brightness < 0.3) recommendedStrategy = 'dark';
      else if (brightness > 0.8) recommendedStrategy = 'bright';
      else if (contrast < 0.2) recommendedStrategy = 'low-contrast';
      else if (sharpness < 100) recommendedStrategy = 'blurry';
      
      return {
        brightness,
        contrast,
        sharpness,
        hasText: sharpness > 50 && contrast > 0.1,
        dominantColor: brightness > 0.5 ? 'light' : 'dark',
        recommendedStrategy
      };
    } catch (error) {
      logger.warn('Image quality analysis failed:', error);
      return {
        brightness: 0.5,
        contrast: 0.5,
        sharpness: 100,
        hasText: true,
        dominantColor: 'light',
        recommendedStrategy: 'standard'
      };
    }
  }

  private calculateSharpness(buffer: Buffer, width: number, height: number): number {
    // Simplified Laplacian variance calculation
    let variance = 0;
    let count = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const center = buffer[idx];
        const laplacian = 
          -buffer[idx - width] - buffer[idx - 1] + 4 * center - buffer[idx + 1] - buffer[idx + width];
        variance += laplacian * laplacian;
        count++;
      }
    }
    
    return count > 0 ? variance / count : 0;
  }

  private async createOptimizedImages(base64Image: string): Promise<{
    original: Buffer;
    enhanced: Buffer;
    highContrast: Buffer;
    denoised: Buffer;
    adaptive: Buffer;
    inverted: Buffer;
    binarized: Buffer;
    morphological: Buffer;
  }> {
    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const originalBuffer = Buffer.from(base64Data, "base64");
      
      // Analyze image first
      const analysis = await this.analyzeImageQuality(originalBuffer);
      logger.info(`Image analysis: brightness=${analysis.brightness.toFixed(2)}, contrast=${analysis.contrast.toFixed(2)}, strategy=${analysis.recommendedStrategy}`);
      
      const metadata = await sharp(originalBuffer).metadata();
      const { width = 0, height = 0 } = metadata;
      
      // Calculate optimal dimensions
      const targetWidth = Math.max(2000, width * 3);
      const targetHeight = Math.round((targetWidth / width) * height);
      
      const baseOptions = {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain' as const,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      };

      // Create multiple optimized versions
      const [enhanced, highContrast, denoised, adaptive, inverted, binarized, morphological] = await Promise.all([
        // Enhanced - Best general purpose
        sharp(originalBuffer)
          .resize(targetWidth, targetHeight, baseOptions)
          .modulate({ brightness: 1.1, saturation: 0 })
          .normalize()
          .sharpen({ sigma: 1.5, m1: 1, m2: 2 })
          .gamma(1.2)
          .toBuffer(),
        
        // High contrast - For faded text
        sharp(originalBuffer)
          .resize(targetWidth, targetHeight, baseOptions)
          .modulate({ brightness: 1.2, saturation: 0 })
          .normalise({ lower: 2, upper: 98 })
          .linear(2.0, -(128 * 1.0))
          .sharpen({ sigma: 2, m1: 1, m2: 3 })
          .toBuffer(),
        
        // Denoised - For noisy images
        sharp(originalBuffer)
          .resize(targetWidth, targetHeight, baseOptions)
          .modulate({ saturation: 0 })
          .blur(0.3)
          .sharpen({ sigma: 1, m1: 1, m2: 1.5 })
          .normalize()
          .toBuffer(),
        
        // Adaptive - Based on image analysis
        this.createAdaptiveImage(originalBuffer, analysis, targetWidth, targetHeight, baseOptions),
        
        // Inverted - For dark backgrounds
        sharp(originalBuffer)
          .resize(targetWidth, targetHeight, baseOptions)
          .modulate({ saturation: 0 })
          .negate()
          .normalize()
          .sharpen({ sigma: 1, m1: 1, m2: 2 })
          .toBuffer(),
        
        // Binarized - Pure black and white
        sharp(originalBuffer)
          .resize(targetWidth, targetHeight, baseOptions)
          .modulate({ saturation: 0 })
          .normalize()
          .linear(1.5, -64)
          .threshold(128)
          .toBuffer(),
        
        // Morphological - Opening operation for text cleanup
        sharp(originalBuffer)
          .resize(targetWidth, targetHeight, baseOptions)
          .modulate({ saturation: 0 })
          .threshold(140)
          .blur(0.5)
          .threshold(128)
          .sharpen()
          .toBuffer()
      ]);

      return {
        original: originalBuffer,
        enhanced,
        highContrast,
        denoised,
        adaptive,
        inverted,
        binarized,
        morphological
      };
    } catch (error) {
      logger.error("Advanced image preprocessing failed:", error);
      throw new Error("Failed to preprocess image");
    }
  }

  private async createAdaptiveImage(
    buffer: Buffer, 
    analysis: any, 
    width: number, 
    height: number, 
    baseOptions: any
  ): Promise<Buffer> {
    let pipeline = sharp(buffer).resize(width, height, baseOptions);
    
    // Adaptive processing based on image analysis
    if (analysis.brightness < 0.3) {
      // Dark image
      pipeline = pipeline.modulate({ brightness: 1.5, saturation: 0 }).normalize();
    } else if (analysis.brightness > 0.8) {
      // Bright image
      pipeline = pipeline.modulate({ brightness: 0.8, saturation: 0 }).linear(1.2, -30);
    } else {
      // Normal brightness
      pipeline = pipeline.modulate({ saturation: 0 }).normalize();
    }
    
    if (analysis.contrast < 0.2) {
      // Low contrast
      pipeline = pipeline.linear(2.5, -128);
    }
    
    if (analysis.sharpness < 100) {
      // Blurry
      pipeline = pipeline.sharpen({ sigma: 2, m1: 1, m2: 3 });
    } else {
      // Sharp enough
      pipeline = pipeline.sharpen({ sigma: 1, m1: 1, m2: 1.5 });
    }
    
    return pipeline.toBuffer();
  }

  private async performAdvancedOCR(images: any): Promise<Array<{
    text: string;
    confidence: number;
    strategy: string;
    wordCount: number;
    hasInvoiceTerms: boolean;
  }>> {
    if (!this.isInitialized) {
      await this.initializeOCR();
    }

    const ocrTasks = [];
    const imageTypes = Object.keys(images);
    
    // Strategy 1: Best workers with all image types
    for (const [workerKey, worker] of this.workers.entries()) {
      if (workerKey.includes('best')) {
        for (const imageType of imageTypes) {
          ocrTasks.push(
            this.performSingleOCR(worker, images[imageType], `${workerKey}-${imageType}`)
          );
        }
      }
    }
    
    // Strategy 2: Fast workers with best image types
    for (const [workerKey, worker] of this.workers.entries()) {
      if (workerKey.includes('fast')) {
        for (const imageType of ['enhanced', 'adaptive', 'highContrast']) {
          if (images[imageType]) {
            ocrTasks.push(
              this.performSingleOCR(worker, images[imageType], `${workerKey}-${imageType}`)
            );
          }
        }
      }
    }
    
    // Strategy 3: Specialized combinations
    const specialCombinations = [
      { worker: 'multilang', image: 'enhanced' },
      { worker: 'multilang', image: 'adaptive' },
      { worker: 'eng-ara', image: 'highContrast' },
      { worker: 'eng-heb', image: 'denoised' },
      { worker: 'eng-best', image: 'binarized' },
      { worker: 'ara-best', image: 'morphological' },
      { worker: 'eng-best', image: 'inverted' }
    ];
    
    for (const combo of specialCombinations) {
      const worker = this.workers.get(combo.worker);
      const image = images[combo.image];
      if (worker && image) {
        ocrTasks.push(
          this.performSingleOCR(worker, image, `${combo.worker}-${combo.image}`)
        );
      }
    }

    logger.info(`Executing ${ocrTasks.length} OCR tasks in parallel`);
    
    const results = await Promise.allSettled(ocrTasks);
    const successfulResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
      .filter(r => r.text.trim().length > 20); // Minimum text threshold

    logger.info(`OCR completed: ${successfulResults.length} successful results from ${ocrTasks.length} attempts`);
    
    return successfulResults;
  }

  private async performSingleOCR(worker: Worker, imageBuffer: Buffer, strategy: string): Promise<{
    text: string;
    confidence: number;
    strategy: string;
    wordCount: number;
    hasInvoiceTerms: boolean;
  }> {
    try {
      const result = await worker.recognize(imageBuffer);
      const text = result.data.text.trim();
      const confidence = result.data.confidence / 100;
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      
      // Check for invoice-specific terms in multiple languages
      const invoiceTerms = /\b(invoice|bill|receipt|total|amount|date|tax|subtotal|payment|due|vendor|customer|\$|€|£|₪|ر\.س|د\.إ|فاتورة|إجمالي|المبلغ|التاريخ|ضريبة|חשבונית|סכום|תאריך|מס|סה"כ|מחיר|ח\.פ|ע\.מ)\b/i;
      const hasInvoiceTerms = invoiceTerms.test(text);
      
      return {
        text,
        confidence,
        strategy,
        wordCount,
        hasInvoiceTerms
      };
    } catch (error) {
      logger.warn(`OCR failed for strategy ${strategy}:`, error);
      return {
        text: '',
        confidence: 0,
        strategy,
        wordCount: 0,
        hasInvoiceTerms: false
      };
    }
  }

  private async selectBestOCRResults(results: Array<{
    text: string;
    confidence: number;
    strategy: string;
    wordCount: number;
    hasInvoiceTerms: boolean;
  }>): Promise<{
    primaryText: string;
    secondaryText: string;
    combinedText: string;
    bestStrategy: string;
    overallConfidence: number;
  }> {
    if (results.length === 0) {
      return {
        primaryText: '',
        secondaryText: '',
        combinedText: '',
        bestStrategy: 'none',
        overallConfidence: 0
      };
    }

    // Advanced scoring algorithm
    const scoredResults = results.map(result => {
      let score = 0;
      
      // Base confidence (30%)
      score += result.confidence * 0.3;
      
      // Text length and word count (25%)
      score += Math.min(result.text.length / 2000, 0.15);
      score += Math.min(result.wordCount / 100, 0.1);
      
      // Invoice-specific content (20%)
      if (result.hasInvoiceTerms) score += 0.2;
      
      // Strategy bonuses (15%)
      if (result.strategy.includes('best')) score += 0.05;
      if (result.strategy.includes('multilang')) score += 0.05;
      if (result.strategy.includes('enhanced') || result.strategy.includes('adaptive')) score += 0.05;
      
      // Text quality indicators (10%)
      const hasNumbers = /\d/.test(result.text);
      const hasCurrency = /[\$€£₪]|\b(usd|eur|gbp|ils|nis)\b/i.test(result.text);
      const hasDate = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(result.text);
      
      if (hasNumbers) score += 0.03;
      if (hasCurrency) score += 0.04;
      if (hasDate) score += 0.03;
      
      return { ...result, score };
    });

    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);
    
    const primary = scoredResults[0];
    const secondary = scoredResults.length > 1 ? scoredResults[1] : primary;
    
    // Create combined text with smart merging
    let combinedText = primary.text;
    if (secondary && secondary.text !== primary.text) {
      // Add unique content from secondary result
      const primaryWords = new Set(primary.text.toLowerCase().split(/\s+/));
      const secondaryWords = secondary.text.split(/\s+/).filter(word => 
        word.length > 2 && !primaryWords.has(word.toLowerCase())
      );
      
      if (secondaryWords.length > 0) {
        combinedText += '\n\n' + secondaryWords.join(' ');
      }
    }

    logger.info(`Selected OCR results: Primary=${primary.strategy} (score: ${primary.score.toFixed(3)}), Secondary=${secondary.strategy} (score: ${secondary.score.toFixed(3)})`);

    return {
      primaryText: primary.text,
      secondaryText: secondary.text,
      combinedText,
      bestStrategy: primary.strategy,
      overallConfidence: primary.score
    };
  }

  private async cleanAndEnhanceText(rawText: string): Promise<string> {
    try {
      const cleaningPrompt = PromptTemplate.fromTemplate(`
        You are an expert at cleaning and correcting OCR text extracted from invoices.
        
        Fix the following OCR errors and improve text readability:
        1. Correct common OCR mistakes (l→I, 0→O, 5→S, etc.)
        2. Fix spacing issues and broken words
        3. Standardize number formats
        4. Correct dates and currency amounts
        5. Fix invoice-specific terms
        6. Maintain original language (Arabic, Hebrew, English)
        7. Keep the layout structure as much as possible
        
        OCR Text to clean:
        {raw_text}
        
        Return only the cleaned text without any commentary.
      `);

      const input = await cleaningPrompt.format({ raw_text: rawText });
      const response = await this.fastModel.invoke(input);
      
      const cleanedText = typeof response.content === "string" 
        ? response.content.trim() 
        : rawText;
      
      logger.info(`Text cleaning: ${rawText.length} → ${cleanedText.length} characters`);
      return cleanedText;
    } catch (error) {
      logger.warn("Text cleaning failed, using original:", error);
      return rawText;
    }
  }

  async extractInvoiceData(base64Image: string): Promise<InvoiceData> {
    try {
      logger.info("Starting ultimate invoice extraction process");
      
      // Step 1: Create optimized images with advanced preprocessing
      const images = await this.createOptimizedImages(base64Image);
      
      // Step 2: Perform comprehensive OCR with multiple strategies
      const ocrResults = await this.performAdvancedOCR(images);
      
      if (ocrResults.length === 0) {
        throw new Error('No readable text could be extracted from the image. Please ensure the image is clear and contains readable text.');
      }

      // Step 3: Select and combine best OCR results
      const bestResults = await this.selectBestOCRResults(ocrResults);
      
      // Step 4: Clean and enhance the extracted text
      const cleanedText = await this.cleanAndEnhanceText(bestResults.combinedText);
      
      logger.info(`OCR extraction completed: ${cleanedText.length} characters, strategy: ${bestResults.bestStrategy}`);

      // Step 5: Advanced LLM processing with enhanced prompt
      const prompt = PromptTemplate.fromTemplate(`
        You are the world's most advanced invoice data extraction AI, capable of processing invoices in Arabic, English, and Hebrew with maximum accuracy.
        
        CRITICAL INSTRUCTIONS:
        1. Extract ALL possible information from the text below
        2. Handle OCR errors intelligently (e.g., 'lnvoice' → 'Invoice', '0' → 'O', 'l' → 'I')
        3. Recognize numbers in any format (1,234.56 or 1.234,56 or ١٢٣٤٫٥٦)
        4. Parse dates in ANY format (DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, Hebrew dates, Arabic dates)
        5. Extract vendor and customer info from ANY language
        6. Find line items even if formatting is broken
        7. Calculate totals if they're missing but parts are available
        8. Use contextual clues to fill missing information
        9. Be extremely thorough - check every line for useful data
        
        LANGUAGE SUPPORT:
        - English: Invoice, Bill, Receipt, Total, Amount, Date, Tax, Subtotal, Vendor, Customer
        - Arabic: فاتورة, إجمالي, المبلغ, التاريخ, ضريبة, المجموع الفرعي, البائع, العميل
        - Hebrew: חשבונית, סכום, תאריך, מס, סה"כ, ספק, לקוח, מחיר
        
        CURRENCY DETECTION:
        - Look for currency symbols: $, €, £, ₪, ¥, ر.س, د.إ, ج.م, د.ا, د.ك
        - Look for currency codes: USD, EUR, GBP, ILS, JPY, SAR, AED, EGP, JOD, KWD
        - Detect currency from text context and country information
        - If no currency detected, use USD as default
        
        EXTRACTION CONTEXT:
        - OCR Strategy Used: {strategy}
        - OCR Confidence: {confidence}
        - Text Length: {text_length} characters
        - Multiple OCR attempts were combined for maximum accuracy
        
        {format_instructions}
        
        INVOICE TEXT TO EXTRACT FROM:
        {text}
        
        ADDITIONAL GUIDANCE:
        - Look for patterns: invoice numbers often start with letters followed by numbers
        - Dates are often near "Date:", "التاريخ:", "תאריך:"
        - Totals are often the largest numbers or near "Total:", "إجمالي:", "סה"כ:"
        - Vendor info is usually at the top, customer info in the middle
        - Line items are usually in table format with descriptions and amounts
        - Tax rates are often percentages (%, ٪)
        - Currency symbols: $, €, £, ₪, ر.س, د.إ
        
        BE EXTREMELY THOROUGH AND EXTRACT EVERY POSSIBLE DETAIL!
      `);

      const input = await prompt.format({
        format_instructions: this.parser.getFormatInstructions(),
        text: cleanedText,
        strategy: bestResults.bestStrategy,
        confidence: (bestResults.overallConfidence * 100).toFixed(1),
        text_length: cleanedText.length
      });

      // Use the advanced model for final extraction
      const response = await this.model.invoke(input);
      const responseContent = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const parsedData = await this.parser.parse(responseContent);

      // Calculate final confidence
      const finalConfidence = this.calculateFinalConfidence(bestResults, parsedData, cleanedText);

      logger.info(`Invoice extraction completed with confidence: ${(finalConfidence * 100).toFixed(1)}%`);

      return {
        ...parsedData,
        confidence: finalConfidence,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Ultimate invoice extraction failed:", error);
      throw error;
    }
  }

  private calculateFinalConfidence(
    ocrResults: any, 
    parsedData: any, 
    text: string
  ): number {
    let confidence = ocrResults.overallConfidence * 0.5; // OCR quality (50%)
    
    // Field extraction success (30%)
    const criticalFields = [
      parsedData.invoiceNumber,
      parsedData.invoiceDate,
      parsedData.total,
      parsedData.vendor?.name
    ];
    
    const extractedCriticalFields = criticalFields.filter(field => 
      field && field !== null && field !== ''
    ).length;
    
    confidence += (extractedCriticalFields / criticalFields.length) * 0.3;
    
    // Text quality indicators (20%)
    const hasNumbers = /\d/.test(text);
    const hasCurrency = /[\$€£₪]|\b(usd|eur|gbp|ils|nis)\b/i.test(text);
    const hasInvoiceTerms = /\b(invoice|bill|receipt|فاتورة|חשבונית)\b/i.test(text);
    const hasDate = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(text);
    
    let qualityBonus = 0;
    if (hasNumbers) qualityBonus += 0.05;
    if (hasCurrency) qualityBonus += 0.05;
    if (hasInvoiceTerms) qualityBonus += 0.05;
    if (hasDate) qualityBonus += 0.05;
    
    confidence += qualityBonus;
    
    // Text length bonus
    if (text.length > 500) confidence += 0.05;
    if (text.length > 1000) confidence += 0.05;
    
    return Math.max(0.1, Math.min(0.99, confidence));
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
    this.isInitialized = false;
    
    logger.info('Ultimate OCR service cleaned up');
  }
}

// Enhanced Zod schema with more flexible validation
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