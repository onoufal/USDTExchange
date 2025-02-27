import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
    console.error('Password comparison error:', err);
    return false;
  }
}

/**
 * Sets up authentication middleware and routes for the application
 * @param app Express application instance
 */
export function setupAuth(app: Express): void {
  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    store: storage.sessionStore
  };

  // Enable proxy trust if in production
  if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
  }

  // Initialize session and passport middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local authentication strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          log(`Login failed: User not found - ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!user.isVerified) {
          log(`Login failed: Email not verified - ${username}`);
          return done(null, false, { message: "Please verify your email before logging in" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          log(`Login failed: Invalid password for ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        log(`Login successful for ${username}`);
        return done(null, user);
      } catch (err) {
        log(`Login error for ${username}: ${err}`);
        return done(err);
      }
    })
  );

  // Session serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Session deserialization - Always fetch fresh user data
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Log deserialization attempt
      log(`Deserializing user session for ID: ${id}`);

      // Always fetch fresh user data from storage
      const user = await storage.getUser(id);

      if (!user) {
        log(`Deserialization failed: User not found - ID: ${id}`);
        return done(null, false);
      }

      // Log successful deserialization with user details
      log(`User deserialized successfully:`, {
        id: user.id,
        cliqSettings: {
          type: user.cliqType,
          alias: user.cliqAlias,
          number: user.cliqNumber
        }
      });

      done(null, user);
    } catch (err) {
      log(`Deserialization error for user ${id}:`, err);
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}