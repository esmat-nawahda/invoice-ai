import { Router } from "express";
import invoiceRoutes from "./invoice.routes";
import businessRoutes from "./business.routes";
import healthRoutes from "./health.routes";
import adminRoutes from "./admin.routes";
import { currencyRoutes } from "./currency.routes";

const router = Router();

// Public routes
router.use("/health", healthRoutes);

// Admin routes (no API key required - for admin dashboard)
router.use("/admin", adminRoutes);

// Protected routes (require API key)
router.use("/invoices", invoiceRoutes);
router.use("/business", businessRoutes);
router.use("/currencies", currencyRoutes);

export default router;