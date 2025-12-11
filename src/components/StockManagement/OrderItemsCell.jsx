import { OrderPill } from '@/components/index.js';
import { formatNumber } from '@/utils/index.js';

/**
 * Order Items Cell Component
 * Handles rendering of order items with drag-and-drop support
 */
export const OrderItemsCell = ({
  month,
  monthData,
  skuId,
  cellBgColor,
  draggedOrderItem,
  dragHandlers,
  onOrderItemClick,
  onAddOrder,
  unitDisplay = 'cartons',
  tinsPerCarton = 1
}) => {
  const orderItems = monthData?.orderItems || [];
  const totalQtyCartons = orderItems.reduce((sum, item) => sum + (item.qtyCartons || 0), 0);
  
  // Convert to display unit
  const totalQty = unitDisplay === 'tins' 
    ? totalQtyCartons * tinsPerCarton 
    : totalQtyCartons;
  
  const unitLabel = unitDisplay === 'tins' ? 'tins' : 'cartons';
  const isFutureMonth = !month.isPast;
  const isDraggedOver = draggedOrderItem && draggedOrderItem.targetMonth === month.key;

  // Always show expanded view with order items and total
  return (
    <td 
      className={`px-2 py-2 text-left min-w-[200px] ${cellBgColor} ${isDraggedOver ? 'bg-blue-100 border-2 border-blue-400' : ''}`}
      onDragOver={(e) => dragHandlers.handleDragOver(e, month)}
      onDrop={(e) => dragHandlers.handleDrop(e, month, draggedOrderItem)}
      onDragEnter={(e) => dragHandlers.handleDragEnter(e, month, draggedOrderItem)}
      onDragLeave={(e) => dragHandlers.handleDragLeave(e, month)}
    >
      <div className="space-y-2">
        {orderItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {orderItems.map((orderItem) => (
              <OrderPill
                key={orderItem.id}
                orderItem={orderItem}
                onClick={(item) => onOrderItemClick(item.id, skuId, month.key)}
                onDragStart={(dragData) => {
                  dragHandlers.setDraggedOrderItem({
                    ...dragData,
                    targetMonth: null
                  });
                }}
                onDragEnd={() => {
                  dragHandlers.setDraggedOrderItem(null);
                }}
                showPO={true}
              />
            ))}
          </div>
        )}
        {orderItems.length > 0 && (
          <div className="pt-1 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-700">
              Total: {formatNumber(totalQty)} {unitLabel}
            </div>
          </div>
        )}
        {isFutureMonth && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddOrder(skuId, month.key);
            }}
            className="text-xs text-gray-400 hover:text-blue-600 cursor-pointer px-2 py-1 border border-dashed border-gray-300 rounded hover:border-blue-400 transition-colors"
          >
            + Add Order
          </button>
        )}
      </div>
    </td>
  );
};

