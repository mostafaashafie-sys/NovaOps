import React from 'react';
// No external dependencies

/**
 * Actions Tab Component
 * Displays quick action buttons for order item management
 */
export const ActionsTab = ({ orderItem, onPlan, onChangeStatus, onAllocate, onCreateShipment }) => {
  if (!orderItem) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Select an order item to see available actions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>⚡</span>
        Quick Actions
      </h3>
      
      {/* Plan Forecasted Item */}
      {orderItem.status === 'Forecasted' && (
        <button
          onClick={onPlan}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-left transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
              📝
            </div>
            <div>
              <p className="font-semibold">Plan Order Item</p>
              <p className="text-sm opacity-90">Link to PO or create new PO</p>
            </div>
          </div>
        </button>
      )}

      {/* Change Status */}
      <button
        onClick={onChangeStatus}
        className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-left transition-all border border-blue-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xl">
            🔄
          </div>
          <div>
            <p className="font-semibold text-gray-900">Change Status</p>
            <p className="text-sm text-gray-600">Update order item status</p>
          </div>
        </div>
      </button>

      {/* Allocate (only if Confirmed to UP) */}
      {orderItem.status === 'Confirmed to UP' && (
        <button
          onClick={onAllocate}
          className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 rounded-xl text-left transition-all border border-green-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center text-white text-xl">
              📦
            </div>
            <div>
              <p className="font-semibold text-gray-900">Allocate Order Item</p>
              <p className="text-sm text-gray-600">Create allocation (full or partial)</p>
            </div>
          </div>
        </button>
      )}

      {/* Create Shipment */}
      <button
        onClick={onCreateShipment}
        className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-left transition-all border border-purple-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xl">
            🚚
          </div>
          <div>
            <p className="font-semibold text-gray-900">Create Shipment</p>
            <p className="text-sm text-gray-600">Set up shipping details</p>
          </div>
        </div>
      </button>
    </div>
  );
};

export default ActionsTab;

