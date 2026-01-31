import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

/**
 * Rate limiting middleware for protecting expensive endpoints
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 10,
    keyGenerator = defaultKeyGenerator,
    message = "Too many requests. Please wait before trying again.",
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
      
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));
      
      return next();
    }
    
    entry.count++;
    
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));
    
    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      
      return res.status(429).json({
        error: message,
        code: "RATE_LIMITED",
        retryAfter: retryAfterSeconds,
      });
    }
    
    next();
  };
}

function defaultKeyGenerator(req: any): string {
  // Use user ID from header if available
  const userId = req.headers["x-user-id"];
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `ip:${ip}`;
}

/**
 * Rate limit for proof verification (expensive vision API)
 */
export const verifyProofRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,  // 10 verification attempts per minute
  message: "Too many verification attempts. Please wait a moment.",
});
