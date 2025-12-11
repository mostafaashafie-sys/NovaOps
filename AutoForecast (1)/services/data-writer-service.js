// ==============================================================================
// DATA WRITER SERVICE - services/data-writer-service.js
// Handles writing calculation results back to Dataverse
// ==============================================================================

const { config } = require('../config');

class DataWriterService {
    constructor(dataverseClient, logger) {
        this.client = dataverseClient;
        this.logger = logger.child('DATA-WRITER');
    }

    async purgeOldData(systemOrders, oldFutureInventory) {
        this.logger.methodStart('purgeOldData', {
            systemOrders: systemOrders.length,
            futureInventory: oldFutureInventory.length
        });

        const deleteRequests = [
            ...systemOrders.map(order => ({
                method: "DELETE",
                path: `new_orderitemses(${order.new_orderitemsid})`
            })),
            ...oldFutureInventory.map(record => ({
                method: "DELETE",
                path: `new_futureinventoryforecasts(${record.new_futureinventoryforecastid})`
            }))
        ];

        if (deleteRequests.length > 0) {
            await this.client.batchInChunks(deleteRequests, 100, 'PurgeOldData');
        }

        this.logger.info(`Purged ${deleteRequests.length} old records`);
        this.logger.methodEnd('purgeOldData');
    }

    async writeResults(simulationResults, systemOrders, sku, country, tinsPerCarton) {
        this.logger.methodStart('writeResults', {
            simulationResults: simulationResults.length,
            systemOrders: systemOrders.length
        });

        const writeRequests = [];

        // Build future inventory write requests
        simulationResults.forEach(result => {
            writeRequests.push(
                this.buildFutureInventoryRequest(result, sku, country)
            );
        });

        // Build system order write requests
        systemOrders.forEach(order => {
            writeRequests.push(
                this.buildOrderRequest(order, sku, country, tinsPerCarton)
            );
        });

        // Execute batch write
        if (writeRequests.length > 0) {
            await this.client.batchInChunks(writeRequests, 100, 'WriteResults');
        }

        this.logger.info(`Wrote ${writeRequests.length} records to Dataverse`);
        this.logger.methodEnd('writeResults');
    }

    buildFutureInventoryRequest(result, sku, country) {
        return {
            method: "POST",
            path: "new_futureinventoryforecasts",
            payload: {
                "new_SKU@odata.bind": `/new_skutables(${sku})`,
                "new_Country@odata.bind": `/new_countrytables(${country})`,
                new_date: result.isoDate,
                new_futureopeningstock: result.openingStock,
                new_futureclosingstock: result.closingStock,
                new_calculatedconsumption: result.consumption,
                new_atriskquantity: result.writeOff,
                new_nonsellablequantity: result.writeOff,
                new_requiredinventory: result.requiredInventory,
                // PRE-CALCULATED MONTHS COVER (field: new_CoverStock / new_coverstock)
                new_coverstock: result.monthsCover
            }
        };
    }

    buildOrderRequest(order, sku, country, tinsPerCarton) {
        return {
            method: "POST",
            path: "new_orderitemses",
            payload: {
                "new_SKU@odata.bind": `/new_skutables(${sku})`,
                "new_Country@odata.bind": `/new_countrytables(${country})`,
                new_date: order.isoDate,
                new_year: order.year,
                new_month: order.monthNumber,
                new_orderitemqty: order.quantity,
                new_orderplacementstatus: config.orderStatus.SYSTEM_GENERATED,
                new_channel: config.channels.DEFAULT,
                new_qtyincartons: order.quantity / tinsPerCarton
            }
        };
    }
}

module.exports = { DataWriterService };
