import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
import { rateLimiter } from "./middlewares/rateLimiter.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import environment from "./config/environment";
import logger, { stream } from "./config/logger";

// Import routes
import routes from "./routes";
import healthRoutes from "./routes/health.routes";
import businessRoutes from "./routes/business.routes";
import adminRoutes from "./routes/admin.routes";
import invoiceRoutes from "./routes/invoice.routes";

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeSwagger();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware with specific configuration for Swagger UI
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );

    this.app.use(
      cors({
        origin: ["http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
        credentials: true,
      })
    );

    // Rate limiting
    this.app.use(rateLimiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Logging middleware
    if (environment.nodeEnv !== "test") {
      this.app.use(morgan("dev"));
    }
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use(`/api/${environment.apiVersion}`, routes);

    // Health check endpoint
    this.app.get("/health", (_req, res) => {
      res.status(200).json({
        status: "success",
        message: "Service is healthy",
        timestamp: new Date().toISOString(),
      });
    });

    // Health check route
    this.app.use("/api/v1/health", healthRoutes);

    // API routes
    this.app.use("/api/v1/businesses", businessRoutes);
    this.app.use("/api/v1/admin", adminRoutes);
    this.app.use("/api/v1/invoices", invoiceRoutes);
  }

  private initializeErrorHandling(): void {
    // Handle 404 errors
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private initializeSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: "3.0.0",
        info: {
          title: "Invoice AI API",
          version: "1.0.0",
          description: "API documentation for Invoice AI service",
          contact: {
            name: "API Support",
            email: "support@example.com",
          },
        },
        servers: [
          {
            url: `http://localhost:${environment.port}`,
            description: "Development server",
          },
        ],
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
              description: "API key for authentication",
            },
          },
        },
      },
      apis: [
        "./src/routes/*.ts",
        "./src/routes/**/*.ts",
        "./src/controllers/*.ts",
        "./src/models/*.ts",
      ],
    };

    const swaggerDocs = swaggerJsDoc(swaggerOptions);

    // Serve Swagger UI
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocs, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Invoice AI API Documentation",
        swaggerOptions: {
          persistAuthorization: true,
        },
      })
    );

    // Serve Swagger JSON
    this.app.get("/api-docs.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerDocs);
    });
  }

  public listen(): void {
    this.app.listen(environment.port, () => {
      logger.info(`Server is running on port ${environment.port}`);
      logger.info(`Environment: ${environment.nodeEnv}`);
      logger.info(
        `API Documentation: http://localhost:${environment.port}/api-docs`
      );
    });
  }
}

// Create and export an instance of the App class
const app = new App();
export default app;
