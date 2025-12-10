import React from 'react';
import { Modal, StatusBadge } from '../../../../index.js';
import { formatNumber } from '../../../../utils/index.js';

/**
 * PO Approval Request Modal Component
 * Requests approval for a purchase order
 */
export const POApprovalModal = ({
  isOpen,
  onClose,
  po,
  onRequestApproval
}) => {
  const handleRequest = async () => {
    try {
      await onRequestApproval(po.id);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={po ? `Request Approval: ${po.id}` : "Request PO Approval"} 
      size="md"
    >
      {po ? (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Purchase Order:</span>
                <span className="font-mono font-semibold text-blue-700">{po.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <StatusBadge status={po.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Total Quantity:</span>
                <span className="font-semibold text-lg">{formatNumber(po.totalQtyCartons)} cartons</span>
              </div>
              {po.orderItems && po.orderItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="font-medium text-gray-700 mb-2">Order Items ({po.orderItems.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {po.orderItems.map(oi => (
                      <div key={oi.id} className="text-xs bg-white/70 p-2 rounded">
                        {oi.id} - {oi.skuName} ({oi.qtyCartons} cartons)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">This will submit the PO for manager approval.</p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRequest}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md"
            >
              Request Approval
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No purchase order selected</p>
        </div>
      )}
    </Modal>
  );
};

export default POApprovalModal;

