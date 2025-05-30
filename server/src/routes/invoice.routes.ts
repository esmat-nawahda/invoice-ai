import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { validate } from "../middlewares/validation.middleware";
import { body, param } from "express-validator";
import {
  authenticateApiKey,
  requirePermission,
  checkInvoiceLimit,
} from "../middlewares/apiKey.middleware";

const router = Router();
const invoiceController = new InvoiceController();

// All routes require API key authentication
router.use(authenticateApiKey);

/**
 * @swagger
 * /api/v1/invoices/extract:
 *   post:
 *     summary: Extract data from an invoice image
 *     description: Analyzes an invoice image and extracts structured data using AI
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 encoded image of the invoice
 *               type:
 *                 type: string
 *                 enum: [received, sent]
 *                 default: received
 *                 description: Whether this is a received invoice (from vendor) or sent invoice (to customer)
 *               saveToDatabase:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to save the extracted invoice to database
 *     responses:
 *       200:
 *         description: Successfully extracted invoice data
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Invalid or missing API key
 *       403:
 *         description: Forbidden - API key lacks permission or rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post(
  "/extract",
  requirePermission("invoiceCreate"),
  checkInvoiceLimit,
  [
    body("image")
      .isString()
      .notEmpty()
      .withMessage("Image must be provided as a base64 string"),
    body("type")
      .optional()
      .isIn(["received", "sent"])
      .withMessage("Type must be either 'received' or 'sent'"),
    body("saveToDatabase").optional().isBoolean(),
  ],
  validate,
  invoiceController.extractInvoice
);

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     summary: Get all invoices
 *     description: Retrieve a paginated list of invoices for your business
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [received, sent]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected, paid, cancelled]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [paid, unpaid, partial, overdue, cancelled]
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
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in invoice number, vendor name, customer name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: invoiceDate
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Successfully retrieved invoices
 *       401:
 *         description: Invalid or missing API key
 */
router.get("/", requirePermission("invoiceRead"), invoiceController.findAll);

/**
 * @swagger
 * /api/v1/invoices/statistics:
 *   get:
 *     summary: Get invoice statistics
 *     description: Get aggregated statistics for invoices
 *     tags: [Invoices]
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
 *         description: Successfully retrieved statistics
 */
router.get(
  "/statistics",
  requirePermission("invoiceRead"),
  invoiceController.getStatistics
);

/**
 * @swagger
 * /api/v1/invoices/bulk:
 *   patch:
 *     summary: Bulk update invoices
 *     description: Update multiple invoices at once
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *               - updates
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successfully updated invoices
 *       400:
 *         description: Invalid request data
 */
router.patch(
  "/bulk",
  requirePermission("invoiceUpdate"),
  [
    body("ids").isArray({ min: 1 }).withMessage("IDs array required"),
    body("ids.*").isMongoId().withMessage("Invalid invoice ID"),
    body("updates").isObject().withMessage("Updates object required"),
  ],
  validate,
  invoiceController.bulkUpdate
);

/**
 * @swagger
 * /api/v1/invoices/{id}/image:
 *   get:
 *     summary: Get invoice image
 *     description: Retrieve the original image of an invoice
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved image
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/:id/image",
  requirePermission("invoiceRead"),
  [param("id").isMongoId().withMessage("Invalid invoice ID")],
  validate,
  invoiceController.getImage
);

/**
 * @swagger
 * /api/v1/invoices/{id}/payment:
 *   post:
 *     summary: Record payment for invoice
 *     description: Record a payment against an invoice
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, check, bank_transfer, credit_card, debit_card, paypal, other]
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid payment data
 *       404:
 *         description: Invoice not found
 */
router.post(
  "/:id/payment",
  requirePermission("invoiceUpdate"),
  [
    param("id").isMongoId().withMessage("Invalid invoice ID"),
    body("amount")
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage("Valid payment amount required"),
    body("paymentMethod").optional().isString(),
    body("paymentDate").optional().isISO8601(),
  ],
  validate,
  invoiceController.recordPayment
);

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     description: Retrieve a single invoice by its ID
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Successfully retrieved invoice
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/:id",
  requirePermission("invoiceRead"),
  [param("id").isMongoId().withMessage("Invalid invoice ID")],
  validate,
  invoiceController.findById
);

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   put:
 *     summary: Update invoice
 *     description: Update an existing invoice
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated invoice
 *       404:
 *         description: Invoice not found
 */
router.put(
  "/:id",
  requirePermission("invoiceUpdate"),
  [param("id").isMongoId().withMessage("Invalid invoice ID")],
  validate,
  invoiceController.update
);

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   delete:
 *     summary: Delete invoice
 *     description: Soft delete an invoice
 *     tags: [Invoices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted invoice
 *       404:
 *         description: Invoice not found
 */
router.delete(
  "/:id",
  requirePermission("invoiceDelete"),
  [param("id").isMongoId().withMessage("Invalid invoice ID")],
  validate,
  invoiceController.delete
);

export default router;
