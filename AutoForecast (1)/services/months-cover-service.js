// ==============================================================================
// MONTHS COVER SERVICE - services/months-cover-service.js
// Iterative months cover calculation matching DAX logic exactly
// ==============================================================================

const { config } = require('../config');

class MonthsCoverService {
    constructor(logger) {
        this.logger = logger.child('MONTHS-COVER');
        this.maxOffset = config.calculation.maxMonthsCoverOffset;
    }

    /**
     * Calculate months cover using iterative approach
     * This matches the exact DAX logic for consistency across platforms
     * 
     * @param {number} currentStock - Current closing stock
     * @param {Array} futureConsumption - Array of { offset, consumption, daysInMonth }
     * @returns {number} - Months cover (e.g., 3.45 means 3 full months + 45% of 4th month)
     */
    calculateMonthsCover(currentStock, futureConsumption) {
        this.logger.debug(`calculateMonthsCover: stock=${currentStock}, months=${futureConsumption.length}`);

        // Handle edge cases
        if (currentStock <= 0) {
            return 0;
        }

        // Filter to only months with consumption
        const validMonths = futureConsumption.filter(m => m.consumption > 0);
        
        if (validMonths.length === 0) {
            return this.maxOffset;
        }

        // Calculate cumulative consumption for each month
        const cumulativeTable = this.buildCumulativeTable(validMonths);
        
        // Find the last month fully covered by current stock
        const lastFullMonth = this.findLastFullMonth(cumulativeTable, currentStock);
        
        // Calculate result based on whether we have fully covered months
        let monthsCover;
        
        if (lastFullMonth === null) {
            // Stock doesn't even cover the first month fully
            monthsCover = this.calculatePartialFirstMonth(validMonths[0], currentStock);
        } else {
            // Stock covers some full months, calculate fraction of next month
            monthsCover = this.calculateWithFullMonths(
                cumulativeTable, 
                validMonths, 
                lastFullMonth, 
                currentStock
            );
        }

        return Math.round(monthsCover * 100) / 100;  // Round to 2 decimal places
    }

    buildCumulativeTable(validMonths) {
        let cumulative = 0;
        return validMonths.map(month => {
            cumulative += month.consumption;
            return {
                ...month,
                cumulativeConsumption: cumulative
            };
        });
    }

    findLastFullMonth(cumulativeTable, stock) {
        let lastFullMonth = null;
        
        for (const month of cumulativeTable) {
            if (month.cumulativeConsumption <= stock) {
                lastFullMonth = month;
            } else {
                break;
            }
        }
        
        return lastFullMonth;
    }

    calculatePartialFirstMonth(firstMonth, stock) {
        const { consumption, daysInMonth } = firstMonth;
        
        if (consumption <= 0 || daysInMonth <= 0) {
            return 0;
        }
        
        const dailyConsumption = consumption / daysInMonth;
        const daysCovered = stock / dailyConsumption;
        
        return daysCovered / daysInMonth;
    }

    calculateWithFullMonths(cumulativeTable, validMonths, lastFullMonth, stock) {
        const fullMonths = lastFullMonth.offset;
        const cumulativeAtFull = lastFullMonth.cumulativeConsumption;
        const remainder = stock - cumulativeAtFull;
        
        const nextMonthData = validMonths.find(m => m.offset === fullMonths + 1);
        
        if (!nextMonthData || remainder <= 0) {
            return fullMonths;
        }
        
        const { consumption: nextConsumption, daysInMonth: nextDays } = nextMonthData;
        
        if (nextConsumption <= 0 || nextDays <= 0) {
            return fullMonths;
        }
        
        const dailyConsumption = nextConsumption / nextDays;
        const daysCovered = remainder / dailyConsumption;
        const fractionNext = daysCovered / nextDays;
        
        return fullMonths + fractionNext;
    }

    runValidation() {
        this.logger.info('Running months cover validation tests...');
        
        const testCases = [
            { name: 'Exact 3 months', stock: 300, consumption: [
                { offset: 1, consumption: 100, daysInMonth: 30 },
                { offset: 2, consumption: 100, daysInMonth: 31 },
                { offset: 3, consumption: 100, daysInMonth: 30 },
                { offset: 4, consumption: 100, daysInMonth: 31 }
            ], expected: 3.0 },
            { name: 'Half month', stock: 50, consumption: [
                { offset: 1, consumption: 100, daysInMonth: 30 }
            ], expected: 0.5 },
            { name: '2.5 months', stock: 250, consumption: [
                { offset: 1, consumption: 100, daysInMonth: 30 },
                { offset: 2, consumption: 100, daysInMonth: 30 },
                { offset: 3, consumption: 100, daysInMonth: 30 }
            ], expected: 2.5 },
            { name: 'Zero stock', stock: 0, consumption: [
                { offset: 1, consumption: 100, daysInMonth: 30 }
            ], expected: 0 }
        ];
        
        let passed = 0;
        testCases.forEach(test => {
            const result = this.calculateMonthsCover(test.stock, test.consumption);
            const pass = Math.abs(result - test.expected) < 0.01;
            if (pass) passed++;
            this.logger.info(`${pass ? '✓' : '✗'} ${test.name}: ${result} (expected ${test.expected})`);
        });
        
        this.logger.info(`Validation: ${passed}/${testCases.length} tests passed`);
        return passed === testCases.length;
    }
}

module.exports = { MonthsCoverService };
