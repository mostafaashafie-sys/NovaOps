import React from 'react';
import { Modal, StatusBadge } from '../../index.js';
import { formatNumber, formatDate, formatDateTime } from '../../../utils/index.js';

/**
 * Order Details Modal Component
 * Displays detailed information about an order
 */
export const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  if (!order) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Order ${order.id}`} 
      size="lg"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} />
          {order.tender && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              Tender
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">SKU</p>
            <p className="font-medium">{order.skuName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Country</p>
            <p className="font-medium">{order.countryName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Quantity</p>
            <p className="font-medium">{formatNumber(order.qtyCartons)} cartons</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Channel</p>
            <p className="font-medium">{order.channel}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">{formatDate(order.createdOn)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Modified</p>
            <p className="font-medium">{formatDate(order.modifiedOn)}</p>
          </div>
        </div>

        {order.history && order.history.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">History</h3>
            <div className="space-y-2">
              {order.history.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entry.action}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {entry.by} • {formatDateTime(entry.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;

