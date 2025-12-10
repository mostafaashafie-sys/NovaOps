import { useState } from 'react';
import { useApp } from '@/providers/index.js';
import { usePOs, useOrderItems } from '@/hooks/index.js';
import { PageHeader, StatusBadge, DataTable, LoadingState, ErrorState, Modal } from '@/components/index.js';
import { formatNumber, formatDate } from '@/utils/index.js';

/**
 * PO Approval Page
 * Allows CFO to approve or reject purchase orders
 */
export const POApprovalPage = () => {
  const { data } = useApp();
  const { pos, loading, error, refresh, approvePO, rejectPO, confirmPOToUP } = usePOs();
  const { orderItems } = useOrderItems();
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter POs that are pending CFO approval
  const pendingPOs = pos.filter(po => po.status === 'Pending CFO Approval');

  const handleApprove = async (poId) => {
    setProcessing(true);
    try {
      await approvePO(poId, 'CFO User');
      refresh();
      alert('PO approved successfully');
    } catch (err) {
      alert('Error approving PO: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPO) return;
    setProcessing(true);
    try {
      await rejectPO(selectedPO.id, 'CFO User', rejectReason);
      refresh();
      setShowRejectModal(false);
      setSelectedPO(null);
      setRejectReason('');
      alert('PO rejected. Status returned to Draft.');
    } catch (err) {
      alert('Error rejecting PO: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getPOOrderItems = (poId) => {
    return orderItems.filter(oi => oi.poId === poId);
  };

  const calculatePOTotal = (poId) => {
    const items = getPOOrderItems(poId);
    return items.reduce((sum, item) => sum + item.qtyCartons, 0);
  };

  const columns = [
    { label: 'PO Number', className: 'font-mono' },
    { label: 'Status' },
    { label: 'Items' },
    { label: 'Total Quantity' },
    { label: 'Countries' },
    { label: 'Requested On' },
    { label: 'Actions', className: 'text-center' }
  ];

  const renderRow = (po) => {
    const poItems = getPOOrderItems(po.id);
    const totalQty = calculatePOTotal(po.id);
    const countries = [...new Set(poItems.map(item => item.countryName))];

    return (
      <>
        <td className="px-4 py-3 font-mono text-sm font-semibold">{po.id}</td>
        <td className="px-4 py-3">
          <StatusBadge status={po.status} />
        </td>
        <td className="px-4 py-3">{poItems.length} items</td>
        <td className="px-4 py-3 font-semibold text-blue-600">{formatNumber(totalQty)} cartons</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {countries.slice(0, 2).map(country => (
              <span key={country} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {country}
              </span>
            ))}
            {countries.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                +{countries.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600">{formatDate(po.requestedOn)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedPO(po);
                setShowDetailsModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              View
            </button>
            <button
              onClick={() => handleApprove(po.id)}
              disabled={processing}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => {
                setSelectedPO(po);
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
  };

  if (loading) {
    return <LoadingState message="Loading pending approvals..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="PO Approval (CFO)" 
        description="Review and approve/reject purchase orders"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <p className="font-medium text-blue-900 mb-1">CFO Approval Process</p>
            <p className="text-sm text-blue-800">
              Review purchase orders that have been submitted for approval. All order items in the PO must be 
              "Regulatory Approved" before the PO can be approved. Approve to move to "CFO Approved" status, 
              or reject to return the PO to "Draft" status.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Pending CFO Approval ({pendingPOs.length})
          </h3>
        </div>

        {pendingPOs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-medium mb-2">All Clear!</p>
            <p className="text-sm">No purchase orders pending CFO approval</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={pendingPOs}
            renderRow={renderRow}
            emptyMessage="No POs pending approval"
          />
        )}
      </div>

      {/* PO Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPO(null);
        }}
        title={selectedPO ? `PO Details: ${selectedPO.id}` : "PO Details"}
        size="lg"
      >
        {selectedPO && (() => {
          const poItems = getPOOrderItems(selectedPO.id);
          const totalQty = calculatePOTotal(selectedPO.id);
          const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');

          return (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">PO Number:</span>
                    <span className="ml-2 font-mono font-semibold">{selectedPO.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2"><StatusBadge status={selectedPO.status} /></span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Items:</span>
                    <span className="ml-2 font-semibold">{poItems.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Quantity:</span>
                    <span className="ml-2 font-semibold text-blue-600">{formatNumber(totalQty)} cartons</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Requested On:</span>
                    <span className="ml-2">{formatDate(selectedPO.requestedOn)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Requested By:</span>
                    <span className="ml-2">{selectedPO.requestedBy || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {!allRegulatoryApproved && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Cannot Approve</p>
                  <p className="text-xs text-yellow-700">
                    {poItems.filter(item => item.status !== 'Regulatory Approved').length} order item(s) are not Regulatory Approved. 
                    All items must be Regulatory Approved before approving the PO.
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items ({poItems.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {poItems.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-semibold">{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">SKU:</span> {item.skuName}
                        </div>
                        <div>
                          <span className="font-medium">Country:</span> {item.countryName}
                        </div>
                        <div>
                          <span className="font-medium">Qty:</span> {formatNumber(item.qtyCartons)} cartons
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedPO(null);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
                {allRegulatoryApproved && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleApprove(selectedPO.id);
                      }}
                      disabled={processing}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md disabled:opacity-50"
                    >
                      {processing ? 'Approving...' : 'Approve PO'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowRejectModal(true);
                      }}
                      disabled={processing}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md disabled:opacity-50"
                    >
                      Reject PO
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedPO(null);
          setRejectReason('');
        }}
        title={selectedPO ? `Reject PO: ${selectedPO.id}` : "Reject Purchase Order"}
        size="md"
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                Rejecting this PO will return it to "Draft" status. The planner can then make corrections and resubmit.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">PO Number:</span>
                <span className="font-mono font-semibold">{selectedPO.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium">{getPOOrderItems(selectedPO.id).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Quantity:</span>
                <span className="font-medium">{formatNumber(calculatePOTotal(selectedPO.id))} cartons</span>
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
                  setSelectedPO(null);
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
                {processing ? 'Rejecting...' : 'Reject PO'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default POApprovalPage;

