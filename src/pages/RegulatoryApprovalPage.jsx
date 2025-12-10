import { useState } from 'react';
import { useApp } from '@/providers/index.js';
import { useOrderItems, usePOs } from '@/hooks/index.js';
import { PageHeader, StatusBadge, DataTable, LoadingState, ErrorState, Modal } from '@/components/index.js';
import { formatNumber, formatDate } from '@/utils/index.js';
import { OrderItemService } from '@/services/index.js';

/**
 * Regulatory Approval Page
 * Allows Regulatory Office to approve or reject labels for order items
 */
export const RegulatoryApprovalPage = () => {
  const { data } = useApp();
  const { orderItems, loading, error, refresh, approveRegulatoryLabel, rejectRegulatoryLabel } = useOrderItems();
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter order items that are pending regulatory approval
  const pendingItems = orderItems.filter(oi => oi.status === 'Pending Regulatory');

  const handleApprove = async (orderItemId) => {
    setProcessing(true);
    try {
      await approveRegulatoryLabel(orderItemId, 'Regulatory Office');
      refresh();
      alert('Label approved successfully');
    } catch (err) {
      alert('Error approving label: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrderItem) return;
    setProcessing(true);
    try {
      await rejectRegulatoryLabel(selectedOrderItem.id, rejectReason, 'Regulatory Office');
      refresh();
      setShowRejectModal(false);
      setSelectedOrderItem(null);
      setRejectReason('');
      alert('Label rejected. Order item returned to Planned status.');
    } catch (err) {
      alert('Error rejecting label: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { label: 'Order Item ID', className: 'font-mono' },
    { label: 'SKU' },
    { label: 'Country' },
    { label: 'Quantity' },
    { label: 'Label' },
    { label: 'PO' },
    { label: 'Delivery Month' },
    { label: 'Actions', className: 'text-center' }
  ];

  const renderRow = (item) => (
    <>
      <td className="px-4 py-3 font-mono text-sm">{item.id}</td>
      <td className="px-4 py-3 font-medium">{item.skuName}</td>
      <td className="px-4 py-3">{item.countryName}</td>
      <td className="px-4 py-3 font-semibold text-blue-600">{formatNumber(item.qtyCartons)} cartons</td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
          {item.labelId || 'N/A'}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-indigo-600">{item.poId || '—'}</td>
      <td className="px-4 py-3">{item.deliveryMonth}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleApprove(item.id)}
            disabled={processing}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => {
              setSelectedOrderItem(item);
              setShowRejectModal(true);
            }}
            disabled={processing}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Reject
          </button>
        </div>
      </td>
    </>
  );

  if (loading) {
    return <LoadingState message="Loading pending approvals..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Regulatory Approval" 
        description="Review and approve/reject regulatory labels for order items"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <p className="font-medium text-blue-900 mb-1">Regulatory Approval Process</p>
            <p className="text-sm text-blue-800">
              Review each order item's assigned label. Approve to move to "Regulatory Approved" status, 
              or reject to return the item to "Planned" status for label correction.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Pending Regulatory Approval ({pendingItems.length})
          </h3>
        </div>

        {pendingItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-medium mb-2">All Clear!</p>
            <p className="text-sm">No order items pending regulatory approval</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={pendingItems}
            renderRow={renderRow}
            emptyMessage="No items pending approval"
          />
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedOrderItem(null);
          setRejectReason('');
        }}
        title={selectedOrderItem ? `Reject Label: ${selectedOrderItem.id}` : "Reject Regulatory Label"}
        size="md"
      >
        {selectedOrderItem && (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                Rejecting this label will return the order item to "Planned" status and remove the label assignment.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Item:</span>
                <span className="font-mono font-semibold">{selectedOrderItem.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SKU:</span>
                <span className="font-medium">{selectedOrderItem.skuName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Country:</span>
                <span className="font-medium">{selectedOrderItem.countryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Label:</span>
                <span className="font-medium">{selectedOrderItem.labelId || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter reason for rejection..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedOrderItem(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Reject Label'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RegulatoryApprovalPage;

