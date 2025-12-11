// ==============================================================================
// CONFIG - config.js
// Centralized configuration and constants
// ==============================================================================

const config = {
    // Dataverse connection
    dataverse: {
        url: process.env.DATAVERSE_URL,
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    
    // Calculation parameters
    calculation: {
        forecastMonthsAhead: parseInt(process.env.FORECAST_MONTHS_AHEAD || "25"),
        atRiskThresholdMonths: parseInt(process.env.AT_RISK_THRESHOLD_MONTHS || "6"),
        noSellBufferMonths: parseInt(process.env.NO_SELL_BUFFER_MONTHS || "3"),
        maxMonthsCoverOffset: 12
    },
    
    // Logging
    logLevel: process.env.LOG_LEVEL || "verbose",
    
    // Order status codes
    orderStatus: {
        SYSTEM_GENERATED: 100000000,
        PLANNED_BY_LO: 100000001,
        PENDING_RO_APPROVAL: 100000002,
        APPROVED: 100000003,
        CONFIRMED_TO_UP: 100000005,
        BACK_ORDER: 100000006,
        REMAINING_FOR_SHIPPING: 100000010
    },
    
    // Channel codes
    channels: {
        DEFAULT: 100000000
    }
};

// Validate required configuration
function validateConfig() {
    const required = [
        'dataverse.url',
        'dataverse.tenantId', 
        'dataverse.clientId',
        'dataverse.clientSecret'
    ];
    
    const missing = required.filter(path => {
        const parts = path.split('.');
        let value = config;
        for (const part of parts) {
            value = value?.[part];
        }
        return !value;
    });
    
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
}

module.exports = { config, validateConfig };
