import React from 'react';
import StatusBadge from './StatusBadge.jsx';

/**
 * Order Pill Component
 * Displays an order item as a clickable pill with status and PO info
 */
export const OrderPill = ({ orderItem, onClick, showPO = true }) => {
  const getStatusColor = (status) => {
    const colors = {
      'Forecasted': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
      'Planned': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      'Confirmed to UP': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      'Partially Allocated': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
      'Fully Allocated': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      'Shipped': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
      'Received': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' }
    };
    return colors[status] || colors['Forecasted'];
  };

  const statusColors = getStatusColor(orderItem.status);
  const tooltipText = `${orderItem.id}\nStatus: ${orderItem.status}\nQty: ${orderItem.qtyCartons} cartons${orderItem.poId ? `\nPO: ${orderItem.poId}` : ''}`;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(orderItem);
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 hover:shadow-md ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
      title={tooltipText}
    >
      <span className="font-semibold">{orderItem.id}</span>
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors.bg} ${statusColors.text}`}>
        {orderItem.status}
      </span>
      {showPO && orderItem.poId && (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/50 text-gray-700 font-medium">
          {orderItem.poId}
        </span>
      )}
      <span className="text-[10px] opacity-75">
        {orderItem.qtyCartons}C
      </span>
    </button>
  );
};

export default OrderPill;

