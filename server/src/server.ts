import app from "./app";
import database from "./config/database";
import logger from "./config/logger";

const startServer = async () => {
  try {
    // Connect to database
    await database.connect();

    // Start the server
    app.listen();
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Start the server
startServer();
