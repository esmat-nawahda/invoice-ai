import { Request, Response, NextFunction } from "express";
import { ApiKey } from "../models/apiKey.model";
import { UnauthorizedError, ForbiddenError } from "../utils/errors/AppError";
import logger from "../config/logger";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: any;
      business?: any;
    }
  }
}

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get API key from header
    const apiKeyHeader = req.headers['x-api-key'] as string;
    
    if (!apiKeyHeader) {
      throw new UnauthorizedError('API key is required');
    }
    
    // Verify the API key
    const apiKeyDoc = await (ApiKey as any).verifyApiKey(apiKeyHeader);
    
    if (!apiKeyDoc) {
      throw new UnauthorizedError('Invalid API key');
    }
    
    // Check IP restrictions if any
    if (apiKeyDoc.allowedIPs && apiKeyDoc.allowedIPs.length > 0) {
      const clientIP = req.ip || req.socket.remoteAddress;
      if (!apiKeyDoc.allowedIPs.includes(clientIP)) {
        logger.warn(`API key ${apiKeyDoc.maskedKey} used from unauthorized IP: ${clientIP}`);
        throw new ForbiddenError('Access denied from this IP address');
      }
    }
    
    // Check domain restrictions if any
    if (apiKeyDoc.allowedDomains && apiKeyDoc.allowedDomains.length > 0) {
      const origin = req.headers.origin || req.headers.referer;
      if (origin) {
        const domain = new URL(origin).hostname;
        if (!apiKeyDoc.allowedDomains.some((allowed: string) => domain.endsWith(allowed))) {
          logger.warn(`API key ${apiKeyDoc.maskedKey} used from unauthorized domain: ${domain}`);
          throw new ForbiddenError('Access denied from this domain');
        }
      }
    }
    
    // Check rate limits
    const rateLimitCheck = apiKeyDoc.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      res.setHeader('X-RateLimit-Limit', apiKeyDoc.rateLimit[`requestsPer${rateLimitCheck.limit?.charAt(0).toUpperCase()}${rateLimitCheck.limit?.slice(1)}`]);
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (rateLimitCheck.resetIn || 0) * 1000).toISOString());
      
      throw new ForbiddenError(`Rate limit exceeded. Limit will reset in ${rateLimitCheck.resetIn} seconds`);
    }
    
    // Check if business can use API
    const business = apiKeyDoc.business;
    if (!business.canUseAPI()) {
      let reason = 'Account is not active';
      if (business.status === 'suspended') {
        reason = 'Account is suspended';
      } else if (business.status === 'trial' && business.isTrialExpired) {
        reason = 'Trial period has expired';
      } else if (business.isSubscriptionExpired) {
        reason = 'Subscription has expired';
      }
      
      throw new ForbiddenError(reason);
    }
    
    // Increment usage
    await apiKeyDoc.incrementUsage(req.ip);
    await business.incrementUsage('apiCall');
    
    // Attach to request
    req.apiKey = apiKeyDoc;
    req.business = business;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', apiKeyDoc.rateLimit.requestsPerDay);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, apiKeyDoc.rateLimit.requestsPerDay - apiKeyDoc.usage.todayRequests));
    
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    if (!req.apiKey.hasPermission(permission)) {
      return next(new ForbiddenError(`Permission denied: ${permission}`));
    }
    
    next();
  };
};

// Middleware to check if business can create more invoices
export const checkInvoiceLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.business) {
      throw new UnauthorizedError('Authentication required');
    }
    
    if (!req.business.canCreateInvoice()) {
      throw new ForbiddenError(
        `Monthly invoice limit reached (${req.business.limits.monthlyInvoices}). Please upgrade your plan.`
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
};