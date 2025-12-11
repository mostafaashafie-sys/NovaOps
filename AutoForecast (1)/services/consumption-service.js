// ==============================================================================
// CONSUMPTION SERVICE - services/consumption-service.js
// Handles consumption forecasting and budget fallback logic
// ==============================================================================

const { toDataverseDate, addMonthsUTC, daysInMonth } = require('../utils/date-utils');
const { config } = require('../config');

class ConsumptionService {
    constructor(logger) {
        this.logger = logger.child('CONSUMPTION');
    }

    buildConsumptionMap(forecasts, budgets, startDate, monthsAhead, safetyMargin = 1.0) {
        this.logger.methodStart('buildConsumptionMap', { monthsAhead, safetyMargin });

        const forecastMap = this.buildForecastMap(forecasts);
        const budgetMap = this.buildBudgetMap(budgets);
        const consumptionByMonth = {};
        
        for (let i = 1; i <= monthsAhead; i++) {
            const date = addMonthsUTC(startDate, i);
            const isoDate = toDataverseDate(date);
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth() + 1;
            
            const consumption = this.getMonthConsumption(
                isoDate, year, month, 
                forecastMap, budgetMap, 
                safetyMargin
            );
            
            consumptionByMonth[isoDate] = consumption;
        }
        
        this.logger.info(`Built consumption map for ${Object.keys(consumptionByMonth).length} months`);
        this.logger.methodEnd('buildConsumptionMap');
        
        return consumptionByMonth;
    }

    buildForecastMap(forecasts) {
        const map = {};
        
        forecasts.forEach(forecast => {
            const date = new Date(Date.UTC(forecast.new_year, forecast.new_month - 1, 1));
            const isoDate = toDataverseDate(date);
            map[isoDate] = (map[isoDate] || 0) + (forecast.new_forecastquantity || 0);
        });
        
        this.logger.debug(`Forecast map: ${Object.keys(map).length} months with data`);
        return map;
    }

    buildBudgetMap(budgets) {
        const map = {};
        
        budgets.forEach(budget => {
            const key = `${budget.new_year}-${budget.new_month}`;
            map[key] = (map[key] || 0) + (budget.new_budgetedquantity || 0);
        });
        
        this.logger.debug(`Budget map: ${Object.keys(map).length} year-month combinations`);
        return map;
    }

    getMonthConsumption(isoDate, year, month, forecastMap, budgetMap, safetyMargin) {
        let consumption = 0;
        let source = 'none';
        
        // Priority 1: Use forecast if available
        if (forecastMap[isoDate] != null && forecastMap[isoDate] > 0) {
            consumption = forecastMap[isoDate];
            source = 'forecast';
        } 
        // Priority 2: Try current year budget
        else {
            const currentYearKey = `${year}-${month}`;
            const currentYearBudget = budgetMap[currentYearKey] || 0;
            
            if (currentYearBudget > 0) {
                consumption = currentYearBudget;
                source = 'current-budget';
            } 
            // Priority 3: Fallback to last year's budget
            else {
                const lastYearKey = `${year - 1}-${month}`;
                const lastYearBudget = budgetMap[lastYearKey] || 0;
                consumption = lastYearBudget;
                source = 'lastyear-budget';
            }
        }
        
        const adjustedConsumption = Math.ceil(consumption * safetyMargin);
        
        this.logger.debug(
            `Month ${year}-${month}: ${source} = ${consumption} × ${safetyMargin} = ${adjustedConsumption}`
        );
        
        return adjustedConsumption;
    }

    getConsumptionArray(consumptionByMonth, startIsoDate, monthCount) {
        const startDate = new Date(startIsoDate);
        const consumptionArray = [];
        
        for (let i = 1; i <= monthCount; i++) {
            const date = addMonthsUTC(startDate, i);
            const isoDate = toDataverseDate(date);
            consumptionArray.push({
                offset: i,
                isoDate,
                consumption: consumptionByMonth[isoDate] || 0,
                daysInMonth: daysInMonth(date)
            });
        }
        
        return consumptionArray;
    }
}

module.exports = { ConsumptionService };
