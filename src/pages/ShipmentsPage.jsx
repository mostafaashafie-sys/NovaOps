import { useState } from 'react';
import { useApp } from '@/providers/index.js';
import { useShipments, useOrderItems } from '@/hooks/index.js';
import { FilterBar, StatusBadge, PageHeader, LoadingState, ErrorState, ShipmentDetailsModal } from '@/components/index.js';
import { MultiShipmentModal } from '@/components/OrderManagement/modals/index.js';
import { formatNumber } from '@/utils/index.js';

/**
 * Shipments Page Component
 * Enhanced with multi-select shipping capability
 */
export const ShipmentsPage = () => {
  const { data } = useApp();
  const { shipments, loading, error, filters, setFilters, refresh, addToShipment } = useShipments();
  const { orderItems } = useOrderItems();
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showMultiShipmentModal, setShowMultiShipmentModal] = useState(false);

  if (!data || loading) {
    return <LoadingState message="Loading shipments..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const handleCreateShipment = async (shipmentData) => {
    try {
      await ShipmentService.createShipment(shipmentData);
      await refresh();
    } catch (err) {
      alert('Error creating shipment: ' + err.message);
      throw err;
    }
  };

  const handleAddToShipment = async (shipmentId, orderItemIds) => {
    try {
      await ShipmentService.addOrderItemsToShipment(shipmentId, orderItemIds);
      await refresh();
    } catch (err) {
      alert('Error adding items to shipment: ' + err.message);
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Shipping Management" 
        description="Track and manage shipments"
        action={() => setShowMultiShipmentModal(true)}
        actionLabel="Create Shipment"
      />

      <FilterBar filters={filters} onFilterChange={setFilters} showSKU={false} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Shipment #</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Destination</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map(shipment => (
              <tr 
                key={shipment.id} 
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                onClick={() => setSelectedShipment(shipment)}
              >
                <td className="px-4 py-3 font-medium text-blue-600">{shipment.shipmentNumber}</td>
                <td className="px-4 py-3 text-gray-600">{shipment.orderId}</td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{shipment.skuId}</div>
                    <div className="text-xs text-gray-400">{shipment.skuName}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{shipment.countryName}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNumber(shipment.qtyCartons)}</td>
                <td className="px-4 py-3"><StatusBadge status={shipment.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShipmentDetailsModal 
        isOpen={!!selectedShipment} 
        onClose={() => setSelectedShipment(null)} 
        shipment={selectedShipment}
      />

      <MultiShipmentModal
        isOpen={showMultiShipmentModal}
        onClose={() => setShowMultiShipmentModal(false)}
        onCreateShipment={handleCreateShipment}
        onAddToShipment={handleAddToShipment}
      />
    </div>
  );
};

export default ShipmentsPage;

