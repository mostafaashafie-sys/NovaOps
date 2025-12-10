import { useApp } from '@/providers/index.js';
import { useOrderItems, usePOs, useShipments, useAllocations } from '@/hooks/index.js';
import { PageHeader, Card, StatusBadge, LoadingState } from '@/components/index.js';
import { formatNumber, formatDate } from '@/utils/index.js';

/**
 * Reports Page Component
 * Displays various reports and analytics for order items, POs, shipments, and allocations
 */
export const ReportsPage = () => {
  const { data, loading: appLoading } = useApp();
  const { orderItems, loading: orderItemsLoading } = useOrderItems();
  const { pos, loading: posLoading } = usePOs();
  const { shipments, loading: shipmentsLoading } = useShipments();
  const { allocations, loading: allocationsLoading } = useAllocations();

  const isLoading = appLoading || orderItemsLoading || posLoading || shipmentsLoading || allocationsLoading;

  if (!data || isLoading) {
    return <LoadingState message="Loading reports..." />;
  }

  // Calculate statistics
  const orderItemStats = {
    total: orderItems.length,
    byStatus: orderItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
    totalQty: orderItems.reduce((sum, item) => sum + (item.qtyCartons || 0), 0),
    byCountry: orderItems.reduce((acc, item) => {
      acc[item.countryId] = (acc[item.countryId] || 0) + 1;
      return acc;
    }, {}),
    bySku: orderItems.reduce((acc, item) => {
      acc[item.skuId] = (acc[item.skuId] || 0) + 1;
      return acc;
    }, {})
  };

  const poStats = {
    total: pos.length,
    byStatus: pos.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {}),
    totalQty: pos.reduce((sum, po) => sum + (po.totalQtyCartons || 0), 0),
    pendingApproval: pos.filter(po => po.status === 'Pending CFO Approval').length,
    completed: pos.filter(po => po.status === 'Completed').length
  };

  const shipmentStats = {
    total: shipments.length,
    byStatus: shipments.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {}),
    totalQty: shipments.reduce((sum, s) => sum + (s.qtyCartons || 0), 0),
    inTransit: shipments.filter(s => s.status === 'Shipped to Market').length,
    arrived: shipments.filter(s => s.status === 'Arrived to Market' || s.status === 'Completed').length
  };

  const allocationStats = {
    total: allocations.length,
    totalAllocated: allocations.reduce((sum, a) => sum + (a.allocatedQty || 0), 0),
    byCountry: allocations.reduce((acc, a) => {
      acc[a.countryId] = (acc[a.countryId] || 0) + (a.allocatedQty || 0);
      return acc;
    }, {})
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports & Analytics" 
        subtitle="Comprehensive reports on orders, POs, shipments, and allocations"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Order Items</div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(orderItemStats.total)}</div>
            <div className="text-sm text-gray-600 mt-2">
              {formatNumber(orderItemStats.totalQty)} cartons
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Purchase Orders</div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(poStats.total)}</div>
            <div className="text-sm text-gray-600 mt-2">
              {formatNumber(poStats.totalQty)} cartons
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Shipments</div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(shipmentStats.total)}</div>
            <div className="text-sm text-gray-600 mt-2">
              {formatNumber(shipmentStats.totalQty)} cartons
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Allocations</div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(allocationStats.total)}</div>
            <div className="text-sm text-gray-600 mt-2">
              {formatNumber(allocationStats.totalAllocated)} cartons allocated
            </div>
          </div>
        </Card>
      </div>

      {/* Order Items Status Report */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items by Status</h2>
          <div className="space-y-3">
            {Object.entries(orderItemStats.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status} />
                    <span className="text-sm text-gray-600">
                      {orderItems.filter(oi => oi.status === status).reduce((sum, oi) => sum + (oi.qtyCartons || 0), 0)} cartons
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{count} items</span>
                </div>
              ))}
          </div>
        </div>
      </Card>

      {/* PO Status Report */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Orders by Status</h2>
          <div className="space-y-3">
            {Object.entries(poStats.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status} />
                    <span className="text-sm text-gray-600">
                      {pos.filter(po => po.status === status).reduce((sum, po) => sum + (po.totalQtyCartons || 0), 0)} cartons
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{count} POs</span>
                </div>
              ))}
          </div>
        </div>
      </Card>

      {/* Shipment Status Report */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Shipments by Status</h2>
          <div className="space-y-3">
            {Object.entries(shipmentStats.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status} />
                    <span className="text-sm text-gray-600">
                      {shipments.filter(s => s.status === status).reduce((sum, s) => sum + (s.qtyCartons || 0), 0)} cartons
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{count} shipments</span>
                </div>
              ))}
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Shipments</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {shipments
                .sort((a, b) => new Date(b.shipDate || b.createdOn) - new Date(a.shipDate || a.createdOn))
                .slice(0, 10)
                .map(shipment => (
                  <div key={shipment.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{shipment.shipmentNumber}</span>
                      <StatusBadge status={shipment.status} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Country: {shipment.countryName || shipment.countryId}</div>
                      <div>Quantity: {formatNumber(shipment.qtyCartons || 0)} cartons</div>
                      {shipment.shipDate && (
                        <div>Ship Date: {formatDate(shipment.shipDate)}</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Approvals</h2>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Regulatory Approvals</span>
                  <span className="text-2xl font-bold text-yellow-600">
                    {orderItemStats.byStatus['Pending Regulatory'] || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Order items awaiting regulatory label approval
                </p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">PO Approvals (CFO)</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {poStats.pendingApproval}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Purchase orders awaiting CFO approval
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;

