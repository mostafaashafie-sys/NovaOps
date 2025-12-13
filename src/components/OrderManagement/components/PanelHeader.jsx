import { StatusBadge } from '@/components/index.js';

/**
 * Panel Header Component
 * Displays the header with title, close button, and order item info
 */
export const PanelHeader = ({ orderItem, onClose }) => {
  return (
    <div className="p-5 border-b border-gray-200 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Order Management</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {orderItem && (
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={orderItem.status} />
          <span className="text-sm opacity-90 font-semibold">
            {orderItem.skuName || 'Unknown SKU'}
          </span>
          <span className="text-xs opacity-75">•</span>
          <span className="text-xs opacity-90">
            {orderItem.deliveryMonth || 'No month'}
          </span>
          {orderItem.poId || orderItem.poName ? (
            <>
              <span className="text-xs opacity-75">•</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">
                PO: {orderItem.poName || orderItem.poId}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs opacity-75">•</span>
              <span className="text-xs opacity-70 italic">No PO</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PanelHeader;

