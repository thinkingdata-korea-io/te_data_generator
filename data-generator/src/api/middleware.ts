/**
 * Express middleware for authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, findUserById, UserRole, JWTPayload } from './auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify user still exists and is active
  const user = await findUserById(payload.userId);
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'User not found or inactive' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Authorization middleware
 * Checks if user has required role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = [requireAuth, requireRole('admin')];
