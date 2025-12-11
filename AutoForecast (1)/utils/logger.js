// ==============================================================================
// LOGGER - utils/logger.js
// Centralized logging utility
// ==============================================================================

const { config } = require('../config');

class Logger {
    constructor(context, moduleName = 'MAIN') {
        this.context = context;
        this.moduleName = moduleName;
        this.startTime = Date.now();
    }

    isEnabled() {
        return config.logLevel !== 'silent';
    }

    isVerbose() {
        return config.logLevel === 'verbose';
    }

    formatMessage(level, message) {
        const elapsed = Date.now() - this.startTime;
        return `[${this.moduleName}] [${elapsed}ms] ${level}: ${message}`;
    }

    log(...args) {
        if (this.isEnabled()) {
            this.context.log(this.formatMessage('INFO', args.join(' ')));
        }
    }

    info(...args) {
        if (this.isEnabled()) {
            this.context.log(this.formatMessage('INFO', args.join(' ')));
        }
    }

    debug(...args) {
        if (this.isVerbose()) {
            this.context.log(this.formatMessage('DEBUG', args.join(' ')));
        }
    }

    warn(...args) {
        if (this.isEnabled()) {
            this.context.log(this.formatMessage('WARN', args.join(' ')));
        }
    }

    error(...args) {
        this.context.log.error(this.formatMessage('ERROR', args.join(' ')));
    }

    methodStart(methodName, params = {}) {
        this.debug(`▶ ${methodName} started`, JSON.stringify(params));
    }

    methodEnd(methodName, result = null) {
        this.debug(`◀ ${methodName} completed`, result ? JSON.stringify(result) : '');
    }

    dataCounts(label, counts) {
        this.info(`📦 ${label}:`, Object.entries(counts).map(([k,v]) => `${k}=${v}`).join(', '));
    }

    simulation(month, data) {
        if (this.isVerbose()) {
            this.context.log(this.formatMessage('SIM', 
                `[M${month}] ` + Object.entries(data).map(([k,v]) => `${k}=${v}`).join(', ')
            ));
        }
    }

    child(moduleName) {
        const childLogger = new Logger(this.context, moduleName);
        childLogger.startTime = this.startTime;
        return childLogger;
    }
}

module.exports = { Logger };
