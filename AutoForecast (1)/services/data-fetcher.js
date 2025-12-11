// ==============================================================================
// DATA FETCHER - services/data-fetcher.js
// Fetches all required data from Dataverse
// ==============================================================================

class DataFetcher {
    constructor(dataverseClient, logger) {
        this.client = dataverseClient;
        this.logger = logger.child('DATA-FETCH');
    }

    async fetchAll(sku, country) {
        this.logger.methodStart('fetchAll', { sku, country });

        const [
            skuMeta,
            budgetsResp,
            forecastsResp,
            ordersResp,
            allowedResp,
            agingResp,
            futureInvResp
        ] = await Promise.all([
            this.fetchSkuMetadata(sku),
            this.fetchBudgets(sku, country),
            this.fetchForecasts(sku, country),
            this.fetchOrders(sku, country),
            this.fetchAllowedOrderMonths(sku, country),
            this.fetchAgingData(sku, country),
            this.fetchFutureInventory(sku, country)
        ]);

        const result = {
            skuMeta,
            budgets: budgetsResp.value || [],
            forecasts: forecastsResp.value || [],
            orders: ordersResp.value || [],
            allowedMonths: (allowedResp.value || []).map(r => r.new_month).filter(Number.isFinite),
            agingData: agingResp.value || [],
            oldFutureInventory: futureInvResp.value || []
        };

        this.logger.dataCounts('Fetched records', {
            budgets: result.budgets.length,
            forecasts: result.forecasts.length,
            orders: result.orders.length,
            allowedMonths: result.allowedMonths.length,
            agingRows: result.agingData.length,
            oldFutureInv: result.oldFutureInventory.length
        });

        this.logger.methodEnd('fetchAll');
        return result;
    }

    async fetchSkuMetadata(sku) {
        return this.client.call(
            `new_skutables(${sku})?$select=new_numberoftinspercarton`
        );
    }

    async fetchBudgets(sku, country) {
        return this.client.call(
            `new_budgettables?$select=new_budgetedquantity,new_year,new_month,new_channel&` +
            `$filter=_new_sku_value eq '${sku}' and _new_country_value eq '${country}'`
        );
    }

    async fetchForecasts(sku, country) {
        return this.client.call(
            `new_forecasttables?$select=new_forecasttableid,new_forecastquantity,new_year,new_month,` +
            `new_channel,new_forecaststatus&` +
            `$filter=_new_sku_value eq '${sku}' and _new_country_value eq '${country}'`
        );
    }

    async fetchOrders(sku, country) {
        return this.client.call(
            `new_orderitemses?$select=new_orderitemsid,new_year,new_month,new_orderitemqty,new_orderplacementstatus&` +
            `$filter=_new_sku_value eq '${sku}' and _new_country_value eq '${country}'`
        );
    }

    async fetchAllowedOrderMonths(sku, country) {
        return this.client.call(
            `new_allowedordermonthses?$select=new_month&` +
            `$filter=_new_sku_value eq '${sku}' and _new_country_value eq '${country}'`
        );
    }

    async fetchAgingData(sku, country) {
        return this.client.call(
            `new_stockagingreporttables?$select=new_nearexpiryquantity,new_expirydate&` +
            `$filter=_new_sku_value eq '${sku}' and _new_country_value eq '${country}'`
        );
    }

    async fetchFutureInventory(sku, country) {
        return this.client.call(
            `new_futureinventoryforecasts?$select=new_futureinventoryforecastid&` +
            `$filter=_new_sku_value eq '${sku}' and _new_country_value eq '${country}'`
        );
    }
}

module.exports = { DataFetcher };
