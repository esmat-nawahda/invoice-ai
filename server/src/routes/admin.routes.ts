import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { body, query, param } from "express-validator";

const router = Router();
const adminController = new AdminController();

// GET /admin/businesses - Get all businesses
router.get(
  "/businesses",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["active", "suspended", "inactive", "trial"]),
  query("plan")
    .optional()
    .isIn(["free", "starter", "professional", "enterprise"]),
  query("search").optional().isString(),
  validateRequest,
  adminController.getAllBusinesses
);

// GET /admin/businesses/:id - Get specific business
router.get(
  "/businesses/:id",
  param("id").isMongoId(),
  validateRequest,
  adminController.getBusinessById
);

// POST /admin/businesses - Create new business
router.post(
  "/businesses",
  body("name").notEmpty().trim(),
  body("email").isEmail().normalizeEmail(),
  body("plan")
    .optional()
    .isIn(["free", "starter", "professional", "enterprise"]),
  body("status").optional().isIn(["active", "suspended", "inactive", "trial"]),
  validateRequest,
  adminController.createBusiness
);

// PUT /admin/businesses/:id - Update business
router.put(
  "/businesses/:id",
  param("id").isMongoId(),
  body("name").optional().trim(),
  body("email").optional().isEmail().normalizeEmail(),
  body("plan")
    .optional()
    .isIn(["free", "starter", "professional", "enterprise"]),
  body("status").optional().isIn(["active", "suspended", "inactive", "trial"]),
  validateRequest,
  adminController.updateBusiness
);

// DELETE /admin/businesses/:id - Delete business
router.delete(
  "/businesses/:id",
  param("id").isMongoId(),
  validateRequest,
  adminController.deleteBusiness
);

// GET /admin/businesses/:id/api-keys - Get business API keys
router.get(
  "/businesses/:id/api-keys",
  param("id").isMongoId(),
  validateRequest,
  adminController.getBusinessApiKeys
);

// POST /admin/businesses/:id/api-keys - Create API key for business
router.post(
  "/businesses/:id/api-keys",
  param("id").isMongoId(),
  body("name").notEmpty().trim(),
  body("permissions").optional().isObject(),
  validateRequest,
  adminController.createBusinessApiKey
);

// DELETE /admin/businesses/:businessId/api-keys/:keyId - Revoke API key
router.delete(
  "/businesses/:businessId/api-keys/:keyId",
  param("businessId").isMongoId(),
  param("keyId").isMongoId(),
  body("reason").optional().isString(),
  validateRequest,
  adminController.revokeApiKey
);

// GET /admin/statistics - Get platform statistics
router.get("/statistics", adminController.getPlatformStatistics);

// GET /admin/analytics - Get analytics data
router.get(
  "/analytics",
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  query("groupBy").optional().isIn(["day", "week", "month"]),
  validateRequest,
  adminController.getAnalytics
);

// POST /admin/businesses/:id/reset-usage - Reset business usage
router.post(
  "/businesses/:id/reset-usage",
  param("id").isMongoId(),
  validateRequest,
  adminController.resetBusinessUsage
);

// POST /admin/businesses/:id/recalculate-storage - Recalculate business storage
router.post(
  "/businesses/:id/recalculate-storage",
  param("id").isMongoId(),
  validateRequest,
  adminController.recalculateBusinessStorage
);

// POST /admin/businesses/:id/suspend - Suspend business
router.post(
  "/businesses/:id/suspend",
  param("id").isMongoId(),
  body("reason").optional().isString(),
  validateRequest,
  adminController.suspendBusiness
);

// POST /admin/businesses/:id/activate - Activate business
router.post(
  "/businesses/:id/activate",
  param("id").isMongoId(),
  validateRequest,
  adminController.activateBusiness
);

// GET /admin/invoices - Get all invoices
router.get(
  "/invoices",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().isString(),
  query("businessId")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage("businessId must be a valid MongoDB ObjectId"),
  query("status")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return ["pending", "processing", "completed", "failed"].includes(value);
    })
    .withMessage(
      "status must be one of: pending, processing, completed, failed"
    ),
  query("type")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return ["received", "sent"].includes(value);
    })
    .withMessage("type must be one of: received, sent"),
  query("dateFrom")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return !isNaN(Date.parse(value));
    })
    .withMessage("dateFrom must be a valid date"),
  query("dateTo")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return !isNaN(Date.parse(value));
    })
    .withMessage("dateTo must be a valid date"),
  validateRequest,
  adminController.getAllInvoices
);

// GET /admin/invoices/:id - Get specific invoice
router.get(
  "/invoices/:id",
  param("id").isMongoId(),
  validateRequest,
  adminController.getInvoiceById
);

// GET /admin/invoices/:id/image - Get invoice image
router.get(
  "/invoices/:id/image",
  param("id").isMongoId(),
  validateRequest,
  adminController.getInvoiceImage
);

// GET /admin/businesses/:id/invoices - Get invoices for specific business
router.get(
  "/businesses/:id/invoices",
  param("id").isMongoId(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().isString(),
  query("status")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return ["pending", "processing", "completed", "failed"].includes(value);
    })
    .withMessage(
      "status must be one of: pending, processing, completed, failed"
    ),
  query("type")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return ["received", "sent"].includes(value);
    })
    .withMessage("type must be one of: received, sent"),
  query("dateFrom")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return !isNaN(Date.parse(value));
    })
    .withMessage("dateFrom must be a valid date"),
  query("dateTo")
    .optional()
    .custom((value) => {
      if (value === "" || value === undefined || value === null) return true;
      return !isNaN(Date.parse(value));
    })
    .withMessage("dateTo must be a valid date"),
  validateRequest,
  adminController.getBusinessInvoices
);

export default router;
