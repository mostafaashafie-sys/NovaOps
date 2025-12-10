/**
 * Centralized Logging Utility
 * Provides consistent logging across the application with levels, context, and environment awareness
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Get log level from environment or default to INFO in dev, WARN in production
const getLogLevel = () => {
  if (import.meta.env.PROD) {
    return LOG_LEVELS.WARN; // Only warnings and errors in production
  }
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  return LOG_LEVELS.DEBUG; // Debug level in development
};

const currentLogLevel = getLogLevel();

/**
 * Format log message with context
 */
const formatMessage = (context, level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';
  const levelStr = level.toUpperCase().padEnd(5);
  const emoji = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    SUCCESS: '✅',
    ACTION: '🎯',
    DATA: '📊',
    NETWORK: '🌐'
  }[level] || '📝';
  
  return {
    timestamp,
    context: contextStr,
    level: levelStr,
    emoji,
    message,
    data
  };
};

/**
 * Log to console with formatting
 */
const logToConsole = (formatted, level) => {
  const { timestamp, context, level: levelStr, emoji, message, data } = formatted;
  const style = {
    DEBUG: 'color: #6B7280; font-weight: normal',
    INFO: 'color: #3B82F6; font-weight: normal',
    WARN: 'color: #F59E0B; font-weight: bold',
    ERROR: 'color: #EF4444; font-weight: bold',
    SUCCESS: 'color: #10B981; font-weight: bold',
    ACTION: 'color: #8B5CF6; font-weight: bold',
    DATA: 'color: #06B6D4; font-weight: normal',
    NETWORK: 'color: #EC4899; font-weight: normal'
  }[level] || 'color: #000; font-weight: normal';
  
  const logPrefix = `%c${emoji} ${context} ${levelStr} ${timestamp}`;
  
  if (data !== null && data !== undefined) {
    console.log(logPrefix, style, message, data);
  } else {
    console.log(logPrefix, style, message);
  }
};

/**
 * Logger class
 */
class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  /**
   * Create a child logger with a new context
   */
  child(context) {
    return new Logger(`${this.context}:${context}`);
  }

  /**
   * Debug level logging
   */
  debug(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage(this.context, 'DEBUG', message, data);
      logToConsole(formatted, 'DEBUG');
    }
  }

  /**
   * Info level logging
   */
  info(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage(this.context, 'INFO', message, data);
      logToConsole(formatted, 'INFO');
    }
  }

  /**
   * Warning level logging
   */
  warn(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const formatted = formatMessage(this.context, 'WARN', message, data);
      logToConsole(formatted, 'WARN');
    }
  }

  /**
   * Error level logging
   */
  error(message, error = null) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const formatted = formatMessage(this.context, 'ERROR', message, error);
      logToConsole(formatted, 'ERROR');
      
      // Also log to console.error for better error tracking
      if (error) {
        console.error(`[${this.context}] ERROR ${message}`, error);
      } else {
        console.error(`[${this.context}] ERROR ${message}`);
      }
    }
  }

  /**
   * Success level logging (info with success styling)
   */
  success(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage(this.context, 'SUCCESS', message, data);
      logToConsole(formatted, 'SUCCESS');
    }
  }

  /**
   * Action level logging (for user actions)
   */
  action(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage(this.context, 'ACTION', message, data);
      logToConsole(formatted, 'ACTION');
    }
  }

  /**
   * Data level logging (for data operations)
   */
  data(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage(this.context, 'DATA', message, data);
      logToConsole(formatted, 'DATA');
    }
  }

  /**
   * Network level logging (for API calls)
   */
  network(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage(this.context, 'NETWORK', message, data);
      logToConsole(formatted, 'NETWORK');
    }
  }

  /**
   * Group logs together
   */
  group(label, callback) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.group(`[${this.context}] ${label}`);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      callback();
    }
  }

  /**
   * Time a operation
   */
  time(label) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.time(`[${this.context}] ${label}`);
    }
  }

  /**
   * End timing
   */
  timeEnd(label) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.timeEnd(`[${this.context}] ${label}`);
    }
  }
}

// Create default logger instance
const logger = new Logger('App');

// Export both the class and default instance
export { Logger, LOG_LEVELS };
export default logger;

