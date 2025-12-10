import React from 'react';
import { Modal, StatusBadge } from '@/components/index.js';
import { formatNumber } from '@/utils/index.js';

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
  const [selectedPOId, setSelectedPOId] = React.useState('');
  const [createNewPO, setCreateNewPO] = React.useState(false);
  const [poName, setPoName] = React.useState('');
  const [poDate, setPoDate] = React.useState('');
  const [deliveryDate, setDeliveryDate] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSelectedPOId('');
      setCreateNewPO(false);
      setPoName('');
      setPoDate('');
      setDeliveryDate('');
    }
  }, [isOpen]);

  const handlePlan = async (selectedPOId, createNewPO = false, poDetails = {}) => {
    try {
      if (createNewPO) {
        if (!poDetails.poName || !poDetails.poDate || !poDetails.deliveryDate) {
          alert('Please fill all PO details: PO Name, PO Date, and Delivery Date.');
          return;
        }
        if (new Date(poDetails.deliveryDate) < new Date(poDetails.poDate)) {
          alert('Delivery Date cannot be before PO Date.');
          return;
        }
        await onPlanOrderItem(null, true, poDetails);
      } else if (selectedPOId) {
        await onPlanOrderItem(selectedPOId, false);
      } else {
        alert('Please select a PO or choose to create a new one.');
        return;
      }
      onClose();
      // Reset form
      setSelectedPOId('');
      setCreateNewPO(false);
      setPoName('');
      setPoDate('');
      setDeliveryDate('');
    } catch (err) {
      alert(err.message);
    }
  };

  const availablePOs = pos.filter(po => po.status === 'Draft' || po.status === 'Pending CFO Approval');

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
                    checked={selectedPOId === po.id && !createNewPO}
                    onChange={() => {
                      setSelectedPOId(po.id);
                      setCreateNewPO(false);
                    }}
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
            
            {availablePOs.length > 0 && selectedPOId && !createNewPO && (
              <button
                onClick={() => handlePlan(selectedPOId, false)}
                className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Plan with Selected PO
              </button>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createNewPO"
                checked={createNewPO}
                onChange={(e) => {
                  setCreateNewPO(e.target.checked);
                  if (!e.target.checked) {
                    setPoName('');
                    setPoDate('');
                    setDeliveryDate('');
                  }
                }}
                className="w-4 h-4"
              />
              <label htmlFor="createNewPO" className="text-sm font-medium text-gray-700 cursor-pointer">
                Create New PO
              </label>
            </div>
            
            {createNewPO && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                <h4 className="font-semibold text-gray-900 text-sm mb-3">New PO Details</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Name/ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={poName}
                    onChange={(e) => setPoName(e.target.value)}
                    placeholder="e.g., PO-2025-001"
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter a unique name/ID for this purchase order</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Date when the PO is issued</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                    min={poDate || undefined}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Expected delivery date for this PO</p>
                </div>
                
                <button
                  onClick={() => handlePlan(null, true, { poName, poDate, deliveryDate })}
                  disabled={!poName.trim() || !poDate || !deliveryDate}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create PO & Plan Order Item
                </button>
              </div>
            )}
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

