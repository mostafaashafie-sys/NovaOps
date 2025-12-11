import { useState, useEffect } from 'react';
import { Modal, StatusBadge, DatePicker } from '@/components/index.js';
import { formatNumber, showMessage } from '@/utils/index.js';
import { useOrderItems, useShipments } from '@/hooks/index.js';

/**
 * Multi-Shipment Modal Component
 * Allows selecting multiple order items and creating new shipment or adding to existing
 */
export const MultiShipmentModal = ({
  isOpen,
  onClose,
  onCreateShipment,
  onAddToShipment
}) => {
  const { orderItems } = useOrderItems();
  const { shipments } = useShipments();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [shipmentType, setShipmentType] = useState('new'); // 'new' or 'existing'
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [destination, setDestination] = useState('');

  // Get order items that are "Allocated to Market"
  const availableItems = orderItems.filter(oi => oi.status === 'Allocated to Market');

  // Get shipments that are "Shipped to Market" (can add items to these)
  const existingShipments = shipments.filter(s => s.status === 'Shipped to Market');

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSelectedItems(new Set());
      setShipmentType('new');
      setSelectedShipmentId('');
      setShipDate('');
      setDeliveryDate('');
      setCarrier('');
      setDestination('');
    }
  }, [isOpen]);

  const toggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.size === 0) {
      showMessage.warning('Please select at least one order item');
      return;
    }
    
    try {
      if (shipmentType === 'new') {
        if (!shipDate || !deliveryDate || !carrier || !destination) {
          showMessage.warning('Please fill in all required fields for new shipment');
          return;
        }
        await onCreateShipment({
          orderItemIds: Array.from(selectedItems),
          shipDate,
          deliveryDate,
          carrier,
          destination,
          countryId: destination
        });
      } else {
        if (!selectedShipmentId) {
          showMessage.warning('Please select an existing shipment');
          return;
        }
        await onAddToShipment(selectedShipmentId, Array.from(selectedItems));
      }
      onClose();
    } catch (err) {
      showMessage.error(err.message);
    }
  };

  const selectedItemsArray = Array.from(selectedItems).map(id => 
    availableItems.find(item => item.id === id)
  ).filter(Boolean);

  const totalQty = selectedItemsArray.reduce((sum, item) => sum + (item.qtyCartons || 0), 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create Shipment" 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Available Items Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Order Items to Ship ({selectedItems.size} selected)
          </label>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {availableItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No items available for shipping</p>
                <p className="text-sm mt-2">Items must have status "Allocated to Market"</p>
              </div>
            ) : (
              <div className="divide-y">
                {availableItems.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedItems.has(item.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="mr-3 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {item.skuName} • {item.countryName} • {formatNumber(item.qtyCartons)} cartons
                      </div>
                      {(item.poName || item.poId) && (
                        <div className="text-xs text-indigo-600 mt-1">PO: {item.poName || item.poId}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Items Summary */}
        {selectedItems.size > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">Selected Items:</span>
                <span className="font-semibold text-blue-700">{selectedItems.size} items</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Total Quantity:</span>
                <span className="font-semibold text-blue-700">{formatNumber(totalQty)} cartons</span>
              </div>
            </div>
          </div>
        )}

        {/* Shipment Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shipment Type</label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="shipmentType"
                value="new"
                checked={shipmentType === 'new'}
                onChange={(e) => setShipmentType(e.target.value)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Create New Shipment</span>
                <p className="text-xs text-gray-500">Create a new shipment with selected items</p>
              </div>
            </label>
            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="shipmentType"
                value="existing"
                checked={shipmentType === 'existing'}
                onChange={(e) => setShipmentType(e.target.value)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Add to Existing Shipment</span>
                <p className="text-xs text-gray-500">Add selected items to an existing shipment</p>
              </div>
            </label>
          </div>
        </div>

        {/* New Shipment Form */}
        {shipmentType === 'new' && (
          <div className="space-y-4 border-t pt-4">
            <DatePicker
              label="Ship Date"
              value={shipDate}
              onChange={setShipDate}
              required
            />
            <DatePicker
              label="Expected Delivery Date"
              value={deliveryDate}
              onChange={setDeliveryDate}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country *</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Country</option>
                {Array.from(new Set(selectedItemsArray.map(item => item.countryId))).map(countryId => {
                  const item = selectedItemsArray.find(i => i.countryId === countryId);
                  return (
                    <option key={countryId} value={countryId}>
                      {item?.countryName || countryId}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrier *</label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Carrier</option>
                <option value="DHL">DHL</option>
                <option value="Maersk">Maersk</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}

        {/* Existing Shipment Selection */}
        {shipmentType === 'existing' && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Existing Shipment *</label>
            {existingShipments.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">No existing shipments available. Please create a new shipment.</p>
              </div>
            ) : (
              <select
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Shipment</option>
                {existingShipments.map(shipment => (
                  <option key={shipment.id} value={shipment.id}>
                    {shipment.shipmentNumber} - {shipment.countryName} ({formatNumber(shipment.qtyCartons || 0)} cartons)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={selectedItems.size === 0 || (shipmentType === 'existing' && !selectedShipmentId && existingShipments.length > 0)}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shipmentType === 'new' ? 'Create Shipment' : 'Add to Shipment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MultiShipmentModal;

