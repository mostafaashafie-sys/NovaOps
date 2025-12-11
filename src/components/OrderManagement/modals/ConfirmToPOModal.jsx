import React from 'react';
import { Modal, StatusBadge } from '@/components/index.js';
import { formatNumber } from '@/utils/index.js';

/**
 * Confirm to PO Modal Component
 * Confirms planned order items to PO with label selection (Planned → Pending Regulatory)
 * Allows selecting existing PO or creating new PO
 */
export const ConfirmToPOModal = ({
  isOpen,
  onClose,
  orderItem,
  labels,
  pos,
  onConfirmToPO
}) => {
  const [selectedLabelId, setSelectedLabelId] = React.useState('');
  const [selectedPOId, setSelectedPOId] = React.useState('');
  const [createNewPO, setCreateNewPO] = React.useState(false);
  const [poName, setPoName] = React.useState('');
  const [poDate, setPoDate] = React.useState('');
  const [deliveryDate, setDeliveryDate] = React.useState('');

  React.useEffect(() => {
    if (orderItem?.labelId) {
      setSelectedLabelId(orderItem.labelId);
    } else {
      setSelectedLabelId('');
    }
    if (orderItem?.poId) {
      setSelectedPOId(orderItem.poId);
      setCreateNewPO(false);
    } else {
      setSelectedPOId('');
      setCreateNewPO(false);
    }
    // Reset PO creation form when modal opens/closes
    if (!isOpen) {
      setPoName('');
      setPoDate('');
      setDeliveryDate('');
    }
  }, [orderItem?.labelId, orderItem?.poId, isOpen]);

  const handleConfirm = async () => {
    if (!selectedLabelId) {
      showMessage.warning('Please select a label');
      return;
    }
    if (!createNewPO && !selectedPOId && !orderItem?.poId) {
      showMessage.warning('Please select a PO or choose to create a new one');
      return;
    }
    if (createNewPO) {
      if (!poName || !poName.trim()) {
        showMessage.warning('Please enter a PO name');
        return;
      }
      if (!poDate) {
        showMessage.warning('Please select a PO date');
        return;
      }
      if (!deliveryDate) {
        showMessage.warning('Please select a delivery date');
        return;
      }
    }
    try {
      await onConfirmToPO(
        selectedLabelId, 
        createNewPO ? null : (selectedPOId || orderItem?.poId),
        createNewPO ? { poName: poName.trim(), poDate, deliveryDate } : null
      );
      onClose();
      // Reset form
      setSelectedLabelId('');
      setSelectedPOId('');
      setCreateNewPO(false);
      setPoName('');
      setPoDate('');
      setDeliveryDate('');
    } catch (err) {
      showMessage.error(err.message);
    }
  };

  const filteredLabels = labels.filter(label => 
    !label.countryId || label.countryId === orderItem?.countryId
  );

  // Get available POs (Draft or Pending CFO Approval) that match the order item's country
  const availablePOs = (pos || []).filter(po => {
    const statusMatch = po.status === 'Draft' || po.status === 'Pending CFO Approval';
    if (!statusMatch) return false;
    
    // Filter by country: PO must contain items for the same country as the order item
    if (orderItem?.countryId) {
      // If PO has no items yet, it's available
      if (!po.countries || po.countries.length === 0) return true;
      // If PO has items, they must be for the same country
      return po.countries.length === 1 && po.countries[0] === orderItem.countryId;
    }
    return true;
  });

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={orderItem ? `Confirm to PO: ${orderItem.id}` : "Confirm Order Item to PO"} 
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
              {orderItem.poId && !createNewPO && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Current PO:</span>
                  <span className="font-mono text-sm font-semibold text-indigo-600">{orderItem.poId}</span>
                </div>
              )}
            </div>
          </div>

          {/* PO Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Order <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {!createNewPO && (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {orderItem?.poId ? (
                    <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono">{orderItem.poId}</span>
                        <StatusBadge status={pos?.find(p => p.id === orderItem.poId)?.status || 'Draft'} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Current PO (can be changed below)</p>
                    </div>
                  ) : null}
                  {availablePOs.map(po => (
                    <label 
                      key={po.id} 
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPOId === po.id 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="poSelection"
                        value={po.id}
                        checked={selectedPOId === po.id}
                        onChange={(e) => {
                          setSelectedPOId(e.target.value);
                          setCreateNewPO(false);
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold font-mono">{po.id}</span>
                          <StatusBadge status={po.status} />
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                          <p>{formatNumber(po.totalQtyCartons || 0)} cartons</p>
                          {po.countries && po.countries.length > 0 && (
                            <p className="text-gray-600 font-medium">
                              Country: {(() => {
                                // Try to get country name from PO's orderItems if available
                                const poWithItems = (pos || []).find(p => p.id === po.id);
                                if (poWithItems?.orderItems && poWithItems.orderItems.length > 0) {
                                  const oi = poWithItems.orderItems.find(oi => oi.countryId === po.countries[0]);
                                  return oi?.countryName || po.countries[0];
                                }
                                // Fallback: use country ID
                                return po.countries[0];
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                  {availablePOs.length === 0 && !orderItem?.poId && (
                    <p className="text-sm text-gray-500 text-center py-4">No available POs</p>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createNewPO"
                  checked={createNewPO}
                  onChange={(e) => {
                    setCreateNewPO(e.target.checked);
                    if (e.target.checked) {
                      setSelectedPOId('');
                    } else {
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
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
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
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Regulatory Label <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedLabelId}
              onChange={(e) => setSelectedLabelId(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Label --</option>
              {filteredLabels.map(label => (
                <option key={label.id} value={label.id}>
                  {label.name} {label.description ? `- ${label.description}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Label selection is required to confirm order item to PO. Status will change to "Pending Regulatory".
            </p>
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
              onClick={handleConfirm}
              disabled={
                !selectedLabelId || 
                (!createNewPO && !selectedPOId && !orderItem?.poId) ||
                (createNewPO && (!poName.trim() || !poDate || !deliveryDate))
              }
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createNewPO ? 'Create PO & Confirm' : 'Confirm to PO'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected for confirmation</p>
          <p className="text-sm mt-2">Please select a planned order item</p>
        </div>
      )}
    </Modal>
  );
};

export default ConfirmToPOModal;

