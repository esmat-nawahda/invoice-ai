import rateLimit from "express-rate-limit";
import environment from "../config/environment";
import { TooManyRequestsError } from "../utils/errors/AppError";

export const rateLimiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.max,
  message: "Too many requests from this IP, please try again later.",
  handler: (_req, _res) => {
    throw new TooManyRequestsError(
      "Too many requests from this IP, please try again later."
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});
