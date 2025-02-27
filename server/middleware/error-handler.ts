import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const reqId = req.id || 'unknown';
  const path = req.path;
  const method = req.method;

  if (err instanceof APIError) {
    // Handle known API errors
    logger.error({
      err,
      reqId,
      path,
      method,
      statusCode: err.statusCode,
      errorCode: err.code,
      details: err.details
    }, 'API Error occurred');

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(process.env.NODE_ENV === 'development' ? { details: err.details } : {})
      }
    });
  }

  if (err instanceof ZodError) {
    // Handle validation errors
    logger.error({
      err: err.errors,
      reqId,
      path,
      method
    }, 'Validation Error occurred');

    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }

  // Handle unknown errors
  logger.error({
    err,
    reqId,
    path,
    method,
    stack: err.stack
  }, 'Unexpected error occurred');

  // Send generic error message in production
  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
}

/**
 * Middleware to handle 404 errors
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn({
    path: req.path,
    method: req.method,
    reqId: req.id
  }, 'Route not found');

  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
}

/**
 * Async handler wrapper to catch promise rejections
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
