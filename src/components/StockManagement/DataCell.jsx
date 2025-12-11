import { formatNumber } from '@/utils/index.js';

/**
 * Data Cell Component
 * Renders calculated values (opening stock, consumption, closing stock)
 * Supports conversion between cartons (default) and tins
 */
export const DataCell = ({ month, monthData, measure, cellBgColor, unitDisplay = 'cartons', tinsPerCarton = 1 }) => {
  if (!monthData) {
    return (
      <td 
        className={`px-3 py-2 text-right text-gray-600 min-w-[90px] ${cellBgColor} ${
          month.isCurrentMonth ? 'border-l-2 border-blue-400' : ''
        }`}
      >
        <div className="text-xs text-amber-700">—</div>
      </td>
    );
  }

  // Get the value in cartons (default unit in data)
  const valueInCartons = monthData[measure.key] || 0;
  
  // Convert to tins if needed
  const displayValue = unitDisplay === 'tins' 
    ? valueInCartons * tinsPerCarton 
    : valueInCartons;

  return (
    <td 
      className={`px-3 py-2 text-right text-gray-600 min-w-[90px] ${cellBgColor} ${
        month.isCurrentMonth ? 'border-l-2 border-blue-400' : ''
      }`}
    >
      {formatNumber(displayValue)}
    </td>
  );
};

