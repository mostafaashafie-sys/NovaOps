import { useState, useEffect } from 'react';
import { Table } from 'antd';
import { useApp } from '@/providers/index.js';
import { usePOs, useOrderItems } from '@/hooks/index.js';
import { PageHeader, StatusBadge, LoadingState, ErrorState, Modal, PODetailsModal } from '@/components/index.js';
import { formatNumber, formatDate, showMessage } from '@/utils/index.js';

/**
 * PO Approval Page
 * Allows CFO to approve or reject purchase orders
 */
export const POApprovalPage = () => {
  const { data } = useApp();
  const { pos, loading, error, refresh, approvePO, rejectPO, confirmPOToUP, getPOById } = usePOs();
  const { orderItems, refresh: refreshOrderItems } = useOrderItems();
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Refresh data when modal opens to ensure we have latest PO and order items
  useEffect(() => {
    if (showDetailsModal && selectedPO) {
      refresh();
      refreshOrderItems();
    }
  }, [showDetailsModal, selectedPO?.id]);

  // Filter POs that are pending CFO approval
  const pendingPOs = pos.filter(po => po.status === 'Pending CFO Approval');

  const handleApprove = async (poId) => {
    setProcessing(true);
    try {
      await approvePO(poId, 'CFO User');
      refresh();
      showMessage.success('PO approved successfully');
    } catch (err) {
      showMessage.error('Error approving PO: ' + err.message);
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
      showMessage.success('PO rejected. Status returned to Draft.');
    } catch (err) {
      showMessage.error('Error rejecting PO: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getPOOrderItems = (po) => {
    // Use PO's orderItemIds as source of truth, fallback to filtering by poId
    if (po?.orderItemIds && po.orderItemIds.length > 0) {
      return orderItems.filter(oi => po.orderItemIds.includes(oi.id));
    }
    // Fallback: filter by poId (for backward compatibility)
    return orderItems.filter(oi => oi.poId === po?.id || oi.poId === po);
  };

  const calculatePOTotal = (po) => {
    const items = getPOOrderItems(po);
    return items.reduce((sum, item) => sum + (item.qtyCartons || 0), 0);
  };

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'id',
      key: 'id',
      className: 'font-mono',
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, po) => <StatusBadge status={po.status} />,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        return `${poItems.length} items`;
      },
    },
    {
      title: 'Total Quantity',
      key: 'totalQty',
      render: (_, po) => {
        const totalQty = calculatePOTotal(po);
        return <span className="font-semibold text-blue-600">{formatNumber(totalQty)} cartons</span>;
      },
      sorter: (a, b) => calculatePOTotal(a) - calculatePOTotal(b),
    },
    {
      title: 'Countries',
      key: 'countries',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        const countries = [...new Set(poItems.map(item => item.countryName))];
        return (
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
        );
      },
    },
    {
      title: 'Requested On',
      dataIndex: 'requestedOn',
      key: 'requestedOn',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.requestedOn) - new Date(b.requestedOn),
    },
    {
      title: 'Actions',
      key: 'actions',
      className: 'text-center',
      render: (_, po) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={async () => {
              const fullPO = await getPOById(po.id);
              setSelectedPO(fullPO);
              setShowDetailsModal(true);
              refreshOrderItems();
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
      ),
    },
  ];

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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table
              columns={columns}
              dataSource={pendingPOs}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: 'No POs pending approval' }}
            />
          </div>
        )}
      </div>

      {/* PO Details Modal */}
      <PODetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPO(null);
        }}
        po={selectedPO}
        orderItems={orderItems}
        showWarnings={true}
        actions={[
          {
            label: 'Close',
            onClick: () => {
              setShowDetailsModal(false);
              setSelectedPO(null);
            },
            variant: 'default'
          },
          ...(selectedPO ? (() => {
            const poItems = getPOOrderItems(selectedPO);
            const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');
            if (allRegulatoryApproved) {
              return [
                {
                  label: processing ? 'Approving...' : 'Approve PO',
                  onClick: () => {
                    setShowDetailsModal(false);
                    handleApprove(selectedPO.id);
                  },
                  disabled: processing,
                  variant: 'success'
                },
                {
                  label: 'Reject PO',
                  onClick: () => {
                    setShowDetailsModal(false);
                    setShowRejectModal(true);
                  },
                  disabled: processing,
                  variant: 'danger'
                }
              ];
            }
            return [];
          })() : [])
        ]}
      />

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
                <span className="font-medium">{getPOOrderItems(selectedPO).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Quantity:</span>
                <span className="font-medium">{formatNumber(calculatePOTotal(selectedPO))} cartons</span>
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

