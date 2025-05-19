import { Request, Response, NextFunction } from "express";
import {
  validationResult,
  ValidationChain,
  ValidationError as ExpressValidationError,
} from "express-validator";
import { ValidationError } from "../utils/errors/AppError";

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw new ValidationError(errorMessages.join(", "));
  }
  next();
};

export const sanitize = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));
    next();
  };
};
