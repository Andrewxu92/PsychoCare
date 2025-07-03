import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'default-secret-for-development',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Change to false for development
      maxAge: sessionTtl,
    },
  });
}

// Simple authentication setup without OAuth
export async function setupAuth(app: Express) {
  app.use(getSession());
}

// Simple authentication middleware
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.session && req.session.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user) {
      req.user = { claims: { sub: user.id } };
      return next();
    }
  }
  
  res.status(401).json({ message: "Unauthorized" });
};