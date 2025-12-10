import React from 'react';
import { StatusBadge } from '../../../index.js';
import { formatNumber } from '../../../utils/index.js';

/**
 * PO Tab Component
 * Displays purchase order details and actions
 */
export const POTab = ({ po, orderItem, onRequestApproval, onConfirmToUP, onPlan }) => {
  if (orderItem?.poId && !po) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-sm text-gray-600">Loading PO details...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📄</div>
        <p className="font-medium mb-2">No Purchase Order</p>
        <p className="text-sm">This order item is not linked to a PO yet</p>
        {orderItem?.status === 'Forecasted' && (
          <button
            onClick={onPlan}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan Order Item
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📄</span>
          Purchase Order Details
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">PO Number:</span>
            <span className="font-mono font-semibold text-indigo-600">{po.id}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Status:</span>
            <StatusBadge status={po.status} />
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Total Quantity:</span>
            <span className="font-semibold">{formatNumber(po.totalQtyCartons)} cartons</span>
          </div>
          {po.orderItems && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Order Items in PO:</p>
              <div className="space-y-1">
                {po.orderItems.map(oi => (
                  <div key={oi.id} className="text-xs bg-gray-50 p-2 rounded">
                    {oi.id} - {oi.skuName} ({oi.qtyCartons} cartons)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PO Actions */}
      <div className="space-y-2">
        {po.status === 'Draft' && (
          <button
            onClick={onRequestApproval}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Request Approval
          </button>
        )}
        {po.status === 'Approved' && (
          <button
            onClick={onConfirmToUP}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Confirm to UP
          </button>
        )}
      </div>
    </div>
  );
};

export default POTab;

