import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { validate } from "../middlewares/validation.middleware";
import { body } from "express-validator";

const router = Router();
const invoiceController = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/extract:
 *   post:
 *     summary: Extract data from an invoice image
 *     description: Analyzes an invoice image and extracts structured data using AI
 *     tags: [Invoices]
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
 *     responses:
 *       200:
 *         description: Successfully extracted invoice data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceNumber:
 *                       type: string
 *                     invoiceDate:
 *                       type: string
 *                     vendor:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                     total:
 *                       type: number
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post(
  "/extract",
  [
    body("image")
      .isString()
      .notEmpty()
      .withMessage("Image must be provided as a base64 string"),
  ],
  validate,
  invoiceController.extractInvoiceData
);

export default router;
