import React, { useState } from 'react';
import { Modal } from '@/components/index.js';

/**
 * Regulatory Reject Modal Component
 * Allows regulatory office to reject a label with a reason
 */
export const RegulatoryRejectModal = ({
  isOpen,
  onClose,
  orderItem,
  onReject
}) => {
  const [reason, setReason] = useState('');

  const handleReject = async () => {
    try {
      await onReject(reason);
      setReason('');
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={orderItem ? `Reject Label: ${orderItem.id}` : "Reject Regulatory Label"} 
      size="md"
    >
      {orderItem ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              Rejecting this label will return the order item to "Planned" status and remove the label assignment.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Enter reason for rejection..."
            />
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
              onClick={handleReject}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md"
            >
              Reject Label
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected</p>
        </div>
      )}
    </Modal>
  );
};

export default RegulatoryRejectModal;

