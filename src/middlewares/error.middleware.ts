import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/AppError";
import logger from "../config/logger";
import environment from "../config/environment";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(environment.nodeEnv === "development" && { stack: err.stack }),
    });
  }

  // Log unexpected errors
  logger.error("Unexpected error:", {
    error: err.message,
    stack: err.stack,
    path: _req.path,
    method: _req.method,
  });

  // Handle mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(422).json({
      status: "fail",
      message: err.message,
    });
  }

  // Handle mongoose duplicate key errors
  if (err.name === "MongoError" && (err as any).code === 11000) {
    return res.status(409).json({
      status: "fail",
      message: "Duplicate field value entered",
    });
  }

  // Handle mongoose cast errors
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "fail",
      message: "Invalid input data",
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      status: "fail",
      message: "Invalid token. Please log in again.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "fail",
      message: "Your token has expired. Please log in again.",
    });
  }

  // Default error
  return res.status(500).json({
    status: "error",
    message: "Something went wrong",
    ...(environment.nodeEnv === "development" && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
