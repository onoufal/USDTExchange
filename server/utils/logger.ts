import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Application logger instance with configured log levels and formatting
 */
export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: true,
      ignore: 'pid,hostname'
    }
  } : undefined,
  redact: {
    paths: [
      'password',
      'proofOfPayment',
      'kycDocument',
      '*.password',
      '*.proofOfPayment',
      '*.kycDocument',
      'headers.authorization',
      'req.headers.authorization'
    ],
    remove: true
  }
});

/**
 * Create a child logger with additional context
 * @param context Additional context to add to log entries
 */
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context);
}
