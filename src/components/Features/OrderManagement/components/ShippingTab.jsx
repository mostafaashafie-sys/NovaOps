import React from 'react';
import { StatusBadge } from '../../../index.js';
import { formatDate } from '../../../utils/index.js';

/**
 * Shipping Tab Component
 * Displays shipment information and actions
 */
export const ShippingTab = ({ shipment, onMarkDelivered, onCreateShipment }) => {
  if (!shipment) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">🚚</div>
        <p className="font-medium mb-2">No shipment found</p>
        <p className="text-sm mb-4">No shipment exists for this order item</p>
        <button
          onClick={onCreateShipment}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Shipment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Shipment Information</h3>
        <div className="space-y-3 text-sm mb-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Shipment #:</span>
            <span className="font-mono font-semibold">{shipment.shipmentNumber}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Status:</span>
            <StatusBadge status={shipment.status} />
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Carrier:</span>
            <span className="font-medium">{shipment.carrier}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Ship Date:</span>
            <span className="font-medium">{formatDate(shipment.shipDate)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium">{formatDate(shipment.deliveryDate)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Tracking:</span>
            <span className="font-mono text-sm text-blue-600">{shipment.trackingNumber}</span>
          </div>
        </div>
        {shipment.status === 'In Transit' && (
          <button
            onClick={onMarkDelivered}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Mark as Delivered
          </button>
        )}
      </div>
    </div>
  );
};

export default ShippingTab;

