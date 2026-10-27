import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'arcshop_dev_access_secret_15m';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'arcshop_dev_refresh_secret_30d';

export interface AuthPayload {
  userId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  let token = extractToken(req);

  // Fallback: If access token missing, check refreshToken cookie
  if (!token && req.cookies?.refreshToken) {
    try {
      const decoded = jwt.verify(req.cookies.refreshToken, REFRESH_SECRET) as { userId: string };
      const user = db.users.find((u) => u.id === decoded.userId);
      if (user) {
        req.user = { userId: user.id, role: user.role };
        return next();
      }
    } catch {
      // ignore
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, ok: false, error: 'err.notAuthorized', message: 'Токен отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    // If access token expired, try refresh token cookie
    if (req.cookies?.refreshToken) {
      try {
        const decoded = jwt.verify(req.cookies.refreshToken, REFRESH_SECRET) as { userId: string };
        const user = db.users.find((u) => u.id === decoded.userId);
        if (user) {
          req.user = { userId: user.id, role: user.role };
          return next();
        }
      } catch {
        // ignore
      }
    }
    return res.status(401).json({ success: false, ok: false, error: 'err.notAuthorized', message: 'Недействительный токен' });
  }
};

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET) as AuthPayload;
      req.user = decoded;
      return next();
    } catch {
      // ignore
    }
  }

  // Check refresh token cookie as fallback
  if (req.cookies?.refreshToken) {
    try {
      const decoded = jwt.verify(req.cookies.refreshToken, REFRESH_SECRET) as { userId: string };
      const user = db.users.find((u) => u.id === decoded.userId);
      if (user) {
        req.user = { userId: user.id, role: user.role };
      }
    } catch {
      // ignore
    }
  }

  next();
};

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      ok: false,
      message: 'Доступ запрещен. Требуются права администратора',
    });
  }
  next();
};
