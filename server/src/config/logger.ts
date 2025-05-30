import winston from "winston";
import path from "path";
import environment from "./environment";

const { combine, timestamp, printf, colorize, align } = winston.format;

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }

  return msg;
});

// Create the logger instance
const logger = winston.createLogger({
  level: environment.logging.level,
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    align(),
    logFormat
  ),
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        align(),
        logFormat
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs/error.log"),
      level: "error",
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(process.cwd(), environment.logging.filePath),
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs/exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs/rejections.log"),
    }),
  ],
});

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
