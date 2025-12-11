import React from 'react';
import { Steps } from 'antd';
import { Modal, StatusBadge, DatePicker, ToggleButton } from '@/components/index.js';
import { formatNumber, showMessage } from '@/utils/index.js';

/**
 * Confirm to PO Wizard Component
 * Multi-step wizard for confirming order items to PO with label selection
 * Step 1: Select/Create PO
 * Step 2: Select Label
 * Step 3: Review & Confirm
 */
export const ConfirmToPOWizard = ({
  isOpen,
  onClose,
  orderItem,
  labels,
  pos,
  onConfirmToPO
}) => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [selectedPOId, setSelectedPOId] = React.useState('');
  const [createNewPO, setCreateNewPO] = React.useState(false);
  const [poName, setPoName] = React.useState('');
  const [poDate, setPoDate] = React.useState('');
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [selectedLabelId, setSelectedLabelId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset wizard when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedPOId(orderItem?.poId || '');
      setCreateNewPO(false);
      setPoName('');
      setPoDate('');
      setDeliveryDate('');
      setSelectedLabelId(orderItem?.labelId || '');
      setIsSubmitting(false);
    } else {
      // Reset all state when modal closes
      setCurrentStep(1);
      setSelectedPOId('');
      setCreateNewPO(false);
      setPoName('');
      setPoDate('');
      setDeliveryDate('');
      setSelectedLabelId('');
      setIsSubmitting(false);
    }
  }, [isOpen, orderItem?.poId, orderItem?.labelId]);

  const filteredLabels = (labels || []).filter(label => 
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

  const canProceedToStep2 = () => {
    if (createNewPO) {
      return poName.trim() && poDate && deliveryDate;
    }
    return selectedPOId || orderItem?.poId;
  };

  const canProceedToStep3 = () => {
    return !!selectedLabelId;
  };

  const canSubmit = () => {
    return canProceedToStep2() && canProceedToStep3();
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !orderItem) {
      showMessage.warning('Order item is not loaded. Please wait and try again.');
      return;
    }
    
    // Double-check order item has a valid ID (GUID or OI- prefixed)
    const isValidOrderItemId = (id) => {
      if (!id) return false;
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return guidPattern.test(id) || id.startsWith('OI-');
    };
    
    if (!orderItem.id || !isValidOrderItemId(orderItem.id)) {
      showMessage.error('Order item ID is invalid. Please refresh and try again.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onConfirmToPO(
        selectedLabelId, 
        createNewPO ? null : (selectedPOId || orderItem?.poId),
        createNewPO ? { poName: poName.trim(), poDate, deliveryDate } : null
      );
      onClose();
    } catch (err) {
      showMessage.error(err.message);
      setIsSubmitting(false);
    }
  };

  const getSelectedPODetails = () => {
    if (createNewPO) {
      return {
        id: poName.trim(),
        status: 'Draft',
        poDate,
        deliveryDate
      };
    }
    const po = availablePOs.find(p => p.id === (selectedPOId || orderItem?.poId));
    return po;
  };

  if (!orderItem) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Confirm Order Item to PO" size="lg">
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected for confirmation</p>
          <p className="text-sm mt-2">Please select a planned order item</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Confirm to PO: ${orderItem.skuName || orderItem.skuId} - ${orderItem.countryName || orderItem.countryId} - ${orderItem.deliveryMonth || 'N/A'}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Steps - Ant Design Steps */}
        <Steps
          current={currentStep - 1}
          onChange={setCurrentStep}
          items={[
            {
              title: 'PO Selection',
              content: 'Select or create PO',
            },
            {
              title: 'Label Selection',
              content: 'Choose regulatory label',
            },
            {
              title: 'Review',
              content: 'Confirm details',
            },
          ]}
          className="mb-6"
        />

        {/* Order Item Summary (always visible) */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Order Item ID:</span>
              <span className="font-mono text-xs font-semibold text-blue-700">{orderItem.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Order:</span>
              <span className="font-semibold text-blue-700">{orderItem.skuName || orderItem.skuId} - {orderItem.countryName || orderItem.countryId} - {orderItem.deliveryMonth || 'N/A'}</span>
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
          </div>
        </div>

        {/* Step 1: PO Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Step 1: Purchase Order Selection</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Order <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {!createNewPO && (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {orderItem?.poId && (
                      <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold font-mono">{orderItem.poId}</span>
                          <StatusBadge status={pos?.find(p => p.id === orderItem.poId)?.status || 'Draft'} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Current PO (can be changed below)</p>
                      </div>
                    )}
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
                                Country: {po.countries[0]}
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
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-semibold text-gray-700">Create New Purchase Order</span>
                  <ToggleButton
                    label={createNewPO ? "Creating New PO" : "Create New PO"}
                    checked={createNewPO}
                    onChange={(checked) => {
                      setCreateNewPO(checked);
                      if (checked) {
                        setSelectedPOId('');
                      } else {
                        setPoName('');
                        setPoDate('');
                        setDeliveryDate('');
                      }
                    }}
                    icon="➕"
                    variant="primary"
                    size="md"
                  />
                </div>
                
                {createNewPO && (
                  <div className="mt-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">📋</span>
                      <h4 className="font-bold text-gray-900 text-base">New PO Details</h4>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        PO Name/ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={poName}
                        onChange={(e) => setPoName(e.target.value)}
                        placeholder="e.g., PO-2025-001"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">Enter a unique name/ID for this purchase order</p>
                    </div>
                    
                    <DatePicker
                      label="PO Date"
                      value={poDate}
                      onChange={setPoDate}
                      required
                      helperText="Date when the PO is issued"
                    />
                    
                    <DatePicker
                      label="Delivery Date"
                      value={deliveryDate}
                      onChange={setDeliveryDate}
                      required
                      min={poDate || undefined}
                      helperText="Expected delivery date for this PO"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Label Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Step 2: Regulatory Label Selection</h3>
            
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
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Step 3: Review & Confirm</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Purchase Order:</span>
                <div className="mt-1">
                  <span className="font-mono font-semibold">{getSelectedPODetails()?.id || 'N/A'}</span>
                  {getSelectedPODetails()?.status && (
                    <StatusBadge status={getSelectedPODetails().status} className="ml-2" />
                  )}
                </div>
                {createNewPO && (
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <p>PO Date: {poDate}</p>
                    <p>Delivery Date: {deliveryDate}</p>
                  </div>
                )}
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Regulatory Label:</span>
                <p className="mt-1 font-semibold">
                  {filteredLabels.find(l => l.id === selectedLabelId)?.name || 'N/A'}
                </p>
              </div>
              
              <div className="pt-2 border-t border-gray-300">
                <p className="text-xs text-gray-600">
                  After confirmation, the order item status will change to <strong>"Pending Regulatory"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Back
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToStep2() && currentStep === 1 || !canProceedToStep3() && currentStep === 2}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Confirming...' : createNewPO ? 'Create PO & Confirm' : 'Confirm to PO'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmToPOWizard;

