import { Modal, StatusBadge } from '@/components/index.js';
import { formatNumber, showMessage } from '@/utils/index.js';

/**
 * Status Change Modal Component
 * Allows changing the status of an order item
 */
export const StatusModal = ({ isOpen, onClose, orderItem, onStatusChange }) => {
  const statuses = [
    'Forecasted',
    'Planned',
    'Pending Regulatory',
    'Regulatory Approved',
    'Order Approved',
    'Back Order',
    'Allocated to Market',
    'Shipped to Market',
    'Arrived to Market',
    'Deleted'
  ];

  const handleStatusClick = async (status) => {
    try {
      await onStatusChange(status);
      onClose();
    } catch (err) {
      showMessage.error(err.message);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={orderItem ? `Change Status: ${orderItem.id}` : "Change Order Item Status"} 
      size="md"
    >
      {orderItem ? (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Order Item:</span>
                <span className="font-mono font-semibold text-blue-700">{orderItem.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Current status:</span>
                <StatusBadge status={orderItem.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">SKU:</span>
                <span className="font-semibold">{orderItem.skuName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Quantity:</span>
                <span className="font-semibold">{formatNumber(orderItem.qtyCartons)} cartons</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                disabled={orderItem.status === status}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  orderItem.status === status
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-900 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{status}</span>
                  {orderItem.status === status && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">Current</span>
                  )}
                </div>
              </button>
            ))}
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

export default StatusModal;

