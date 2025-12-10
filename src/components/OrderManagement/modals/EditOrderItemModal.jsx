import { useState, useEffect } from 'react';
import { Modal } from '@/components/index.js';
import { formatNumber } from '@/utils/index.js';
import { useApp } from '@/providers/index.js';

/**
 * Edit Order Item Modal Component
 * Allows editing quantity and delivery month for forecasted/planned order items
 */
export const EditOrderItemModal = ({
  isOpen,
  onClose,
  orderItem,
  onUpdateOrderItem
}) => {
  const { data } = useApp();
  const [formData, setFormData] = useState({
    qtyCartons: '',
    deliveryMonth: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (orderItem && isOpen) {
      setFormData({
        qtyCartons: orderItem.qtyCartons || '',
        deliveryMonth: orderItem.deliveryMonth || ''
      });
    }
  }, [orderItem, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderItem) return;

    setIsSubmitting(true);
    try {
      await onUpdateOrderItem({
        orderItemId: orderItem.id,
        qtyCartons: parseInt(formData.qtyCartons),
        deliveryMonth: formData.deliveryMonth
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update order item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableMonths = data?.months || [];

  if (!orderItem) {
    return (
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Edit Order Item" 
        size="md"
      >
        <div className="text-center py-8 text-gray-500">
          <p>No order item selected</p>
        </div>
      </Modal>
    );
  }

  // Only allow editing for Forecasted and Planned items
  const canEdit = orderItem.status === 'Forecasted' || orderItem.status === 'Planned';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Edit Order Item: ${orderItem.id}`} 
      size="md"
    >
      {!canEdit ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">This order item cannot be edited</p>
          <p className="text-sm text-gray-400">
            Only Forecasted and Planned order items can be edited
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Order Item:</span>
                <span className="font-mono font-semibold text-blue-700">{orderItem.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <span className="font-semibold">{orderItem.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">SKU:</span>
                <span className="font-semibold">{orderItem.skuName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Country:</span>
                <span className="font-semibold">{orderItem.countryName}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (Cartons) *
            </label>
            <input
              type="number"
              value={formData.qtyCartons}
              onChange={(e) => setFormData({ ...formData, qtyCartons: e.target.value })}
              required
              min="1"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {formatNumber(orderItem.qtyCartons)} cartons
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Month *
            </label>
            <select
              value={formData.deliveryMonth}
              onChange={(e) => setFormData({ ...formData, deliveryMonth: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Month</option>
              {availableMonths.map(month => (
                <option key={month.key} value={month.key}>
                  {month.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Current: {data?.months?.find(m => m.key === orderItem.deliveryMonth)?.label || orderItem.deliveryMonth}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Order Item'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditOrderItemModal;

