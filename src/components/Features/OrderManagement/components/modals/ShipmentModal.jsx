import React from 'react';
import { Modal } from '../../../../index.js';
import { formatNumber } from '../../../../utils/index.js';

/**
 * Shipment Modal Component
 * Creates a new shipment for an order item
 */
export const ShipmentModal = ({
  isOpen,
  onClose,
  orderItem,
  onCreateShipment
}) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await onCreateShipment({
        shipDate: formData.get('shipDate'),
        deliveryDate: formData.get('deliveryDate'),
        carrier: formData.get('carrier')
      });
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={orderItem ? `Create Shipment for ${orderItem.id}` : "Create Shipment"} 
      size="md"
    >
      {orderItem ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Order Item:</span>
                <span className="font-mono font-semibold text-blue-700">{orderItem.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Quantity:</span>
                <span className="font-semibold">{formatNumber(orderItem.qtyCartons)} cartons</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">SKU:</span>
                <span className="font-semibold">{orderItem.skuName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Country:</span>
                <span className="font-semibold">{orderItem.countryName}</span>
              </div>
              {orderItem.poId && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">PO:</span>
                  <span className="font-mono text-sm font-semibold text-indigo-600">{orderItem.poId}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ship Date *</label>
            <input
              type="date"
              name="shipDate"
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date *</label>
            <input
              type="date"
              name="deliveryDate"
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carrier *</label>
            <select
              name="carrier"
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Carrier</option>
              <option value="DHL">DHL</option>
              <option value="Maersk">Maersk</option>
              <option value="FedEx">FedEx</option>
              <option value="UPS">UPS</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors shadow-md"
            >
              Create Shipment
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected for shipment</p>
        </div>
      )}
    </Modal>
  );
};

export default ShipmentModal;

