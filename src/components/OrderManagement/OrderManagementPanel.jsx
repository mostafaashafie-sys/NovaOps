import { useState, useEffect } from 'react';
import { useApp } from '@/providers/index.js';
import { 
  useOrderManagement,
  PanelHeader, 
  UnifiedDetailsTab
} from './components/index.js';
import { 
  StatusModal, 
  AllocationModal, 
  ForecastModal, 
  PlanModal, 
  ConfirmToPOWizard, 
  RegulatoryRejectModal,
  EditOrderItemModal
} from './modals/index.js';
import { usePOs, useShipments } from '@/hooks/index.js';

/**
 * Order Management Panel
 * Comprehensive sidebar for managing order items, POs, allocations, and shipments
 * Uses extracted components and hooks for better maintainability
 */
export const OrderManagementPanel = ({ 
  isOpen, 
  onClose, 
  orderItemId, 
  countryId, 
  skuId, 
  monthKey,
  onCreateOrder,
  onOrderCreated
}) => {
  const { data } = useApp();
  const { pos, checkAndUpdatePOCompletion, refresh: refreshPOs } = usePOs();
  const { updateShipmentStatus, refresh: refreshShipments } = useShipments();
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showConfirmToPOModal, setShowConfirmToPOModal] = useState(false);
  const [showRegulatoryRejectModal, setShowRegulatoryRejectModal] = useState(false);
  const [showEditOrderItemModal, setShowEditOrderItemModal] = useState(false);

  // Use custom hook for business logic
  const {
    orderItem,
    po,
    loading,
    allocationForm,
    setAllocationForm,
    handleStatusChange,
    handleAllocate,
    handlePlanOrderItem,
    handleConfirmToPO,
    handleUpdateForecast,
    handleApproveRegulatory,
    handleRejectRegulatory,
    handleUpdateOrderItem,
    handleDeleteOrderItem,
    resetAllocationForm,
    loadOrderItem,
    labels,
    forecasts
  } = useOrderManagement({ orderItemId, countryId, skuId, monthKey, isOpen });

  // Find related data
  const relatedForecast = forecasts.find(f => 
    f.countryId === countryId && 
    f.skuId === skuId && 
    f.monthKey === monthKey
  );

  const availableMonths = data?.months?.filter(m => !m.isPast) || [];

  // Refresh order item when allocation modal opens to ensure latest status
  useEffect(() => {
    if (showAllocateModal && orderItemId) {
      loadOrderItem();
    }
  }, [showAllocateModal, orderItemId, loadOrderItem]);

  // Early return AFTER all hooks are called
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out">
        <PanelHeader orderItem={orderItem} onClose={onClose} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            <UnifiedDetailsTab
              orderItem={orderItem}
              orderItemId={orderItemId}
              countryId={countryId}
              skuId={skuId}
              monthKey={monthKey}
              po={po}
              onOrderCreated={async (newOrderItem) => {
                // Refresh the order item in the panel
                await loadOrderItem();
                // Call parent's onOrderCreated to refresh data and close panel
                if (onOrderCreated) {
                  await onOrderCreated(newOrderItem);
                }
              }}
              onPlan={() => setShowPlanModal(true)}
              onConfirmToPO={async () => {
                // Ensure order item is loaded before opening wizard
                if (orderItemId) {
                  await loadOrderItem();
                }
                setShowConfirmToPOModal(true);
              }}
              onAllocate={() => {
                resetAllocationForm();
                setShowAllocateModal(true);
              }}
              onChangeStatus={async () => {
                if (orderItem && orderItem.status === 'Shipped to Market') {
                  try {
                    await handleStatusChange('Arrived to Market');
                    // Check PO completion after status change
                    if (orderItem.poId) {
                      await checkAndUpdatePOCompletion(orderItem.poId);
                      await refreshPOs();
                    }
                  } catch (err) {
                    showMessage.error(err.message);
                  }
                } else {
                  setShowStatusModal(true);
                }
              }}
              onApproveRegulatory={async () => {
                try {
                  await handleApproveRegulatory();
                } catch (err) {
                  showMessage.error(err.message);
                }
              }}
              onRejectRegulatory={() => setShowRegulatoryRejectModal(true)}
              onEditOrderItem={() => setShowEditOrderItemModal(true)}
              onDeleteOrderItem={async () => {
                try {
                  await handleDeleteOrderItem();
                } catch (err) {
                  showMessage.error(err.message);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        orderItem={orderItem}
        onStatusChange={handleStatusChange}
      />

      <AllocationModal
        isOpen={showAllocateModal}
        onClose={async () => {
          setShowAllocateModal(false);
          // Refresh order item when modal closes to ensure latest status
          if (orderItemId) {
            await loadOrderItem();
          }
        }}
        orderItem={orderItem}
        allocationForm={allocationForm}
        setAllocationForm={setAllocationForm}
        availableMonths={availableMonths}
        onAllocate={handleAllocate}
        onResetForm={resetAllocationForm}
      />

      <ForecastModal
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
        countryId={countryId}
        skuId={skuId}
        monthKey={monthKey}
        data={data}
        relatedForecast={relatedForecast}
        onUpdateForecast={handleUpdateForecast}
      />

      <PlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        orderItem={orderItem}
        pos={pos}
        onPlanOrderItem={handlePlanOrderItem}
      />

      <ConfirmToPOWizard
        isOpen={showConfirmToPOModal}
        onClose={() => setShowConfirmToPOModal(false)}
        orderItem={orderItem}
        labels={labels || []}
        pos={pos || []}
        onConfirmToPO={handleConfirmToPO}
      />

      <RegulatoryRejectModal
        isOpen={showRegulatoryRejectModal}
        onClose={() => setShowRegulatoryRejectModal(false)}
        orderItem={orderItem}
        onReject={async (reason) => {
          try {
            await handleRejectRegulatory(reason);
            setShowRegulatoryRejectModal(false);
          } catch (err) {
            alert(err.message);
          }
        }}
      />

      <EditOrderItemModal
        isOpen={showEditOrderItemModal}
        onClose={() => setShowEditOrderItemModal(false)}
        orderItem={orderItem}
        onUpdateOrderItem={async (updates) => {
          try {
            await handleUpdateOrderItem(updates);
            setShowEditOrderItemModal(false);
          } catch (err) {
            alert(err.message);
          }
        }}
      />
    </>
  );
};

export default OrderManagementPanel;
