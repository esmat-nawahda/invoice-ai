import { Router } from "express";
import { BusinessController } from "../controllers/business.controller";
import { validate } from "../middlewares/validation.middleware";
import { body, param } from "express-validator";
import { 
  authenticateApiKey, 
  requirePermission 
} from "../middlewares/apiKey.middleware";

const router = Router();
const businessController = new BusinessController();

// All routes require API key authentication
router.use(authenticateApiKey);

/**
 * @swagger
 * /api/v1/business/profile:
 *   get:
 *     summary: Get business profile
 *     description: Get the current business profile and settings
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved business profile
 *       401:
 *         description: Invalid or missing API key
 */
router.get(
  "/profile",
  requirePermission('businessRead'),
  businessController.getProfile
);

/**
 * @swagger
 * /api/v1/business/profile:
 *   put:
 *     summary: Update business profile
 *     description: Update business information and settings
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               legalName:
 *                 type: string
 *               phone:
 *                 type: string
 *               website:
 *                 type: string
 *               address:
 *                 type: object
 *               industry:
 *                 type: string
 *               timezone:
 *                 type: string
 *               language:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successfully updated business profile
 *       400:
 *         description: Invalid input data
 */
router.put(
  "/profile",
  requirePermission('businessUpdate'),
  validate,
  businessController.updateProfile
);

/**
 * @swagger
 * /api/v1/business/api-keys:
 *   get:
 *     summary: Get API keys
 *     description: Get all active API keys for the business
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved API keys
 */
router.get(
  "/api-keys",
  requirePermission('businessRead'),
  businessController.getApiKeys
);

/**
 * @swagger
 * /api/v1/business/api-keys:
 *   post:
 *     summary: Create API key
 *     description: Create a new API key for the business
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: object
 *               rateLimit:
 *                 type: object
 *               allowedIPs:
 *                 type: array
 *                 items:
 *                   type: string
 *               allowedDomains:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: API key created successfully
 *       400:
 *         description: Invalid input data
 */
router.post(
  "/api-keys",
  requirePermission('businessUpdate'),
  [
    body("name").optional().isString(),
    body("permissions").optional().isObject(),
    body("rateLimit").optional().isObject(),
    body("allowedIPs").optional().isArray(),
    body("allowedDomains").optional().isArray(),
    body("expiresAt").optional().isISO8601(),
  ],
  validate,
  businessController.createApiKey
);

/**
 * @swagger
 * /api/v1/business/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke API key
 *     description: Revoke an API key
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *       404:
 *         description: API key not found
 */
router.delete(
  "/api-keys/:keyId",
  requirePermission('businessUpdate'),
  [
    param("keyId").isMongoId().withMessage("Invalid API key ID"),
    body("reason").optional().isString(),
  ],
  validate,
  businessController.revokeApiKey
);

/**
 * @swagger
 * /api/v1/business/usage:
 *   get:
 *     summary: Get usage statistics
 *     description: Get current usage statistics and limits
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *           default: month
 *     responses:
 *       200:
 *         description: Successfully retrieved usage statistics
 */
router.get(
  "/usage",
  requirePermission('businessRead'),
  businessController.getUsageStats
);

/**
 * @swagger
 * /api/v1/business/billing:
 *   get:
 *     summary: Get billing history
 *     description: Get billing history and current subscription info
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved billing history
 */
router.get(
  "/billing",
  requirePermission('businessRead'),
  businessController.getBillingHistory
);

/**
 * @swagger
 * /api/v1/business/plan:
 *   put:
 *     summary: Change plan
 *     description: Change the business subscription plan
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [free, starter, professional, enterprise]
 *     responses:
 *       200:
 *         description: Plan changed successfully
 *       400:
 *         description: Invalid plan
 */
router.put(
  "/plan",
  requirePermission('businessUpdate'),
  [
    body("plan")
      .isString()
      .isIn(['free', 'starter', 'professional', 'enterprise'])
      .withMessage("Invalid plan"),
  ],
  validate,
  businessController.changePlan
);

/**
 * @swagger
 * /api/v1/business/export:
 *   get:
 *     summary: Export data
 *     description: Export business data in various formats
 *     tags: [Business]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Data exported successfully
 */
router.get(
  "/export",
  requirePermission('businessRead'),
  businessController.exportData
);

export default router;