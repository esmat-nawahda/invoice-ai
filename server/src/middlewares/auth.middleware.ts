import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors/AppError";
import environment from "../config/environment";

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Check if token exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new UnauthorizedError("Please log in to access this resource")
      );
    }

    // 2) Verify token
    const decoded = jwt.verify(token, environment.jwt.secret) as JwtPayload;

    // 3) Check if user still exists
    // Note: This would typically involve checking the database
    // For now, we'll just attach the decoded user to the request
    req.user = decoded;

    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid token. Please log in again."));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Note: This would typically involve checking the user's role from the database
    // For now, we'll just pass through
    next();
  };
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.headers["x-refresh-token"] as string;

    if (!refreshToken) {
      return next(new UnauthorizedError("Please provide a refresh token"));
    }

    const decoded = jwt.verify(
      refreshToken,
      environment.jwt.refreshSecret
    ) as JwtPayload;

    // Generate new access token
    const signOptions: SignOptions = {
      expiresIn: environment.jwt.expiresIn as jwt.SignOptions["expiresIn"],
    };

    const accessToken = jwt.sign(
      { id: decoded.id },
      environment.jwt.secret,
      signOptions
    );

    res.status(200).json({
      status: "success",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(new UnauthorizedError("Invalid refresh token"));
  }
};
