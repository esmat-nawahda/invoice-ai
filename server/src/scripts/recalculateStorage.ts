import mongoose from 'mongoose';
import { Invoice } from '../models/invoice.model';
import { Business } from '../models/business.model';
import config from '../config/environment';
import logger from '../config/logger';

async function recalculateStorage() {
  try {
    // Connect to database
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to database');

    // Get all businesses
    const businesses = await Business.find({});
    
    for (const business of businesses) {
      logger.info(`Processing business: ${business.name} (${business._id})`);
      
      // Get all invoices for this business in the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const invoices = await Invoice.find({
        business: business._id,
        createdAt: { $gte: startOfMonth }
      }).select('originalImage.size');
      
      // Calculate total storage used
      let totalStorageMB = 0;
      for (const invoice of invoices) {
        if (invoice.originalImage?.size) {
          totalStorageMB += invoice.originalImage.size / (1024 * 1024);
        }
      }
      
      // Update business storage usage
      await Business.updateOne(
        { _id: business._id },
        { 
          $set: { 
            'usage.currentMonth.storageUsedMB': totalStorageMB 
          } 
        }
      );
      
      logger.info(`Updated storage for ${business.name}: ${totalStorageMB.toFixed(2)} MB`);
    }
    
    logger.info('Storage recalculation completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error recalculating storage:', error);
    process.exit(1);
  }
}

// Run the script
recalculateStorage();