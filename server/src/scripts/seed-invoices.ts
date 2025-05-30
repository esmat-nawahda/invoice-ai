import mongoose from "mongoose";
import { Business } from "../models/business.model";
import { Invoice } from "../models/invoice.model";
import logger from "../config/logger";

async function seedInvoices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/invoice_ai"
    );
    logger.info("Connected to MongoDB");

    // Get all businesses
    const businesses = await Business.find().limit(5);

    if (businesses.length === 0) {
      logger.error("No businesses found. Please create some businesses first.");
      return;
    }

    // Sample invoice data
    const sampleInvoices = [
      {
        type: "received",
        invoiceNumber: "INV-001",
        invoiceDate: new Date("2024-01-15"),
        dueDate: new Date("2024-02-15"),
        vendor: {
          name: "Tech Supplies Co.",
          email: "billing@techsupplies.com",
          address: "123 Tech Street, San Francisco, CA",
        },
        customer: {
          name: "Sample Customer",
          email: "customer@example.com",
        },
        lineItems: [
          {
            description: "Laptop Computer",
            quantity: 2,
            unitPrice: 1200,
            amount: 2400,
          },
        ],
        subtotal: 2400,
        taxAmount: 200,
        totalAmount: 2600,
        currency: "USD",
        paymentStatus: "paid",
        status: "paid",
        originalImage: {
          base64: "dummy_base64_data",
          mimeType: "image/jpeg",
          size: 1024,
          filename: "invoice1.jpg",
        },
        metadata: {
          extractionConfidence: 0.95,
          extractedAt: new Date(),
          ocrLanguage: "eng",
          processingTimeMs: 1500,
          aiModel: "gpt-4",
          extractionMethod: "api",
        },
      },
      {
        type: "sent",
        invoiceNumber: "INV-002",
        invoiceDate: new Date("2024-01-20"),
        dueDate: new Date("2024-02-20"),
        vendor: {
          name: "My Business",
          email: "billing@mybusiness.com",
        },
        customer: {
          name: "Client Corp",
          email: "payments@clientcorp.com",
          address: "456 Business Ave, New York, NY",
        },
        lineItems: [
          {
            description: "Consulting Services",
            quantity: 40,
            unitPrice: 150,
            amount: 6000,
          },
        ],
        subtotal: 6000,
        taxAmount: 480,
        totalAmount: 6480,
        currency: "USD",
        paymentStatus: "unpaid",
        status: "pending",
        originalImage: {
          base64: "dummy_base64_data_2",
          mimeType: "image/png",
          size: 2048,
          filename: "invoice2.png",
        },
        metadata: {
          extractionConfidence: 0.88,
          extractedAt: new Date(),
          ocrLanguage: "eng",
          processingTimeMs: 2000,
          aiModel: "gpt-4",
          extractionMethod: "api",
        },
      },
      {
        type: "received",
        invoiceNumber: "INV-003",
        invoiceDate: new Date("2024-01-25"),
        vendor: {
          name: "Office Supplies Ltd",
          email: "invoices@officesupplies.com",
        },
        customer: {
          name: "Sample Customer",
          email: "customer@example.com",
        },
        lineItems: [
          {
            description: "Office Chairs",
            quantity: 5,
            unitPrice: 250,
            amount: 1250,
          },
          {
            description: "Desk Lamps",
            quantity: 10,
            unitPrice: 45,
            amount: 450,
          },
        ],
        subtotal: 1700,
        taxAmount: 136,
        totalAmount: 1836,
        currency: "USD",
        paymentStatus: "partial",
        status: "approved",
        originalImage: {
          base64: "dummy_base64_data_3",
          mimeType: "image/jpeg",
          size: 1536,
          filename: "invoice3.jpg",
        },
        metadata: {
          extractionConfidence: 0.92,
          extractedAt: new Date(),
          ocrLanguage: "eng",
          processingTimeMs: 1800,
          aiModel: "gpt-4",
          extractionMethod: "api",
        },
      },
    ];

    // Create invoices for each business
    let totalCreated = 0;
    for (const business of businesses) {
      for (const invoiceData of sampleInvoices) {
        const invoice = new Invoice({
          ...invoiceData,
          business: business._id,
          invoiceNumber: `${invoiceData.invoiceNumber}-${business.name.replace(/\s+/g, "-").toUpperCase()}`,
        });

        await invoice.save();
        totalCreated++;
        logger.info(
          `Created invoice ${invoice.invoiceNumber} for business ${business.name}`
        );
      }
    }

    logger.info(
      `Successfully created ${totalCreated} sample invoices across ${businesses.length} businesses`
    );

    // Display summary
    const totalInvoices = await Invoice.countDocuments();
    logger.info(`Total invoices in database: ${totalInvoices}`);

    // Show some sample queries
    for (const business of businesses) {
      const businessInvoiceCount = await Invoice.countDocuments({
        business: business._id,
      });
      logger.info(
        `Business "${business.name}" has ${businessInvoiceCount} invoices`
      );
    }
  } catch (error) {
    logger.error("Error seeding invoices:", error);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
}

// Run the seed function
seedInvoices().catch(console.error);
