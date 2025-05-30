import mongoose from 'mongoose';
import { Business } from '../models/business.model';
import { ApiKey } from '../models/apiKey.model';
import environment from '../config/environment';
import logger from '../config/logger';

async function createTestBusiness() {
  try {
    // Connect to database
    await mongoose.connect(environment.mongodb.uri);
    logger.info('Connected to database');

    // Check if test business already exists
    let business = await Business.findOne({ email: 'test@example.com' });

    if (!business) {
      // Create test business
      business = await Business.create({
        name: 'Test Business',
        email: 'test@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'TC',
          postalCode: '12345',
          country: 'US',
        },
        plan: 'free',
        status: 'active',
      });

      logger.info(`Created test business: ${business.name}`);
    } else {
      logger.info(`Test business already exists: ${business.name}`);
    }

    // Check if API key exists
    const existingKey = await ApiKey.findOne({ 
      business: business._id,
      status: 'active'
    });

    if (!existingKey) {
      // Generate API key
      const { key, hashedKey } = (ApiKey as any).generateApiKey();

      await ApiKey.create({
        name: 'Test API Key',
        key,
        hashedKey,
        business: business._id,
        permissions: {
          invoiceCreate: true,
          invoiceRead: true,
          invoiceUpdate: true,
          invoiceDelete: true,
          businessRead: true,
          businessUpdate: true,
        },
      });

      logger.info('Created test API key');
      logger.info('====================================');
      logger.info('YOUR API KEY (save this securely):');
      logger.info(key);
      logger.info('====================================');
      logger.info('Use this API key in the X-API-Key header for all requests');
    } else {
      logger.info('API key already exists for this business');
      logger.info('If you need the key, please create a new one through the API');
    }

    await mongoose.disconnect();
    logger.info('Script completed successfully');
  } catch (error) {
    logger.error('Error creating test business:', error);
    process.exit(1);
  }
}

// Run the script
createTestBusiness();