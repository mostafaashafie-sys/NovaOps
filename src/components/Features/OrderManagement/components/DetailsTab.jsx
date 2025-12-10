import React from 'react';
import { StatusBadge, EmptyState } from '../../../index.js';
import { formatNumber, formatDateTime } from '../../../utils/index.js';

/**
 * Details Tab Component
 * Displays order item information and history
 */
export const DetailsTab = ({ orderItem }) => {
  if (!orderItem) {
    return (
      <EmptyState
        icon="📋"
        title="No order item selected"
        message="Click on an order pill in the table to view details"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">📦</span>
          Order Item Information
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">SKU:</span>
            <span className="font-semibold text-gray-900">{orderItem.skuName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Country:</span>
            <span className="font-semibold text-gray-900">{orderItem.countryName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Quantity:</span>
            <span className="font-semibold text-blue-600">{formatNumber(orderItem.qtyCartons)} cartons</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Delivery Month:</span>
            <span className="font-medium">{orderItem.deliveryMonth}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Status:</span>
            <StatusBadge status={orderItem.status} />
          </div>
          {orderItem.poId && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Purchase Order:</span>
              <span className="font-mono text-sm font-semibold text-indigo-600">{orderItem.poId}</span>
            </div>
          )}
          {orderItem.isSystemGenerated && (
            <div className="flex items-center gap-2 py-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                🤖 System Generated
              </span>
            </div>
          )}
        </div>
      </div>

      {orderItem.history && orderItem.history.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
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

export default DetailsTab;

