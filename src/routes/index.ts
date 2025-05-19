import { Router } from "express";
import invoiceRoutes from "./invoice.routes";
import healthRoutes from "./health.routes";

const router = Router();

// Import route modules
// Example: import userRoutes from './v1/user.routes';

// Mount routes
// Example: router.use('/users', userRoutes);

router.use("/invoices", invoiceRoutes);
router.use("/health", healthRoutes);

export default router;
