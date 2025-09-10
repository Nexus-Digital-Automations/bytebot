/**
 * Logger utility for bytebot-ui package
 * Provides structured logging with environment-aware output
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
  context?: string;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;
  private isTest: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.isTest = process.env.NODE_ENV === "test";
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    // In test environment, only log errors unless explicitly enabled
    if (this.isTest) {
      return (
        level === LogLevel.ERROR || process.env.ENABLE_TEST_LOGGING === "true"
      );
    }

    // In development, log everything
    if (this.isDevelopment) {
      return true;
    }

    // In production, only log errors and warnings
    return level <= LogLevel.WARN;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}] ` : "";
    return `${timestamp} ${levelStr}: ${context}${entry.message}`;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context,
    };

    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        if (data) {
          // eslint-disable-next-line no-console
          console.error(formattedMessage, data);
        } else {
          // eslint-disable-next-line no-console
          console.error(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        if (data) {
          // eslint-disable-next-line no-console
          console.warn(formattedMessage, data);
        } else {
          // eslint-disable-next-line no-console
          console.warn(formattedMessage);
        }
        break;
      case LogLevel.INFO:
        if (data) {
          // eslint-disable-next-line no-console
          console.info(formattedMessage, data);
        } else {
          // eslint-disable-next-line no-console
          console.info(formattedMessage);
        }
        break;
      case LogLevel.DEBUG:
        if (data) {
          // eslint-disable-next-line no-console
          console.log(formattedMessage, data);
        } else {
          // eslint-disable-next-line no-console
          console.log(formattedMessage);
        }
        break;
    }
  }

  public error(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  public warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  public info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  public debug(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for common use cases
export const logError = (
  message: string,
  error?: unknown,
  context?: string,
) => {
  logger.error(message, error, context);
};

export const logWarn = (message: string, data?: unknown, context?: string) => {
  logger.warn(message, data, context);
};

export const logInfo = (message: string, data?: unknown, context?: string) => {
  logger.info(message, data, context);
};

export const logDebug = (message: string, data?: unknown, context?: string) => {
  logger.debug(message, data, context);
};
