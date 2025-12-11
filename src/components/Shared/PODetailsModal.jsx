import React from 'react';
import { Modal, StatusBadge } from '@/components/index.js';
import { formatNumber, formatDate } from '@/utils/index.js';

/**
 * Reusable PO Details Modal Component
 * Displays PO information and order items
 * Can be used across different pages (PO Management, PO Approval, etc.)
 */
export const PODetailsModal = ({
  isOpen,
  onClose,
  po,
  orderItems = [],
  actions = [],
  showWarnings = true
}) => {
  // Get order items for this PO
  const getPOOrderItems = React.useMemo(() => {
    if (!po) return [];
    // Use PO's orderItemIds as source of truth, fallback to filtering by poId
    if (po.orderItemIds && po.orderItemIds.length > 0) {
      return orderItems.filter(oi => po.orderItemIds.includes(oi.id));
    }
    // Fallback: filter by poId (for backward compatibility)
    return orderItems.filter(oi => oi.poId === po.id);
  }, [po, orderItems]);

  const poItems = getPOOrderItems;
  const totalQty = poItems.reduce((sum, item) => sum + (item.qtyCartons || 0), 0);
  const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');

  if (!po) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="PO Details" size="lg">
        <div className="text-center py-8 text-gray-500">
          <p>No PO selected</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`PO Details: ${po.id}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* PO Information */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">PO Number:</span>
              <span className="ml-2 font-mono font-semibold">{po.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2"><StatusBadge status={po.status} /></span>
            </div>
            <div>
              <span className="text-gray-600">Total Items:</span>
              <span className="ml-2 font-semibold">{poItems.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Quantity:</span>
              <span className="ml-2 font-semibold text-blue-600">{formatNumber(totalQty)} cartons</span>
            </div>
            {po.poDate && (
              <div>
                <span className="text-gray-600">PO Date:</span>
                <span className="ml-2">{formatDate(po.poDate)}</span>
              </div>
            )}
            {po.deliveryDate && (
              <div>
                <span className="text-gray-600">Delivery Date:</span>
                <span className="ml-2">{formatDate(po.deliveryDate)}</span>
              </div>
            )}
            {po.requestedOn && (
              <div>
                <span className="text-gray-600">Requested On:</span>
                <span className="ml-2">{formatDate(po.requestedOn)}</span>
              </div>
            )}
            {po.requestedBy && (
              <div>
                <span className="text-gray-600">Requested By:</span>
                <span className="ml-2">{po.requestedBy}</span>
              </div>
            )}
            {po.approvedOn && (
              <div>
                <span className="text-gray-600">Approved On:</span>
                <span className="ml-2">{formatDate(po.approvedOn)}</span>
              </div>
            )}
            {po.approvedBy && (
              <div>
                <span className="text-gray-600">Approved By:</span>
                <span className="ml-2">{po.approvedBy}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warnings */}
        {showWarnings && po.status === 'Draft' && !allRegulatoryApproved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Cannot Request Approval</p>
            <p className="text-xs text-yellow-700">
              {poItems.filter(item => item.status !== 'Regulatory Approved').length} order item(s) are not Regulatory Approved. 
              All items must be Regulatory Approved before requesting CFO approval.
            </p>
          </div>
        )}

        {showWarnings && po.status === 'Pending CFO Approval' && !allRegulatoryApproved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Cannot Approve</p>
            <p className="text-xs text-yellow-700">
              {poItems.filter(item => item.status !== 'Regulatory Approved').length} order item(s) are not Regulatory Approved. 
              All items must be Regulatory Approved before approving the PO.
            </p>
          </div>
        )}

        {/* Order Items */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Order Items ({poItems.length})</h4>
          {poItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">📦</div>
              <p className="text-sm">No order items found for this PO</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {poItems.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold">{item.id}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">SKU:</span> {item.skuName || item.skuId}
                    </div>
                    <div>
                      <span className="font-medium">Country:</span> {item.countryName || item.countryId}
                    </div>
                    <div>
                      <span className="font-medium">Qty:</span> {formatNumber(item.qtyCartons)} cartons
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex gap-3 pt-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.variant === 'danger' 
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : action.variant === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : action.variant === 'secondary'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'border-2 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PODetailsModal;

