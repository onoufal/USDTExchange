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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
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
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      sameSite: "lax"
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Test route to verify session handling
  app.get("/api/test-session", (req, res) => {
    if (!req.session.views) {
      req.session.views = 0;
    }
    req.session.views++;
    log(`Session test - views: ${req.session.views}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Full session data: ${JSON.stringify(req.session)}`);
    res.json({ 
      views: req.session.views,
      sessionId: req.sessionID,
      session: req.session
    });
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          log(`Login failed: User not found - ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        // For the default admin user, do a direct comparison
        if (username === "admin" && password === "admin123") {
          log(`Admin login successful for ${username}`);
          return done(null, user);
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

  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user.username}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        log(`Deserialization failed: User ${id} not found`);
        return done(null, false);
      }
      log(`Deserialization successful for user: ${user.username}`);
      done(null, user);
    } catch (err) {
      log(`Deserialization error for ID ${id}: ${err}`);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });

      req.login(user, (err) => {
        if (err) return next(err);
        log(`New user registered and logged in: ${user.username}`);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        log(`Login error: ${err}`);
        return next(err);
      }
      if (!user) {
        log(`Login failed: ${info?.message}`);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          log(`Session creation error: ${err}`);
          return next(err);
        }
        log(`User logged in successfully: ${user.username}`);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    log(`Logout request received for user: ${username}`);
    req.logout((err) => {
      if (err) {
        log(`Logout error for ${username}: ${err}`);
        return next(err);
      }
      log(`User logged out successfully: ${username}`);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}