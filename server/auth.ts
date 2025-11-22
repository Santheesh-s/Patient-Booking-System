import { Request, Response, NextFunction } from "express";
import { User } from "@shared/types";

// Simple password hashing (in production, use bcrypt)
export function hashPassword(password: string): string {
  // This is a simple hash for demo purposes. In production, use bcrypt!
  return Buffer.from(password).toString("base64");
}

export function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString("base64") === hash;
}

// Generate a simple JWT token
export function generateToken(user: User): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload: any = {
    _id: user._id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };

  // Include providerId if this is a provider
  if (user.providerId) {
    payload.providerId = user.providerId;
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");

  // In production, use a proper JWT library with secret signing
  return `${header}.${encodedPayload}.mock-signature`;
}

export function parseToken(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload;
  } catch {
    return null;
  }
}

// Middleware to check authentication
export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = parseToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = payload;
  next();
};

// Middleware to check role
export const requireRole = (requiredRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};
