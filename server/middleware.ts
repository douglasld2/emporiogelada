import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = req.user as User;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = req.user as User;
  if (user.role !== "customer" && user.role !== "admin") {
    return res.status(403).json({ error: "Customer access required" });
  }

  next();
}

// ─────────────────────────────────────────────
// In-memory rate limiter (no external deps)
// ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Purge stale entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(rateLimitStore.entries())) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiting middleware.
 * @param maxRequests  Max allowed requests per window
 * @param windowMs     Time window in milliseconds
 * @param message      Error message returned on limit exceeded
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  message = "Too many requests. Please try again later.",
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip ?? req.socket?.remoteAddress ?? "unknown").replace("::ffff:", "");
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// Pre-configured limiters for common endpoints
export const loginRateLimiter = createRateLimiter(
  10,           // 10 attempts
  15 * 60 * 1000, // per 15 minutes
  "Muitas tentativas de login. Tente novamente em 15 minutos.",
);

export const forgotPasswordRateLimiter = createRateLimiter(
  5,            // 5 attempts
  60 * 60 * 1000, // per hour
  "Muitas solicitações de redefinição de senha. Tente novamente em 1 hora.",
);

export const registerRateLimiter = createRateLimiter(
  5,            // 5 registrations
  60 * 60 * 1000, // per hour
  "Muitas tentativas de cadastro. Tente novamente em 1 hora.",
);

export const couponValidateRateLimiter = createRateLimiter(
  30,           // 30 validations
  60 * 60 * 1000, // per hour
  "Muitas tentativas de validação de cupom. Tente novamente em 1 hora.",
);
