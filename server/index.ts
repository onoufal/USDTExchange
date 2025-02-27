import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { logger } from "./utils/logger";

const app = express();

// Add CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.info({
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      }, `${req.method} ${path}`);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Ensure Vite middleware is set up before static serving
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Add 404 handler after all routes
    app.use(notFoundHandler);

    // Add error handler last
    app.use(errorHandler);

    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        logger.error({ err: error }, 'Server error occurred');
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
})();