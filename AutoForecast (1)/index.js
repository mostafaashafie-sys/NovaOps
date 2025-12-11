// ==============================================================================
// AUTOFORECAST - Azure Function Entry Point
// Self-contained with all services inside AutoForecast folder
// ==============================================================================

const { config, validateConfig } = require('./config');
const { Logger } = require('./utils/logger');
const { DataverseClient } = require('./services/dataverse-client');
const { DataFetcher } = require('./services/data-fetcher');
const { ConsumptionService } = require('./services/consumption-service');
const { MonthsCoverService } = require('./services/months-cover-service');
const { StockSimulationService } = require('./services/stock-simulation-service');
const { DataWriterService } = require('./services/data-writer-service');
const { CalculationOrchestrator } = require('./services/calculation-orchestrator');

/**
 * Initialize all services
 */
function initializeServices(context) {
    // Validate configuration
    validateConfig();
    
    // Create logger
    const logger = new Logger(context, 'MAIN');
    
    // Create Dataverse client
    const dataverseClient = new DataverseClient(logger);
    
    // Create calculation services
    const consumptionService = new ConsumptionService(logger);
    const monthsCoverService = new MonthsCoverService(logger);
    
    // Create data services
    const dataFetcher = new DataFetcher(dataverseClient, logger);
    const dataWriter = new DataWriterService(dataverseClient, logger);
    
    // Create stock simulation (depends on consumption and months cover)
    const stockSimulation = new StockSimulationService(
        consumptionService,
        monthsCoverService,
        logger
    );
    
    // Create orchestrator with all services
    const orchestrator = new CalculationOrchestrator({
        dataFetcher,
        consumptionService,
        monthsCoverService,
        stockSimulation,
        dataWriter
    }, logger);
    
    return { orchestrator, logger };
}

/**
 * Main Azure Function handler
 */
module.exports = async function(context, req) {
    const startTime = Date.now();
    context.log("▶ AutoForecast started", JSON.stringify(req.body));

    try {
        // Validate request
        const { sku, country, baselineDate, baseStock, targetCoverMonths, ProcurementSafeMargin } = req.body;
        
        if (!sku || !country || !baselineDate || baseStock == null || !targetCoverMonths) {
            context.res = {
                status: 400,
                body: {
                    error: "Missing required parameters: sku, country, baselineDate, baseStock, targetCoverMonths"
                }
            };
            return;
        }

        // Initialize services
        const { orchestrator, logger } = initializeServices(context);

        // Execute calculation
        const result = await orchestrator.execute({
            sku,
            country,
            baselineDate,
            baseStock,
            targetCoverMonths,
            procurementSafeMargin: ProcurementSafeMargin || 1.0
        });

        // Return success response
        context.res = {
            status: 200,
            body: result
        };

    } catch (error) {
        context.log.error("❌ AutoForecast error:", error);
        
        context.res = {
            status: 500,
            body: {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        };
    }
};
