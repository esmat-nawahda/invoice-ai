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
        origin: environment.cors.origin,
        credentials: true,
      })
    );

    // Rate limiting
    this.app.use(rateLimiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Logging middleware
    this.app.use(morgan("combined", { stream }));
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
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
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
