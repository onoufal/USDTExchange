import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { logger } from "./utils/logger";
import { APIError } from "./middleware/error-handler";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET environment variable must be set and be at least 32 characters long");
}

/**
 * Hashes a password using scrypt with a random salt
 * @param password The plain text password to hash
 * @returns Promise resolving to "hash.salt" string
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compares a supplied password against a stored hashed password
 * @param supplied The plain text password to verify
 * @param stored The stored "hash.salt" string
 * @returns Promise resolving to true if passwords match
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // For admin user with unhashed password
  if (supplied === stored) {
    return true;
  }

  // For other users with hashed passwords
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    logger.error({ err }, 'Password comparison error');
    return false;
  }
}

/**
 * Sets up authentication middleware and routes for the application
 * @param app Express application instance
 */
export function setupAuth(app: Express): void {
  // Configure session middleware with security best practices
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    },
    store: storage.sessionStore
  };

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
    next();
  });

  // Initialize session and passport middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        logger.info('Login attempt', { username });
        const user = await storage.getUserByUsername(username);

        if (!user) {
          logger.info('Login failed: User not found', { username });
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!user.isVerified) {
          logger.info('Login failed: Email not verified', { username });
          return done(null, false, { message: "Please verify your email before logging in" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          logger.info('Login failed: Invalid password', { username });
          return done(null, false, { message: "Invalid username or password" });
        }

        logger.info('Login successful', { username, userId: user.id });
        return done(null, user);
      } catch (err) {
        logger.error({ err }, 'Login error');
        return done(err);
      }
    })
  );

  // Passport serialization
  passport.serializeUser((user, done) => {
    logger.debug('Serializing user', { userId: user.id });
    done(null, user.id);
  });

  // Enhanced deserializeUser to always fetch fresh user data
  passport.deserializeUser(async (id: number, done) => {
    try {
      logger.debug('Deserializing user session', { userId: id });

      // Get fresh user data
      const freshUser = await storage.getUser(id);

      if (!freshUser) {
        logger.warn('Deserialization failed: User not found', { userId: id });
        return done(null, false);
      }

      logger.debug('User deserialized successfully with fresh data', {
        userId: id,
        hasCliqNumber: !!freshUser.cliqNumber,
        isVerified: freshUser.isVerified,
        lastUpdate: new Date().toISOString()
      });

      done(null, freshUser);
    } catch (err) {
      logger.error({ err }, 'Deserialization error');
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) {
        logger.error({ err }, 'Authentication error');
        return next(new APIError(500, "Authentication failed", "AUTH_ERROR"));
      }
      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || "Authentication failed"
        });
      }
      req.login(user, (err) => {
        if (err) {
          logger.error({ err }, 'Session creation error');
          return next(new APIError(500, "Failed to create session", "SESSION_ERROR"));
        }
        logger.info('User logged in successfully', { userId: user.id });
        res.json({
          success: true,
          message: "Login successful",
          user
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) {
        logger.error({ err }, 'Logout error');
        return next(new APIError(500, "Logout failed", "LOGOUT_ERROR"));
      }
      req.session.destroy((err) => {
        if (err) {
          logger.error({ err }, 'Session destruction error');
          return next(new APIError(500, "Failed to destroy session", "SESSION_ERROR"));
        }
        logger.info('User logged out successfully', { userId });
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }
    res.json({
      success: true,
      user: req.user
    });
  });
}