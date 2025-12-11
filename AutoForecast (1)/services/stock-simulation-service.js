// ==============================================================================
// STOCK SIMULATION SERVICE - services/stock-simulation-service.js
// Handles stock simulation and inventory projections
// ==============================================================================

const { toDataverseDate, addMonthsUTC, startOfMonthUTC, yearMonthIndex } = require('../utils/date-utils');
const { config } = require('../config');

class StockSimulationService {
    constructor(consumptionService, monthsCoverService, logger) {
        this.consumptionService = consumptionService;
        this.monthsCoverService = monthsCoverService;
        this.logger = logger.child('STOCK-SIM');
        this.noSellBuffer = config.calculation.noSellBufferMonths;
    }

    runSimulation(params) {
        this.logger.methodStart('runSimulation', {
            baseStock: params.baseStock,
            monthsAhead: params.monthsAhead,
            targetCoverMonths: params.targetCoverMonths
        });

        const {
            startDate,
            baseStock,
            monthsAhead,
            targetCoverMonths,
            consumptionByMonth,
            writeOffByMonth,
            totalWriteOff,
            inboundByMonth,
            allowedMonths,
            manualOrdersMaxYM
        } = params;

        let currentStock = baseStock - totalWriteOff;
        const simulationResults = [];
        const systemOrdersPlaced = [];
        const allInbound = { ...inboundByMonth };

        for (let i = 1; i <= monthsAhead; i++) {
            const monthResult = this.simulateMonth({
                index: i,
                startDate,
                currentStock,
                consumptionByMonth,
                writeOffByMonth,
                allInbound,
                allowedMonths,
                manualOrdersMaxYM,
                targetCoverMonths
            });

            currentStock = monthResult.closingStock;
            
            if (monthResult.systemOrder) {
                systemOrdersPlaced.push(monthResult.systemOrder);
                allInbound[monthResult.isoDate] = (allInbound[monthResult.isoDate] || 0) + monthResult.systemOrder.quantity;
            }

            simulationResults.push(monthResult);
        }

        // Add months cover to all results
        this.addMonthsCoverToResults(simulationResults, consumptionByMonth);

        this.logger.info(`Simulation complete: ${simulationResults.length} months, ${systemOrdersPlaced.length} auto-orders`);
        this.logger.methodEnd('runSimulation');

        return { results: simulationResults, systemOrdersPlaced };
    }

    simulateMonth(params) {
        const {
            index, startDate, currentStock, consumptionByMonth, writeOffByMonth,
            allInbound, allowedMonths, manualOrdersMaxYM, targetCoverMonths
        } = params;

        const date = addMonthsUTC(startDate, index);
        const isoDate = toDataverseDate(date);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const ym = yearMonthIndex(date);

        const inbound = allInbound[isoDate] || 0;
        const writeOff = writeOffByMonth[isoDate] || 0;
        const consumption = consumptionByMonth[isoDate] || 0;

        const openingStock = currentStock;
        const supply = openingStock + inbound;
        const loss = Math.min(supply, writeOff);
        const available = supply - loss;
        const used = Math.min(available, consumption);
        const closingStock = available - used;

        const { required, futureInbound, gap } = this.calculateRequirements(
            closingStock, consumptionByMonth, allInbound, date, targetCoverMonths
        );

        let systemOrder = null;
        let finalClosingStock = closingStock;

        const canPlaceOrder = gap > 0 && ym > manualOrdersMaxYM && allowedMonths.includes(month);

        if (canPlaceOrder) {
            const orderQty = Math.ceil(gap);
            systemOrder = {
                month: index,
                year,
                monthNumber: month,
                yearMonth: `${year}-${month}`,
                quantity: orderQty,
                isoDate
            };
            finalClosingStock = closingStock + orderQty;
        }

        this.logger.simulation(index, {
            ym, open: openingStock, in: inbound, loss, demand: consumption,
            close: closingStock, gap, order: systemOrder?.quantity || 0
        });

        return {
            index, isoDate, year, month, yearMonthIndex: ym,
            openingStock, inbound, writeOff: loss, consumption,
            closingStock: finalClosingStock, requiredInventory: required, gap, systemOrder,
            monthsCover: null
        };
    }

    calculateRequirements(closingStock, consumptionByMonth, allInbound, currentDate, targetCoverMonths) {
        let required = 0;
        let futureInbound = 0;

        for (let k = 1; k <= targetCoverMonths; k++) {
            const futureDate = addMonthsUTC(currentDate, k);
            const futureIso = toDataverseDate(futureDate);
            required += consumptionByMonth[futureIso] || 0;
            futureInbound += allInbound[futureIso] || 0;
        }

        const gap = required - (closingStock + futureInbound);
        return { required, futureInbound, gap };
    }

    addMonthsCoverToResults(results, consumptionByMonth) {
        this.logger.methodStart('addMonthsCoverToResults', { resultCount: results.length });

        results.forEach(result => {
            const futureConsumption = this.consumptionService.getConsumptionArray(
                consumptionByMonth,
                result.isoDate,
                config.calculation.maxMonthsCoverOffset
            );

            result.monthsCover = this.monthsCoverService.calculateMonthsCover(
                result.closingStock,
                futureConsumption
            );
        });

        this.logger.methodEnd('addMonthsCoverToResults');
    }

    calculateWriteOffs(agingData, cutoffDate) {
        this.logger.methodStart('calculateWriteOffs');

        const writeOffByMonth = {};
        let totalWriteOff = 0;

        agingData.forEach(record => {
            const qty = record.new_nearexpiryquantity || 0;
            const expiryDate = new Date(record.new_expirydate);
            const expiryMonth = startOfMonthUTC(expiryDate);
            const nonSellDate = addMonthsUTC(expiryMonth, -this.noSellBuffer);

            if (expiryDate <= cutoffDate && nonSellDate <= cutoffDate) {
                totalWriteOff += qty;
            } else if (expiryDate > cutoffDate) {
                const iso = toDataverseDate(nonSellDate);
                writeOffByMonth[iso] = (writeOffByMonth[iso] || 0) + qty;
            }
        });

        this.logger.info(`Write-offs: total=${totalWriteOff}, future months=${Object.keys(writeOffByMonth).length}`);
        this.logger.methodEnd('calculateWriteOffs');

        return { writeOffByMonth, totalWriteOff };
    }

    buildInboundMap(manualOrders) {
        this.logger.methodStart('buildInboundMap');

        const inboundByMonth = {};
        let maxYM = 0;

        manualOrders.forEach(order => {
            const ym = order.new_year * 12 + (order.new_month - 1);
            maxYM = Math.max(maxYM, ym);

            const date = new Date(Date.UTC(order.new_year, order.new_month - 1, 1));
            const iso = toDataverseDate(date);
            inboundByMonth[iso] = (inboundByMonth[iso] || 0) + (order.new_orderitemqty || 0);
        });

        this.logger.info(`Inbound map: ${Object.keys(inboundByMonth).length} months, maxYM=${maxYM}`);
        this.logger.methodEnd('buildInboundMap');

        return { inboundByMonth, manualOrdersMaxYM: maxYM };
    }
}

module.exports = { StockSimulationService };
