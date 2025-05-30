import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { CurrencyController } from '../controllers/currency.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { protect as authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const currencyController = new CurrencyController();

// Apply authentication to all currency routes
router.use(authMiddleware);

/**
 * @route   GET /api/v1/currencies
 * @desc    Get all available currencies
 * @access  Private
 */
router.get('/', currencyController.getCurrencies);

/**
 * @route   GET /api/v1/currencies/rates
 * @desc    Get exchange rates for currency pairs
 * @access  Private
 */
router.get(
  '/rates',
  query('baseCurrency').optional().isLength({ min: 3, max: 3 }),
  query('targetCurrencies').isArray({ min: 1 }).withMessage('At least one target currency required'),
  validateRequest,
  currencyController.getExchangeRates
);

/**
 * @route   POST /api/v1/currencies/convert
 * @desc    Convert amount between currencies
 * @access  Private
 */
router.post(
  '/convert',
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('fromCurrency').isLength({ min: 3, max: 3 }).withMessage('From currency must be 3 characters'),
  body('toCurrency').isLength({ min: 3, max: 3 }).withMessage('To currency must be 3 characters'),
  body('forceRefresh').optional().isBoolean(),
  validateRequest,
  currencyController.convertCurrency
);

/**
 * @route   POST /api/v1/currencies/rates/update
 * @desc    Update exchange rates for a base currency
 * @access  Private
 */
router.post(
  '/rates/update',
  body('baseCurrency').optional().isLength({ min: 3, max: 3 }),
  validateRequest,
  currencyController.updateExchangeRates
);

/**
 * @route   GET /api/v1/currencies/business/:businessId/preferences
 * @desc    Get currency preferences for a business
 * @access  Private
 */
router.get(
  '/business/:businessId/preferences',
  param('businessId').isMongoId().withMessage('Invalid business ID'),
  validateRequest,
  currencyController.getBusinessCurrencyPreferences
);

/**
 * @route   PUT /api/v1/currencies/business/:businessId/preferences
 * @desc    Update currency preferences for a business
 * @access  Private
 */
router.put(
  '/business/:businessId/preferences',
  param('businessId').isMongoId().withMessage('Invalid business ID'),
  body('baseCurrency').optional().isLength({ min: 3, max: 3 }),
  body('displayCurrencies').optional().isArray(),
  body('displayCurrencies.*').optional().isLength({ min: 3, max: 3 }),
  body('autoConvert').optional().isBoolean(),
  body('exchangeRateProvider').optional().isIn(['exchangerate-api', 'fixer', 'openexchangerates', 'manual']),
  validateRequest,
  currencyController.updateBusinessCurrencyPreferences
);

/**
 * @route   GET /api/v1/currencies/invoice/:invoiceId/convert
 * @desc    Get invoice amounts in multiple currencies
 * @access  Private
 */
router.get(
  '/invoice/:invoiceId/convert',
  param('invoiceId').isMongoId().withMessage('Invalid invoice ID'),
  query('currencies').isArray({ min: 1 }).withMessage('At least one currency required'),
  validateRequest,
  currencyController.getInvoiceInMultipleCurrencies
);

/**
 * @route   GET /api/v1/currencies/business/:businessId/statistics
 * @desc    Get currency statistics for a business
 * @access  Private
 */
router.get(
  '/business/:businessId/statistics',
  param('businessId').isMongoId().withMessage('Invalid business ID'),
  query('period').optional().isIn(['today', 'week', 'month', 'year']),
  validateRequest,
  currencyController.getCurrencyStatistics
);

export { router as currencyRoutes };