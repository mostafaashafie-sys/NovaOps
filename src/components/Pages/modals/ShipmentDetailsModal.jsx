import { Modal, StatusBadge } from '@/components/index.js';
import { formatNumber, formatDate } from '@/utils/index.js';

/**
 * Shipment Details Modal Component
 * Displays detailed information about a shipment
 */
export const ShipmentDetailsModal = ({ isOpen, onClose, shipment }) => {
  if (!shipment) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Shipment ${shipment.shipmentNumber}`} 
      size="lg"
    >
      <div className="space-y-6">
        <StatusBadge status={shipment.status} />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-medium">{shipment.orderId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">SKU</p>
            <p className="font-medium">{shipment.skuName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Destination</p>
            <p className="font-medium">{shipment.countryName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Quantity</p>
            <p className="font-medium">{formatNumber(shipment.qtyCartons)} cartons</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Ship Date</p>
            <p className="font-medium">{formatDate(shipment.shipDate)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Expected Delivery</p>
            <p className="font-medium">{formatDate(shipment.deliveryDate)}</p>
          </div>
          {shipment.carrier && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Carrier</p>
              <p className="font-medium">{shipment.carrier}</p>
            </div>
          )}
          {shipment.trackingNumber && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Tracking Number</p>
              <p className="font-mono text-sm font-medium">{shipment.trackingNumber}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ShipmentDetailsModal;

