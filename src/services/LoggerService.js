/**
 * ============================================================================
 * SUPPLY CHAIN APP - COMPREHENSIVE LOGGING SYSTEM
 * ============================================================================
 * 
 * Features:
 * - Multiple log levels (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
 * - Namespaced loggers for different modules
 * - Persistent log storage (localStorage/IndexedDB)
 * - Remote log shipping (Sentry, custom endpoint)
 * - Performance tracking
 * - User action tracking
 * - API call logging
 * - State change tracking
 * - Session recording
 * - Export capabilities
 * - Debug panel integration
 * 
 * Usage:
 *   import logger from '@/services/LoggerService';
 *   
 *   logger.info('Application started');
 *   logger.api.request('GET', '/api/stock', { country: 'KSA' });
 *   logger.user.action('click', 'Create Order Button');
 *   logger.perf.start('dataLoad');
 *   logger.perf.end('dataLoad');
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Log levels (lower = more verbose)
  levels: {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
    NONE: 6,
  },

  // Current log level based on environment
  currentLevel: import.meta.env.PROD ? 2 : 0, // INFO in prod, TRACE in dev

  // Maximum logs to keep in memory
  maxMemoryLogs: 1000,

  // Maximum logs to keep in localStorage
  maxStoredLogs: 5000,

  // LocalStorage key
  storageKey: 'supply_chain_logs',

  // Session storage key
  sessionKey: 'supply_chain_session',

  // Remote logging endpoint (optional)
  remoteEndpoint: import.meta.env.VITE_LOG_REMOTE_ENDPOINT || null,

  // Batch size for remote shipping
  remoteBatchSize: 50,

  // Batch interval (ms)
  remoteBatchInterval: 30000,

  // Enable console output
  enableConsole: true,

  // Enable localStorage persistence
  enableStorage: import.meta.env.VITE_LOG_PERSIST !== 'false',

  // Enable remote shipping
  enableRemote: import.meta.env.PROD && import.meta.env.VITE_LOG_REMOTE === 'true',

  // Color scheme for console output
  colors: {
    TRACE: '#888888',
    DEBUG: '#00BCD4',
    INFO: '#2196F3',
    WARN: '#FF9800',
    ERROR: '#F44336',
    FATAL: '#9C27B0',
    timestamp: '#888888',
    namespace: '#4CAF50',
  },

  // Icons for console output
  icons: {
    TRACE: '🔍',
    DEBUG: '🐛',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    FATAL: '💀',
    API: '🌐',
    USER: '👤',
    STATE: '📦',
    PERF: '⚡',
    RENDER: '🎨',
    LIFECYCLE: '🔄',
  },
};

// ============================================================================
// LOG ENTRY CLASS
// ============================================================================

class LogEntry {
  constructor(level, namespace, message, data = {}, meta = {}) {
    this.id = this.generateId();
    this.timestamp = new Date().toISOString();
    this.level = level;
    this.levelName = Object.keys(CONFIG.levels).find(k => CONFIG.levels[k] === level);
    this.namespace = namespace;
    this.message = message;
    this.data = this.sanitizeData(data);
    this.meta = {
      ...meta,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      sessionId: SessionManager.getSessionId(),
    };
    this.stack = level >= CONFIG.levels.ERROR ? new Error().stack : null;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeData(data) {
    try {
      // Remove sensitive fields
      const sanitized = JSON.parse(JSON.stringify(data));
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
      
      const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        Object.keys(obj).forEach(key => {
          if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            sanitize(obj[key]);
          }
        });
        return obj;
      };
      
      return sanitize(sanitized);
    } catch (e) {
      return { error: 'Failed to sanitize data', original: String(data) };
    }
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      level: this.level,
      levelName: this.levelName,
      namespace: this.namespace,
      message: this.message,
      data: this.data,
      meta: this.meta,
      stack: this.stack,
    };
  }
}

// ============================================================================
// SESSION MANAGER
// ============================================================================

const SessionManager = {
  sessionId: null,
  startTime: null,
  user: null,
  context: {},

  init() {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date().toISOString();
    this.saveSession();
  },

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  getSessionId() {
    if (!this.sessionId) this.init();
    return this.sessionId;
  },

  setUser(user) {
    this.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    this.saveSession();
  },

  setContext(key, value) {
    this.context[key] = value;
    this.saveSession();
  },

  getContext() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      user: this.user,
      ...this.context,
    };
  },

  saveSession() {
    try {
      sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify({
        sessionId: this.sessionId,
        startTime: this.startTime,
        user: this.user,
        context: this.context,
      }));
    } catch (e) {
      // Session storage not available
    }
  },

  loadSession() {
    try {
      const saved = sessionStorage.getItem(CONFIG.sessionKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.sessionId = data.sessionId;
        this.startTime = data.startTime;
        this.user = data.user;
        this.context = data.context || {};
      }
    } catch (e) {
      // Session storage not available
    }
  },
};

// ============================================================================
// LOG STORAGE
// ============================================================================

const LogStorage = {
  logs: [],
  pendingRemote: [],

  add(entry) {
    // Add to memory
    this.logs.push(entry);
    
    // Trim memory logs
    if (this.logs.length > CONFIG.maxMemoryLogs) {
      this.logs = this.logs.slice(-CONFIG.maxMemoryLogs);
    }

    // Persist to localStorage
    if (CONFIG.enableStorage) {
      this.persist();
    }

    // Queue for remote shipping
    if (CONFIG.enableRemote && entry.level >= CONFIG.levels.WARN) {
      this.pendingRemote.push(entry);
    }
  },

  persist() {
    try {
      const stored = this.logs.slice(-CONFIG.maxStoredLogs).map(e => e.toJSON());
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(stored));
    } catch (e) {
      // Storage full or not available - clear old logs
      try {
        const trimmed = this.logs.slice(-100).map(e => e.toJSON());
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(trimmed));
      } catch (e2) {
        // Give up on storage
      }
    }
  },

  load() {
    try {
      const stored = localStorage.getItem(CONFIG.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Don't restore to memory, just keep for export
        return parsed;
      }
    } catch (e) {
      // Storage not available
    }
    return [];
  },

  clear() {
    this.logs = [];
    try {
      localStorage.removeItem(CONFIG.storageKey);
    } catch (e) {
      // Storage not available
    }
  },

  getAll() {
    return [...this.logs];
  },

  query(filters = {}) {
    let results = [...this.logs];

    if (filters.level !== undefined) {
      results = results.filter(e => e.level >= filters.level);
    }

    if (filters.namespace) {
      results = results.filter(e => e.namespace.includes(filters.namespace));
    }

    if (filters.startTime) {
      results = results.filter(e => new Date(e.timestamp) >= new Date(filters.startTime));
    }

    if (filters.endTime) {
      results = results.filter(e => new Date(e.timestamp) <= new Date(filters.endTime));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(e => 
        e.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(e.data).toLowerCase().includes(searchLower)
      );
    }

    if (filters.limit) {
      results = results.slice(-filters.limit);
    }

    return results;
  },

  export(format = 'json') {
    const logs = this.getAll().map(e => e.toJSON());
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'namespace', 'message', 'data'];
      const rows = logs.map(log => [
        log.timestamp,
        log.levelName,
        log.namespace,
        log.message,
        JSON.stringify(log.data),
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    if (format === 'text') {
      return logs.map(log => 
        `[${log.timestamp}] ${log.levelName} [${log.namespace}] ${log.message} ${JSON.stringify(log.data)}`
      ).join('\n');
    }

    return logs;
  },
};

// ============================================================================
// REMOTE TRANSPORT
// ============================================================================

const RemoteTransport = {
  queue: [],
  timer: null,

  init() {
    if (CONFIG.enableRemote && CONFIG.remoteEndpoint) {
      this.startBatching();
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.flush());
      }
    }
  },

  add(entry) {
    this.queue.push(entry.toJSON());
    
    if (this.queue.length >= CONFIG.remoteBatchSize) {
      this.flush();
    }
  },

  startBatching() {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, CONFIG.remoteBatchInterval);
  },

  async flush() {
    if (this.queue.length === 0 || !CONFIG.remoteEndpoint) return;
    const batch = [...this.queue];
    this.queue = [];

    try {
      await fetch(CONFIG.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: SessionManager.getContext(),
          logs: batch,
        }),
        keepalive: true,
      });
    } catch (e) {
      // Re-queue failed logs
      this.queue = [...batch, ...this.queue].slice(-CONFIG.remoteBatchSize * 2);
    }
  },
};

// ============================================================================
// CONSOLE TRANSPORT
// ============================================================================

const ConsoleTransport = {
  output(entry) {
    if (!CONFIG.enableConsole) return;
    if (entry.level < CONFIG.currentLevel) return;

    const { colors, icons } = CONFIG;
    const icon = icons[entry.levelName] || '';
    const color = colors[entry.levelName] || colors.INFO;

    const style = [
      `color: ${colors.timestamp}`,
      `color: ${color}; font-weight: bold`,
      `color: ${colors.namespace}`,
      'color: inherit',
    ];

    const args = [
      `%c[${entry.timestamp.slice(11, 23)}] %c${icon} ${entry.levelName} %c[${entry.namespace}]%c`,
      ...style,
      entry.message,
    ];

    if (Object.keys(entry.data).length > 0) {
      args.push(entry.data);
    }

    if (entry.stack) {
      args.push('\n' + entry.stack);
    }

    const consoleFn = entry.level >= CONFIG.levels.ERROR ? console.error :
                      entry.level >= CONFIG.levels.WARN ? console.warn :
                      entry.level >= CONFIG.levels.INFO ? console.info :
                      console.log;

    consoleFn.apply(console, args);
  },

  group(label) {
    if (CONFIG.enableConsole) console.group(label);
  },

  groupEnd() {
    if (CONFIG.enableConsole) console.groupEnd();
  },

  table(data) {
    if (CONFIG.enableConsole) console.table(data);
  },

  time(label) {
    if (CONFIG.enableConsole) console.time(label);
  },

  timeEnd(label) {
    if (CONFIG.enableConsole) console.timeEnd(label);
  },
};

// ============================================================================
// PERFORMANCE TRACKER
// ============================================================================

const PerformanceTracker = {
  marks: new Map(),
  measures: [],

  start(name, data = {}) {
    this.marks.set(name, {
      startTime: performance.now(),
      data,
    });
  },

  end(name, additionalData = {}) {
    const mark = this.marks.get(name);
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const duration = performance.now() - mark.startTime;
    this.marks.delete(name);

    const measure = {
      name,
      duration,
      data: { ...mark.data, ...additionalData },
      timestamp: new Date().toISOString(),
    };

    this.measures.push(measure);

    if (this.measures.length > 100) {
      this.measures = this.measures.slice(-100);
    }

    return measure;
  },

  measure(name, fn, data = {}) {
    this.start(name, data);
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => this.end(name));
    }
    
    this.end(name);
    return result;
  },

  getMeasures(name = null) {
    if (name) {
      return this.measures.filter(m => m.name === name);
    }
    return [...this.measures];
  },

  getAverages() {
    const groups = {};
    this.measures.forEach(m => {
      if (!groups[m.name]) groups[m.name] = [];
      groups[m.name].push(m.duration);
    });

    return Object.entries(groups).reduce((acc, [name, durations]) => {
      acc[name] = {
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
      };
      return acc;
    }, {});
  },

  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      };
    }
    return null;
  },
};

// ============================================================================
// MAIN LOGGER CLASS
// ============================================================================

class Logger {
  constructor(namespace = 'App') {
    this.namespace = namespace;
  }

  // Core logging methods
  #log(level, message, data = {}, meta = {}) {
    const entry = new LogEntry(level, this.namespace, message, data, meta);
    
    LogStorage.add(entry);
    ConsoleTransport.output(entry);
    
    if (CONFIG.enableRemote && level >= CONFIG.levels.WARN) {
      RemoteTransport.add(entry);
    }

    // Emit event for external listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:log', { detail: entry }));
    }

    return entry;
  }

  trace(message, data = {}) {
    return this.#log(CONFIG.levels.TRACE, message, data);
  }

  debug(message, data = {}) {
    return this.#log(CONFIG.levels.DEBUG, message, data);
  }

  info(message, data = {}) {
    return this.#log(CONFIG.levels.INFO, message, data);
  }

  warn(message, data = {}) {
    return this.#log(CONFIG.levels.WARN, message, data);
  }

  error(message, error = null, data = {}) {
    const errorData = error ? {
      ...data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    } : data;
    
    return this.#log(CONFIG.levels.ERROR, message, errorData);
  }

  fatal(message, error = null, data = {}) {
    const errorData = error ? {
      ...data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    } : data;
    
    return this.#log(CONFIG.levels.FATAL, message, errorData);
  }

  // Create child logger with sub-namespace
  child(subNamespace) {
    return new Logger(`${this.namespace}:${subNamespace}`);
  }

  // Grouped logging
  group(label, fn) {
    ConsoleTransport.group(`[${this.namespace}] ${label}`);
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => ConsoleTransport.groupEnd());
      }
      ConsoleTransport.groupEnd();
      return result;
    } catch (e) {
      ConsoleTransport.groupEnd();
      throw e;
    }
  }

  // Table output
  table(data, columns) {
    this.debug('Table data', { rowCount: Array.isArray(data) ? data.length : 1 });
    ConsoleTransport.table(data, columns);
  }

  // Assertion
  assert(condition, message, data = {}) {
    if (!condition) {
      this.error(`Assertion failed: ${message}`, null, data);
    }
  }

  // Count occurrences
  count(label) {
    if (!this._counts) this._counts = {};
    if (!this._counts[label]) this._counts[label] = 0;
    this._counts[label]++;
    this.debug(`${label}: ${this._counts[label]}`);
  }

  countReset(label) {
    if (this._counts) this._counts[label] = 0;
  }
}

// ============================================================================
// API LOGGER
// ============================================================================

class APILogger extends Logger {
  constructor() {
    super('API');
  }

  request(method, url, data = {}) {
    return this.debug(`→ ${method} ${url}`, {
      type: 'request',
      method,
      url,
      ...data,
    });
  }

  response(method, url, status, duration, data = {}) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
    return this[level](`← ${method} ${url} [${status}] ${duration}ms`, {
      type: 'response',
      method,
      url,
      status,
      duration,
      ...data,
    });
  }

  error(method, url, error, duration) {
    return super.error(`✕ ${method} ${url} failed after ${duration}ms`, error, {
      type: 'error',
      method,
      url,
      duration,
    });
  }
}

// ============================================================================
// USER ACTION LOGGER
// ============================================================================

class UserLogger extends Logger {
  constructor() {
    super('User');
  }

  action(type, target, data = {}) {
    return this.info(`${type}: ${target}`, {
      actionType: type,
      target,
      ...data,
    });
  }

  click(target, data = {}) {
    return this.action('click', target, data);
  }

  input(field, data = {}) {
    return this.action('input', field, data);
  }

  navigate(from, to, data = {}) {
    return this.info(`Navigate: ${from} → ${to}`, {
      actionType: 'navigate',
      from,
      to,
      ...data,
    });
  }

  search(query, results, data = {}) {
    return this.info(`Search: "${query}" (${results} results)`, {
      actionType: 'search',
      query,
      resultCount: results,
      ...data,
    });
  }

  filter(filters, data = {}) {
    return this.info('Filter applied', {
      actionType: 'filter',
      filters,
      ...data,
    });
  }

  formSubmit(formName, data = {}) {
    return this.info(`Form submitted: ${formName}`, {
      actionType: 'formSubmit',
      formName,
      ...data,
    });
  }

  formError(formName, errors, data = {}) {
    return this.warn(`Form validation failed: ${formName}`, {
      actionType: 'formError',
      formName,
      errors,
      ...data,
    });
  }
}

// ============================================================================
// STATE LOGGER
// ============================================================================

class StateLogger extends Logger {
  constructor() {
    super('State');
  }

  change(stateName, oldValue, newValue, data = {}) {
    return this.debug(`State changed: ${stateName}`, {
      stateName,
      oldValue: this.summarize(oldValue),
      newValue: this.summarize(newValue),
      ...data,
    });
  }

  summarize(value) {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return `Object(${Object.keys(value).length} keys)`;
    return value;
  }

  action(actionName, payload = {}) {
    return this.debug(`Action: ${actionName}`, {
      action: actionName,
      payload,
    });
  }

  selector(selectorName, result, data = {}) {
    return this.trace(`Selector: ${selectorName}`, {
      selector: selectorName,
      result: this.summarize(result),
      ...data,
    });
  }
}

// ============================================================================
// RENDER LOGGER
// ============================================================================

class RenderLogger extends Logger {
  constructor() {
    super('Render');
  }

  component(name, reason = null, data = {}) {
    return this.trace(`Component rendered: ${name}`, {
      component: name,
      reason,
      ...data,
    });
  }

  mount(name, data = {}) {
    return this.debug(`Component mounted: ${name}`, {
      component: name,
      lifecycle: 'mount',
      ...data,
    });
  }

  unmount(name, data = {}) {
    return this.debug(`Component unmounted: ${name}`, {
      component: name,
      lifecycle: 'unmount',
      ...data,
    });
  }

  effect(name, deps = [], data = {}) {
    return this.trace(`Effect triggered: ${name}`, {
      effect: name,
      dependencies: deps,
      ...data,
    });
  }
}

// ============================================================================
// PERFORMANCE LOGGER
// ============================================================================

class PerfLogger extends Logger {
  constructor() {
    super('Perf');
  }

  start(name, data = {}) {
    PerformanceTracker.start(name, data);
    return this.trace(`⏱ Start: ${name}`, data);
  }

  end(name, data = {}) {
    const measure = PerformanceTracker.end(name, data);
    if (measure) {
      const level = measure.duration > 1000 ? 'warn' : measure.duration > 100 ? 'info' : 'debug';
      return this[level](`⏱ End: ${name} (${measure.duration.toFixed(2)}ms)`, {
        duration: measure.duration,
        ...measure.data,
      });
    }
  }

  async measure(name, fn, data = {}) {
    this.start(name, data);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (e) {
      this.end(name, { error: e.message });
      throw e;
    }
  }

  memory() {
    const usage = PerformanceTracker.getMemoryUsage();
    if (usage) {
      return this.info(`Memory: ${usage.usedMB}MB`, usage);
    }
  }

  summary() {
    const averages = PerformanceTracker.getAverages();
    this.table(Object.entries(averages).map(([name, stats]) => ({
      name,
      count: stats.count,
      avg: `${stats.avg.toFixed(2)}ms`,
      min: `${stats.min.toFixed(2)}ms`,
      max: `${stats.max.toFixed(2)}ms`,
    })));
  }
}

// ============================================================================
// DATAVERSE LOGGER (Specific to your app)
// ============================================================================

class DataverseLogger extends Logger {
  constructor() {
    super('Dataverse');
  }

  query(table, operation, data = {}) {
    return this.debug(`${operation} on ${table}`, {
      table,
      operation,
      ...data,
    });
  }

  create(table, record) {
    return this.info(`Created record in ${table}`, {
      table,
      operation: 'create',
      recordId: record.id,
    });
  }

  update(table, recordId, changes) {
    return this.info(`Updated record in ${table}`, {
      table,
      operation: 'update',
      recordId,
      changedFields: Object.keys(changes),
    });
  }

  delete(table, recordId) {
    return this.info(`Deleted record from ${table}`, {
      table,
      operation: 'delete',
      recordId,
    });
  }

  batch(operations) {
    return this.info(`Batch operation: ${operations.length} operations`, {
      operation: 'batch',
      count: operations.length,
    });
  }
}

// ============================================================================
// GLOBAL LOGGER INSTANCE
// ============================================================================

const mainLogger = new Logger('App');

// Attach specialized loggers
mainLogger.api = new APILogger();
mainLogger.user = new UserLogger();
mainLogger.state = new StateLogger();
mainLogger.render = new RenderLogger();
mainLogger.perf = new PerfLogger();
mainLogger.dataverse = new DataverseLogger();

// Attach utilities
mainLogger.session = SessionManager;
mainLogger.storage = LogStorage;
mainLogger.performance = PerformanceTracker;
mainLogger.config = CONFIG;

// Helper to create namespaced loggers
mainLogger.createLogger = (namespace) => new Logger(namespace);

// Set log level
mainLogger.setLevel = (level) => {
  if (typeof level === 'string') {
    CONFIG.currentLevel = CONFIG.levels[level.toUpperCase()] ?? CONFIG.levels.DEBUG;
  } else {
    CONFIG.currentLevel = level;
  }
};

// Get all logs
mainLogger.getLogs = (filters) => LogStorage.query(filters);

// Export logs
mainLogger.export = (format) => LogStorage.export(format);

// Clear logs
mainLogger.clear = () => LogStorage.clear();

// Download logs as file
mainLogger.download = (format = 'json') => {
  const content = LogStorage.export(format);
  const blob = new Blob([content], { 
    type: format === 'json' ? 'application/json' : 'text/plain' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs_${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
};

// Initialize
SessionManager.loadSession();
SessionManager.init();
RemoteTransport.init();

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    mainLogger.error('Uncaught error', event.error, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    mainLogger.error('Unhandled promise rejection', event.reason, {
      type: 'unhandledrejection',
    });
  });

  // Expose to window for debugging
  window.__logger = mainLogger;
}

export { Logger, CONFIG as LoggerConfig };
export default mainLogger;

