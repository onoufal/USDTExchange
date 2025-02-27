/**
 * Client-side logger configuration
 * Used for development debugging and error tracking
 */

const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

class ClientLogger {
  private shouldLog: boolean;

  constructor() {
    this.shouldLog = process.env.NODE_ENV !== 'production';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog) return;

    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : '';

    console[level](`[${timestamp}] ${message}${logData}`);
  }

  info(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.ERROR, message, data);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.formatMessage(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

export const logger = new ClientLogger();
