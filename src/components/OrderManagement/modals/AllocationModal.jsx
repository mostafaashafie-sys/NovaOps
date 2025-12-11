import { Modal } from '@/components/index.js';
import { formatNumber } from '@/utils/index.js';

/**
 * Allocation Modal Component
 * Handles order item allocation with partial allocation support
 */
export const AllocationModal = ({
  isOpen,
  onClose,
  orderItem,
  allocationForm,
  setAllocationForm,
  availableMonths,
  onAllocate,
  onResetForm
}) => {
  const handleClose = () => {
    onResetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate order item status before submission
    if (!orderItem) {
      showMessage.error('Order item not found');
      return;
    }
    
    if (orderItem.status !== 'Back Order') {
      showMessage.warning(`Cannot allocate: Order item status is "${orderItem.status}". Only items with status "Back Order" can be allocated.`);
      return;
    }
    
    try {
      await onAllocate();
      handleClose();
    } catch (err) {
      showMessage.error(err.message);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title={orderItem ? `Allocate Order Item: ${orderItem.id}` : "Allocate Order Item"} 
      size="lg"
    >
      {orderItem ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Status validation warning */}
          {orderItem.status !== 'Back Order' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800">Cannot Allocate</p>
                  <p className="text-sm text-red-700 mt-1">
                    Order item status is <strong>"{orderItem.status}"</strong>. Only items with status <strong>"Back Order"</strong> can be allocated.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Order Item:</span>
                <span className="font-mono font-semibold text-blue-700">{orderItem.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`font-semibold px-2 py-1 rounded text-xs ${
                  orderItem.status === 'Back Order' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {orderItem.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">SKU:</span>
                <span className="font-semibold">{orderItem.skuName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Country:</span>
                <span className="font-semibold">{orderItem.countryName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Available Quantity:</span>
                <span className="text-blue-600 font-semibold text-lg">{formatNumber(orderItem.qtyCartons)} cartons</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Delivery Month:</span>
                <span className="font-semibold">{orderItem.deliveryMonth}</span>
              </div>
              {orderItem.poId && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Purchase Order:</span>
                  <span className="font-mono text-sm font-semibold text-indigo-600">{orderItem.poId}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Allocate *</label>
            <input
              type="number"
              value={allocationForm.allocatedQty}
              onChange={(e) => setAllocationForm({ ...allocationForm, allocatedQty: parseInt(e.target.value) || 0 })}
              max={orderItem.qtyCartons}
              min="1"
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Max: {formatNumber(orderItem.qtyCartons)} cartons</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Month *</label>
            <select
              value={allocationForm.allocationMonth}
              onChange={(e) => setAllocationForm({ ...allocationForm, allocationMonth: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Month</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Type *</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="action"
                  value="Full"
                  checked={allocationForm.action === 'Full'}
                  onChange={(e) => setAllocationForm({ ...allocationForm, action: e.target.value })}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Full Allocation</span>
                  <p className="text-xs text-gray-500">Allocate the entire quantity → Status: Allocated to Market</p>
                </div>
              </label>
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="action"
                  value="Push"
                  checked={allocationForm.action === 'Push'}
                  onChange={(e) => setAllocationForm({ ...allocationForm, action: e.target.value })}
                  className="mr-3"
                />
                <div className="flex-1">
                  <span className="font-medium">Partial + Push Remaining</span>
                  <p className="text-xs text-gray-500">Allocate partial quantity → Allocated to Market. Remaining → Back Order (pushed to new month)</p>
                  {allocationForm.action === 'Push' && (
                    <select
                      value={allocationForm.pushToMonth}
                      onChange={(e) => setAllocationForm({ ...allocationForm, pushToMonth: e.target.value })}
                      required={allocationForm.action === 'Push'}
                      className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select target month</option>
                      {availableMonths.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="action"
                  value="Remove"
                  checked={allocationForm.action === 'Remove'}
                  onChange={(e) => setAllocationForm({ ...allocationForm, action: e.target.value })}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Partial + Remove Remaining</span>
                  <p className="text-xs text-gray-500">Allocate partial quantity → Allocated to Market. Remaining → Deleted</p>
                </div>
              </label>
            </div>
          </div>

          {allocationForm.allocatedQty < orderItem.qtyCartons && allocationForm.action !== 'Full' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Remaining:</span> {formatNumber(orderItem.qtyCartons - allocationForm.allocatedQty)} cartons
                {allocationForm.action === 'Push' && allocationForm.pushToMonth && (
                  <span className="block mt-1">Will be pushed to: {availableMonths.find(m => m.key === allocationForm.pushToMonth)?.label} (Status: Back Order)</span>
                )}
                {allocationForm.action === 'Remove' && (
                  <span className="block mt-1 text-red-600">Will be deleted (Status: Deleted)</span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={orderItem.status !== 'Back Order'}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Allocate
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected for allocation</p>
        </div>
      )}
    </Modal>
  );
};

export default AllocationModal;

