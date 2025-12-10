import React from 'react';
import { Modal, StatusBadge } from '../../../../index.js';
import { formatNumber } from '../../../../utils/index.js';

/**
 * Plan Order Item Modal Component
 * Links forecasted order items to POs or creates new POs
 */
export const PlanModal = ({
  isOpen,
  onClose,
  orderItem,
  pos,
  onPlanOrderItem
}) => {
  const handlePlan = async (selectedPOId, createNewPO = false) => {
    try {
      await onPlanOrderItem(selectedPOId, createNewPO);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const availablePOs = pos.filter(po => po.status === 'Draft' || po.status === 'Approval Requested');

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={orderItem ? `Plan Order Item: ${orderItem.id}` : "Plan Order Item"} 
      size="lg"
    >
      {orderItem ? (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Order Item:</span>
                <span className="font-mono font-semibold text-blue-700">{orderItem.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <StatusBadge status={orderItem.status} />
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
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Delivery Month:</span>
                <span className="font-semibold">{orderItem.deliveryMonth}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Purchase Order</label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
              {availablePOs.map(po => (
                <label key={po.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="poSelection"
                    value={po.id}
                    onChange={() => handlePlan(po.id, false)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{po.id}</span>
                      <StatusBadge status={po.status} />
                    </div>
                    <p className="text-xs text-gray-500">{formatNumber(po.totalQtyCartons)} cartons</p>
                  </div>
                </label>
              ))}
              {availablePOs.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No available POs</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <button
              onClick={() => handlePlan(null, true)}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create New PO
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected for planning</p>
          <p className="text-sm mt-2">Please select a forecasted order item</p>
        </div>
      )}
    </Modal>
  );
};

export default PlanModal;

