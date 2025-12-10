import React, { useState } from 'react';
import { useApp } from '../../providers/index.js';
import { 
  useOrderManagement,
  PanelHeader, 
  PanelTabs, 
  DetailsTab, 
  ActionsTab, 
  POTab, 
  ForecastTab, 
  ShippingTab,
  StatusModal,
  AllocationModal,
  ShipmentModal,
  ForecastModal,
  PlanModal,
  POApprovalModal
} from './components/index.js';
import { usePOs, useShipments } from '../../hooks/index.js';

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
  onCreateOrder 
}) => {
  const { data } = useApp();
  const [activeTab, setActiveTab] = useState('details');
  const { pos } = usePOs();
  const { updateShipmentStatus, refresh: refreshShipments } = useShipments();
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPOApprovalModal, setShowPOApprovalModal] = useState(false);

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
    handleRequestPOApproval,
    handleConfirmPOToUP,
    handleCreateShipment,
    handleUpdateForecast,
    resetAllocationForm,
    loadOrderItem,
    forecasts
  } = useOrderManagement({ orderItemId, countryId, skuId, monthKey, isOpen });

  if (!isOpen) return null;

  // Find related data
  const relatedForecast = forecasts.find(f => 
    f.countryId === countryId && 
    f.skuId === skuId && 
    f.monthKey === monthKey
  );

  const relatedShipment = orderItem ? data?.shipments?.find(s => s.orderItemId === orderItem.id) : null;

  const availableMonths = data?.months?.filter(m => !m.isPast) || [];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <DetailsTab orderItem={orderItem} />;
      case 'actions':
        return (
          <ActionsTab
            orderItem={orderItem}
            onPlan={() => setShowPlanModal(true)}
            onChangeStatus={() => setShowStatusModal(true)}
            onAllocate={() => {
              resetAllocationForm();
              setShowAllocateModal(true);
            }}
            onCreateShipment={() => setShowShipmentModal(true)}
          />
        );
      case 'po':
        return (
          <POTab
            po={po}
            orderItem={orderItem}
            onRequestApproval={() => setShowPOApprovalModal(true)}
            onConfirmToUP={async () => {
              if (po) {
                try {
                  await handleConfirmPOToUP(po.id);
                } catch (err) {
                  alert(err.message);
                }
              }
            }}
            onPlan={() => setShowPlanModal(true)}
          />
        );
      case 'forecast':
        return (
          <ForecastTab
            forecast={relatedForecast}
            onCreate={() => setShowForecastModal(true)}
            onUpdate={() => setShowForecastModal(true)}
          />
        );
      case 'shipping':
        return (
          <ShippingTab
            shipment={relatedShipment}
            onMarkDelivered={async () => {
              if (relatedShipment) {
                try {
                  await updateShipmentStatus(relatedShipment.id, 'Delivered');
                  await refreshShipments();
                  await loadOrderItem();
                } catch (err) {
                  console.error('Error updating shipment:', err);
                  alert(err.message);
                }
              }
            }}
            onCreateShipment={() => setShowShipmentModal(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out">
        <PanelHeader orderItem={orderItem} onClose={onClose} />
        <PanelTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            renderTabContent()
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
        onClose={() => setShowAllocateModal(false)}
        orderItem={orderItem}
        allocationForm={allocationForm}
        setAllocationForm={setAllocationForm}
        availableMonths={availableMonths}
        onAllocate={handleAllocate}
        onResetForm={resetAllocationForm}
      />

      <ShipmentModal
        isOpen={showShipmentModal}
        onClose={() => setShowShipmentModal(false)}
        orderItem={orderItem}
        onCreateShipment={handleCreateShipment}
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

      <POApprovalModal
        isOpen={showPOApprovalModal}
        onClose={() => setShowPOApprovalModal(false)}
        po={po}
        onRequestApproval={handleRequestPOApproval}
      />
    </>
  );
};

export default OrderManagementPanel;
