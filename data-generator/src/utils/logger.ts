/**
 * Simple logger utility for production-ready logging
 * Provides consistent log formatting and level management
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Debug level logging
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Set default log level from environment variable
const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
if (envLogLevel && envLogLevel in LogLevel) {
  logger.setLevel(LogLevel[envLogLevel as keyof typeof LogLevel]);
}
