import { useState } from 'react';
import { StatusBadge, EmptyState, ToggleButton } from '@/components/index.js';
import { formatNumber, formatDateTime, showMessage } from '@/utils/index.js';
import { useOrderItems, useStockCover } from '@/hooks/index.js';
import { useApp } from '@/providers/index.js';

/**
 * Unified Details & Actions Tab Component
 * Combines order item information, lifecycle visualization, and context-aware actions
 */
export const UnifiedDetailsTab = ({ 
  orderItem, 
  orderItemId, 
  countryId, 
  skuId, 
  monthKey, 
  po,
  onOrderCreated,
  onPlan,
  onConfirmToPO,
  onAllocate,
  onChangeStatus,
  onApproveRegulatory,
  onRejectRegulatory,
  onEditOrderItem,
  onDeleteOrderItem
}) => {
  const { data } = useApp();
  const { createOrderItem, refresh, updateOrderItemStatus } = useOrderItems();
  const { refresh: refreshStockCover } = useStockCover(countryId);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    qtyCartons: '',
    channel: 'Private',
    tender: false,
    comments: ''
  });

  // Lifecycle stages with status mapping
  const lifecycleStages = [
    { status: 'Forecasted', label: 'Forecasted', icon: '📊', color: 'gray' },
    { status: 'Planned', label: 'Planned', icon: '📝', color: 'blue' },
    { status: 'Pending Regulatory', label: 'Pending Regulatory', icon: '⏳', color: 'yellow' },
    { status: 'Regulatory Approved', label: 'Regulatory Approved', icon: '✅', color: 'green' },
    { status: 'Back Order', label: 'Back Order', icon: '📦', color: 'purple' },
    { status: 'Allocated to Market', label: 'Allocated', icon: '📋', color: 'indigo' },
    { status: 'Shipped to Market', label: 'Shipped', icon: '🚚', color: 'blue' },
    { status: 'Arrived to Market', label: 'Arrived', icon: '🎉', color: 'green' }
  ];

  const getCurrentStageIndex = () => {
    if (!orderItem) return -1;
    return lifecycleStages.findIndex(stage => stage.status === orderItem.status);
  };

  const getAvailableActions = () => {
    if (!orderItem) return [];

    const actions = [];
    const currentStatus = orderItem.status;

    // Forecasted actions
    if (currentStatus === 'Forecasted') {
      actions.push({
        id: 'edit',
        label: 'Edit Order Item',
        description: 'Adjust quantity and delivery month',
        icon: '✏️',
        color: 'gray',
        onClick: onEditOrderItem,
        primary: false
      });
      actions.push({
        id: 'delete',
        label: 'Delete Order Item',
        description: 'Delete this order item',
        icon: '🗑️',
        color: 'red',
        onClick: onDeleteOrderItem,
        primary: false
      });
      actions.push({
        id: 'plan',
        label: 'Plan Order Item',
        description: 'Link to PO or create new PO',
        icon: '📝',
        color: 'blue',
        onClick: onPlan,
        primary: true
      });
    }

    // Planned actions (can confirm even without PO - will create/select PO)
    if (currentStatus === 'Planned') {
      actions.push({
        id: 'edit',
        label: 'Edit Order Item',
        description: 'Adjust quantity and delivery month',
        icon: '✏️',
        color: 'gray',
        onClick: onEditOrderItem,
        primary: false
      });
      actions.push({
        id: 'delete',
        label: 'Delete Order Item',
        description: 'Delete this order item',
        icon: '🗑️',
        color: 'red',
        onClick: onDeleteOrderItem,
        primary: false
      });
      actions.push({
        id: 'confirm-to-po',
        label: 'Confirm & Link to PO',
        description: 'Select PO (or create new), select label and confirm (Pending Regulatory)',
        icon: '✅',
        color: 'blue',
        onClick: onConfirmToPO,
        primary: true
      });
    }
    
    // Forecasted actions - can also confirm directly (will plan and confirm)
    if (currentStatus === 'Forecasted') {
      actions.push({
        id: 'confirm-to-po-direct',
        label: 'Confirm & Link to PO',
        description: 'Select PO (or create new), select label and confirm (Pending Regulatory)',
        icon: '✅',
        color: 'blue',
        onClick: onConfirmToPO,
        primary: false
      });
    }

    // Pending Regulatory - Regulatory Office actions
    if (currentStatus === 'Pending Regulatory') {
      actions.push({
        id: 'approve-regulatory',
        label: 'Approve Label',
        description: 'Approve the regulatory label',
        icon: '✅',
        color: 'green',
        onClick: onApproveRegulatory,
        primary: true
      });
      actions.push({
        id: 'reject-regulatory',
        label: 'Reject Label',
        description: 'Reject the label (returns to Planned)',
        icon: '❌',
        color: 'red',
        onClick: onRejectRegulatory
      });
    }

    // Regulatory Approved actions
    // Note: Request CFO Approval and Confirm to UP are now done from PO Management page, not from order item
    if (currentStatus === 'Regulatory Approved' && orderItem.poId && po) {
      if (po.status === 'Pending CFO Approval') {
        actions.push({
          id: 'waiting-cfo',
          label: 'Pending CFO Approval',
          description: `PO ${po.id} is pending CFO approval. Manage from PO Management page.`,
          icon: '⏳',
          color: 'yellow',
          disabled: true
        });
      }
    }

    // Order Approved actions (after CFO approves PO)
    if (currentStatus === 'Order Approved' && orderItem.poId && po) {
      if (po.status === 'CFO Approved') {
        actions.push({
          id: 'waiting-confirm-to-up',
          label: 'CFO Approved - Ready for UP',
          description: `PO ${po.id} is CFO approved. Confirm to UP from PO Management page.`,
          icon: '✅',
          color: 'green',
          disabled: true
        });
      } else if (po.status === 'Confirmed to UP') {
        // PO already confirmed to UP, items should be Back Order
        // This is just informational
      }
    }

    // Back Order actions
    if (currentStatus === 'Back Order') {
      actions.push({
        id: 'allocate',
        label: 'Allocate Order Item',
        description: 'Create allocation (full or partial)',
        icon: '📦',
        color: 'green',
        onClick: onAllocate,
        primary: true
      });
    }

    // Allocated to Market actions
    // Note: Shipping is now handled via ShipmentsPage with MultiShipmentModal
    // Users should navigate to Shipments page to create shipments

    // Shipped to Market actions
    if (currentStatus === 'Shipped to Market') {
      actions.push({
        id: 'mark-arrived',
        label: 'Mark as Arrived to Market',
        description: 'Update status to Arrived to Market',
        icon: '📥',
        color: 'green',
        onClick: onChangeStatus
      });
    }

    return actions;
  };

  // Create order form (when no order item exists)
  if (!orderItem && !orderItemId && countryId && skuId && monthKey) {
    const country = data?.countries?.find(c => c.id === countryId);
    const sku = data?.skus?.find(s => s.id === skuId);
    const month = data?.months?.find(m => m.key === monthKey);

    const handleCreateOrder = async (e) => {
      e.preventDefault();
      setIsCreating(true);
      try {
        const newOrderItem = await createOrderItem({
          countryId,
          countryName: country?.name,
          skuId,
          skuName: sku?.name,
          deliveryMonth: monthKey,
          qtyCartons: parseInt(formData.qtyCartons),
          channel: formData.channel,
          tender: formData.tender,
          status: 'Planned', // User-created orders are Planned (not Forecasted)
          comments: formData.comments
        });
        
        await refresh();
        await refreshStockCover();
        
        if (onOrderCreated) {
          await onOrderCreated(newOrderItem);
        }
        setIsCreating(false);
        setFormData({ qtyCartons: '', channel: 'Private', tender: false, comments: '' });
      } catch (err) {
        console.error('Error creating order:', err);
        showMessage.error('Failed to create order: ' + err.message);
        setIsCreating(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <span className="text-2xl">➕</span>
            Create New Order
          </h3>
          <div className="space-y-3 text-sm mb-4 bg-white/70 rounded-lg p-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">SKU:</span>
              <span className="font-semibold text-gray-900">{sku?.name || skuId}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Country:</span>
              <span className="font-semibold text-gray-900">{country?.name || countryId}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Delivery Month:</span>
              <span className="font-medium">{month?.label || monthKey}</span>
            </div>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity (Cartons) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.qtyCartons}
                onChange={(e) => setFormData({ ...formData, qtyCartons: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Private">Private</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Tender</span>
              <ToggleButton
                label="Tender"
                checked={formData.tender}
                onChange={(checked) => setFormData({ ...formData, tender: checked })}
                variant="default"
                size="sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional comments..."
              />
            </div>

            <button
              type="submit"
              disabled={isCreating || !formData.qtyCartons}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-lg">➕</span>
                  Create Order
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading state
  if (!orderItem && orderItemId) {
    return (
      <EmptyState
        icon="⏳"
        title="Loading order..."
        message="Please wait while we load the order details"
      />
    );
  }

  // Empty state
  if (!orderItem) {
    return (
      <EmptyState
        icon="📋"
        title="No order item selected"
        message="Click on an order pill in the table to view details"
      />
    );
  }

  const currentStageIndex = getCurrentStageIndex();
  const availableActions = getAvailableActions();

  return (
    <div className="space-y-5">
      {/* Lifecycle Progress */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        <div className="space-y-3">
          {/* Two-row layout: First 4 stages */}
          <div className="relative">
            {/* Progress line for first row */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
            <div 
              className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500 z-0"
              style={{ 
                width: currentStageIndex >= 0 && currentStageIndex < 4
                  ? `${((currentStageIndex + 1) / 4) * 100}%` 
                  : currentStageIndex >= 4
                  ? '100%'
                  : '0%'
              }}
            ></div>
            
            <div className="relative flex justify-between gap-2">
              {lifecycleStages.slice(0, 4).map((stage, idx) => {
                const isPast = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;
                
                return (
                  <div 
                    key={stage.status} 
                    className="flex flex-col items-center flex-1 relative z-10"
                    title={stage.label}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold transition-all duration-300 flex-shrink-0 ${
                        isCurrent
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110 ring-2 ring-blue-300'
                          : isPast
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {stage.icon}
                    </div>
                    <p className={`text-[11px] mt-2 text-center font-medium leading-tight break-words w-full ${
                      isCurrent ? 'text-blue-600 font-semibold' : isPast ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-row layout: Last 4 stages */}
          <div className="relative">
            {/* Progress line for second row */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
            <div 
              className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500 z-0"
              style={{ 
                width: currentStageIndex >= 4
                  ? `${((currentStageIndex - 3) / 4) * 100}%` 
                  : '0%'
              }}
            ></div>
            
            <div className="relative flex justify-between gap-2">
              {lifecycleStages.slice(4, 8).map((stage, idx) => {
                const actualIdx = idx + 4;
                const isPast = currentStageIndex > actualIdx;
                const isCurrent = currentStageIndex === actualIdx;
                
                return (
                  <div 
                    key={stage.status} 
                    className="flex flex-col items-center flex-1 relative z-10"
                    title={stage.label}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold transition-all duration-300 flex-shrink-0 ${
                        isCurrent
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110 ring-2 ring-blue-300'
                          : isPast
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {stage.icon}
                    </div>
                    <p className={`text-[11px] mt-2 text-center font-medium leading-tight break-words w-full ${
                      isCurrent ? 'text-blue-600 font-semibold' : isPast ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">📦</span>
          Order Details
        </h3>
        {(() => {
          // Calculate deliveryMonth from year and month if missing
          let deliveryMonth = orderItem.deliveryMonth;
          if (!deliveryMonth && orderItem.year && orderItem.month) {
            deliveryMonth = `${orderItem.year}-${String(orderItem.month).padStart(2, '0')}`;
          }
          
          // Look up month label if available
          const monthLabel = data?.months?.find(m => m.key === deliveryMonth)?.label || deliveryMonth;
          
          // Look up SKU name - check multiple sources
          let skuName = orderItem.skuName;
          if (!skuName) {
            // Try from expanded sku object
            if (orderItem.sku) {
              skuName = orderItem.sku.skuName || orderItem.sku.name;
            }
            // Try from skuId lookup
            if (!skuName && orderItem.skuId) {
              const sku = data?.skus?.find(s => s.id === orderItem.skuId);
              skuName = sku?.name || sku?.skuName;
            }
            // Try from filter field value
            if (!skuName && orderItem._new_sku_value) {
              const sku = data?.skus?.find(s => s.id === orderItem._new_sku_value);
              skuName = sku?.name || sku?.skuName;
            }
            // Debug: log if we still don't have a name
            if (!skuName) {
              console.warn('SKU name not found for orderItem', {
                orderItemId: orderItem.id,
                skuName: orderItem.skuName,
                skuId: orderItem.skuId,
                _new_sku_value: orderItem._new_sku_value,
                sku: orderItem.sku,
                availableSkus: data?.skus?.length || 0
              });
              // Show ID if available, otherwise show unknown
              skuName = orderItem.skuId || orderItem._new_sku_value || 'Unknown SKU';
            }
          }
          
          // Look up country name - check multiple sources
          let countryName = orderItem.countryName;
          if (!countryName) {
            // Try from expanded country object
            if (orderItem.country) {
              countryName = orderItem.country.countryName || orderItem.country.name;
            }
            // Try from countryId lookup
            if (!countryName && orderItem.countryId) {
              const country = data?.countries?.find(c => c.id === orderItem.countryId);
              countryName = country?.name || country?.countryName;
            }
            // Try from filter field value
            if (!countryName && orderItem._new_country_value) {
              const country = data?.countries?.find(c => c.id === orderItem._new_country_value);
              countryName = country?.name || country?.countryName;
            }
            // Debug: log if we still don't have a name
            if (!countryName) {
              console.warn('Country name not found for orderItem', {
                orderItemId: orderItem.id,
                countryName: orderItem.countryName,
                countryId: orderItem.countryId,
                _new_country_value: orderItem._new_country_value,
                country: orderItem.country,
                availableCountries: data?.countries?.length || 0
              });
              // Show ID if available, otherwise show unknown
              countryName = orderItem.countryId || orderItem._new_country_value || 'Unknown Country';
            }
          }
          
          return (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-semibold text-gray-900">{skuName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Country:</span>
                  <span className="font-semibold text-gray-900">{countryName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold text-blue-600">{formatNumber(orderItem.qtyCartons || orderItem.qtyInCartons || 0)} cartons</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Delivery Month:</span>
                  <span className="font-medium">{monthLabel}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge status={orderItem.status} />
                </div>
                {(orderItem.poName || orderItem.poId) && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">PO:</span>
                    <span className="font-mono text-sm font-semibold text-indigo-600">{orderItem.poName || orderItem.poId}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {orderItem.isSystemGenerated && (
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              🤖 System Generated
            </span>
          </div>
        )}
        {orderItem.labelId && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Regulatory Label:</span>
              <span className="font-semibold text-sm">{orderItem.labelId}</span>
            </div>
          </div>
        )}
      </div>

      {/* Available Actions */}
      {availableActions.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            Available Actions
          </h3>
          <div className="space-y-3">
            {availableActions.map(action => {
              const colorClasses = {
                blue: action.primary 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-gray-900',
                green: action.primary
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-green-50 hover:bg-green-100 border border-green-200 text-gray-900',
                purple: 'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-gray-900',
                yellow: 'bg-yellow-50 border border-yellow-200 text-gray-900',
                red: 'bg-red-50 hover:bg-red-100 border border-red-200 text-gray-900'
              };

              const iconBgClasses = {
                blue: action.primary ? 'bg-white/20' : 'bg-blue-600',
                green: action.primary ? 'bg-white/20' : 'bg-green-600',
                purple: 'bg-purple-600',
                yellow: 'bg-yellow-600',
                red: 'bg-red-600'
              };

              return (
                <button
                  key={action.id}
                  onClick={action.disabled ? undefined : action.onClick}
                  disabled={action.disabled}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all transform ${
                    action.disabled 
                      ? 'opacity-60 cursor-not-allowed' 
                      : action.primary 
                        ? 'hover:scale-[1.02]' 
                        : ''
                  } ${colorClasses[action.color]}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${iconBgClasses[action.color]} flex items-center justify-center text-white text-xl`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{action.label}</p>
                      <p className={`text-sm ${action.primary ? 'opacity-90' : 'text-gray-600'}`}>
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      {orderItem.history && orderItem.history.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">History</h3>
          <div className="space-y-3">
            {orderItem.history.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{entry.action}</p>
                  <p className="text-gray-500 text-xs mt-1">{entry.by} • {formatDateTime(entry.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedDetailsTab;

