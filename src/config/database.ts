import mongoose from "mongoose";
import environment from "./environment";
import logger from "./logger";

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info("Using existing database connection");
      return;
    }

    try {
      const options = {
        autoIndex: environment.nodeEnv !== "production",
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      const uri = environment.mongodb.uri;

      await mongoose.connect(uri, options);

      this.isConnected = true;
      logger.info("Database connected successfully");

      // Handle connection events
      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error:", error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
        this.isConnected = true;
      });

      // Handle process termination
      process.on("SIGINT", this.gracefulShutdown.bind(this));
      process.on("SIGTERM", this.gracefulShutdown.bind(this));
    } catch (error) {
      logger.error("Database connection error:", error);
      throw error;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (error) {
      logger.error("Error during database shutdown:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("Database disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting from database:", error);
      throw error;
    }
  }
}

export default Database.getInstance();
