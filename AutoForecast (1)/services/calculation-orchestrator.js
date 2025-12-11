// ==============================================================================
// CALCULATION ORCHESTRATOR - services/calculation-orchestrator.js
// Main orchestration layer that coordinates all calculation services
// ==============================================================================

const { config } = require('../config');
const { startOfMonthUTC } = require('../utils/date-utils');

class CalculationOrchestrator {
    constructor(services, logger) {
        this.dataFetcher = services.dataFetcher;
        this.consumptionService = services.consumptionService;
        this.monthsCoverService = services.monthsCoverService;
        this.stockSimulation = services.stockSimulation;
        this.dataWriter = services.dataWriter;
        this.logger = logger.child('ORCHESTRATOR');
    }

    async execute(params) {
        const startTime = Date.now();
        this.logger.methodStart('execute', params);

        const {
            sku,
            country,
            baselineDate,
            baseStock,
            targetCoverMonths,
            procurementSafeMargin = 1.0
        } = params;

        try {
            // Step 1: Fetch all data from Dataverse
            this.logger.info('Step 1: Fetching data from Dataverse...');
            const rawData = await this.dataFetcher.fetchAll(sku, country);

            const tinsPerCarton = rawData.skuMeta.new_numberoftinspercarton || 1;
            const startDate = startOfMonthUTC(new Date(baselineDate));
            const monthsAhead = config.calculation.forecastMonthsAhead;

            // Step 2: Build consumption map
            this.logger.info('Step 2: Building consumption map...');
            const consumptionByMonth = this.consumptionService.buildConsumptionMap(
                rawData.forecasts,
                rawData.budgets,
                startDate,
                monthsAhead,
                procurementSafeMargin
            );

            // Step 3: Calculate write-offs
            this.logger.info('Step 3: Processing write-offs...');
            const { writeOffByMonth, totalWriteOff } = this.stockSimulation.calculateWriteOffs(
                rawData.agingData,
                startDate
            );

            // Step 4: Build inbound from manual orders
            this.logger.info('Step 4: Processing manual orders...');
            const manualOrders = rawData.orders.filter(
                o => o.new_orderplacementstatus !== config.orderStatus.SYSTEM_GENERATED
            );
            const systemOrders = rawData.orders.filter(
                o => o.new_orderplacementstatus === config.orderStatus.SYSTEM_GENERATED
            );
            
            const { inboundByMonth, manualOrdersMaxYM } = this.stockSimulation.buildInboundMap(manualOrders);

            // Step 5: Purge old data
            this.logger.info('Step 5: Purging old data...');
            await this.dataWriter.purgeOldData(systemOrders, rawData.oldFutureInventory);

            // Step 6: Run stock simulation with months cover
            this.logger.info('Step 6: Running stock simulation...');
            const simulationParams = {
                startDate,
                baseStock,
                monthsAhead,
                targetCoverMonths,
                consumptionByMonth,
                writeOffByMonth,
                totalWriteOff,
                inboundByMonth,
                allowedMonths: rawData.allowedMonths,
                manualOrdersMaxYM
            };

            const { results, systemOrdersPlaced } = this.stockSimulation.runSimulation(simulationParams);

            // Step 7: Write results to Dataverse
            this.logger.info('Step 7: Writing results to Dataverse...');
            await this.dataWriter.writeResults(
                results,
                systemOrdersPlaced,
                sku,
                country,
                tinsPerCarton
            );

            const durationMs = Date.now() - startTime;
            
            const summary = {
                ok: true,
                durationMs,
                stats: {
                    monthsProcessed: results.length,
                    systemOrdersPlaced: systemOrdersPlaced.length,
                    totalWriteOff,
                    avgMonthsCover: this.calculateAvgMonthsCover(results)
                },
                systemOrders: systemOrdersPlaced.map(o => ({
                    yearMonth: o.yearMonth,
                    quantity: o.quantity
                }))
            };

            this.logger.info(`✓ Calculation completed in ${durationMs}ms`);
            this.logger.methodEnd('execute', summary);

            return summary;

        } catch (error) {
            this.logger.error('Calculation failed:', error.message);
            throw error;
        }
    }

    calculateAvgMonthsCover(results) {
        const validCovers = results
            .filter(r => r.monthsCover != null && r.monthsCover < 999)
            .map(r => r.monthsCover);
        
        if (validCovers.length === 0) return 0;
        
        const avg = validCovers.reduce((sum, val) => sum + val, 0) / validCovers.length;
        return Math.round(avg * 100) / 100;
    }
}

module.exports = { CalculationOrchestrator };
