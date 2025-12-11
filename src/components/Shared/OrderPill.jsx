
import { Logger } from '@/utils/index.js';

const logger = new Logger('OrderPill');

/**
 * Order Pill Component
 * Displays an order item as a clickable pill with amount, PO number, and status
 */
export const OrderPill = ({ orderItem, onClick, showPO = true, onDragStart: onDragStartCallback, onDragEnd: onDragEndCallback }) => {
  const getStatusColor = (status) => {
    const colors = {
      'Forecasted': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
      'Planned': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      'Pending Regulatory': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
      'Regulatory Approved': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      'Order Approved': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
      'Back Order': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
      'Allocated to Market': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
      'Shipped to Market': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      'Arrived to Market': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
      'Deleted': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
      // Legacy statuses for backward compatibility
      'Confirmed to UP': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      'Partially Allocated': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
      'Fully Allocated': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      'Shipped': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
      'Received': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' }
    };
    return colors[status] || colors['Forecasted'];
  };

  const statusColors = getStatusColor(orderItem.status);

  const handleDragStart = (e) => {
    // Prevent dragging if item is in a non-draggable state
    if (!orderItem.deliveryMonth) {
      e.preventDefault();
      return;
    }

    logger.action('Drag started', {
      orderItemId: orderItem.id,
      currentMonth: orderItem.deliveryMonth,
      qtyCartons: orderItem.qtyCartons,
      status: orderItem.status,
      poId: orderItem.poId
    });
    
    // Set drag effect and data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    
    // Set data in multiple formats for better compatibility
    const dragData = {
      orderItemId: orderItem.id,
      currentMonth: orderItem.deliveryMonth,
      qtyCartons: orderItem.qtyCartons,
      status: orderItem.status
    };
    
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.setData('text/plain', orderItem.id); // Fallback for some browsers
    } catch (err) {
      logger.error('Error setting drag data', err);
    }
    
    // Create a custom drag image for better UX
    const dragImage = e.currentTarget.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(2deg)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2);
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
    
    // Visual feedback: reduce opacity of original element
    e.currentTarget.style.opacity = '0.5';
    e.currentTarget.style.cursor = 'grabbing';
    
    // Notify parent component about drag start
    if (onDragStartCallback) {
      onDragStartCallback({
        orderItemId: orderItem.id,
        currentMonth: orderItem.deliveryMonth
      });
    }
  };

  const handleDragEnd = (e) => {
    logger.debug('Drag ended', {
      orderItemId: orderItem.id,
      currentMonth: orderItem.deliveryMonth
    });
    
    // Restore visual state
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.cursor = 'grab';
    
    // Notify parent component about drag end
    if (onDragEndCallback) {
      onDragEndCallback();
    }
  };

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(orderItem);
      }}
      className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${statusColors.border} ${statusColors.bg} ${statusColors.text}`}
    >
      <span className="font-semibold">
        {orderItem.qtyCartons} cartons
      </span>
      <div className="flex items-center gap-2">
        {showPO && (orderItem.poName || orderItem.poId) && (
          <span className="px-2 py-0.5 rounded bg-white/80 text-gray-800 font-semibold border border-gray-300 text-[10px]">
            PO: {orderItem.poName || orderItem.poId}
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
          {orderItem.status}
        </span>
      </div>
    </button>
  );
};

export default OrderPill;

