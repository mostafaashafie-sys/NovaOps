import { Fragment } from 'react';
import { OrderItemsCell } from './OrderItemsCell.jsx';
import { DataCell } from './DataCell.jsx';
import { CoverCell } from './CoverCell.jsx';
import { formatNumber, formatCover } from '@/utils/index.js';

/**
 * Stock Cover Row Component
 * Renders a single SKU row with all measures (Opening Stock, Consumption, Orders, Closing Stock, Months Cover)
 */
export const StockCoverRow = ({
  skuId,
  skuData,
  measure,
  mIdx,
  years,
  monthsByYear,
  saveScrollPosition,
  draggedOrderItem,
  dragHandlers,
  onOrderItemClick,
  onAddOrder,
  unitDisplay = 'cartons',
  tinsPerCarton = 1
}) => {
  return (
    <tr 
      key={`${skuId}-${measure.key}`}
      className={`${mIdx === 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-50'} hover:bg-gray-50/50`}
    >
      <td className="sticky left-0 z-10 bg-white px-4 py-2">
        {mIdx === 0 ? (
          <div className="space-y-1">
            <div className="font-semibold text-gray-900 mb-2">{skuData.sku?.name || skuId}</div>
            <div className="text-sm text-gray-600 font-medium">{measure.label}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 font-medium pl-0">
            <span>{measure.label}</span>
          </div>
        )}
      </td>
      {(() => {
        // Build all cells as a flat array to avoid Fragment issues in <tr>
        const allCells = [];
        
        years.forEach((year, yearIdx) => {
          const yearMonths = monthsByYear[year];
          // Safety check: skip if yearMonths is undefined or not an array
          if (!yearMonths || !Array.isArray(yearMonths)) {
            return;
          }
          
          let globalMonthIndex = yearIdx * 12; // Approximate starting index for this year
          
          yearMonths.forEach((month, monthIdx) => {
            // Safety check: ensure month has required properties
            if (!month || !month.key) {
              console.warn('Month object missing key property', { month, year, yearIdx, monthIdx });
              return;
            }
            
            const monthData = skuData.months?.[month.key];
            const isEven = globalMonthIndex % 2 === 0;
            const cellBgColor = month.isCurrentMonth 
              ? 'bg-blue-50 border-l-2 border-blue-400' 
              : isEven 
                ? 'bg-gray-50' 
                : 'bg-white';
            globalMonthIndex++;
            
            // Ensure month.key is defined before creating key
            // month.key already contains year-month format (e.g., "2024-01")
            // So we just use it directly with skuId and measure.key for uniqueness
            const safeMonthKey = month.key || `${month.year || year || 'unknown'}-${String(month.month || monthIdx + 1).padStart(2, '0')}`;
            const uniqueKey = `${safeMonthKey}-${skuId}-${measure.key}`;
            
            if (measure.key === 'orderItems') {
              allCells.push(
                <OrderItemsCell
                  key={uniqueKey}
                  month={month}
                  monthData={monthData}
                  skuId={skuId}
                  cellBgColor={cellBgColor}
                  draggedOrderItem={draggedOrderItem}
                  dragHandlers={dragHandlers}
                  onOrderItemClick={onOrderItemClick}
                  onAddOrder={onAddOrder}
                  unitDisplay={unitDisplay}
                  tinsPerCarton={tinsPerCarton}
                />
              );
            } else if (measure.type === 'cover') {
              allCells.push(
                <CoverCell
                  key={uniqueKey}
                  month={month}
                  monthData={monthData}
                  cellBgColor={cellBgColor}
                />
              );
            } else {
              allCells.push(
                <DataCell
                  key={uniqueKey}
                  month={month}
                  monthData={monthData}
                  measure={measure}
                  cellBgColor={cellBgColor}
                  unitDisplay={unitDisplay}
                  tinsPerCarton={tinsPerCarton}
                />
              );
            }
          });
          
          // Add year total after each year's months
          allCells.push(
            <td 
              key={`total-${year}-${skuId}-${measure.key}`}
              className="bg-amber-50 px-3 py-2 text-right font-bold text-amber-900 border-l-2 border-amber-300"
            >
              {measure.type === 'orderItems' ? (
                (() => {
                  // Sum order items for this year (in cartons - default unit in data)
                  const yearTotalCartons = yearMonths.reduce((sum, month) => {
                    if (!skuData || !skuData.months) return sum;
                    const monthData = skuData.months[month.key];
                    if (!monthData || !monthData.orderItems) return sum;
                    const monthTotal = monthData.orderItems.reduce((monthSum, item) => 
                      monthSum + (item.qtyCartons || 0), 0
                    );
                    return sum + monthTotal;
                  }, 0);
                  
                  // Convert to display unit (tins or cartons)
                  const yearTotal = unitDisplay === 'tins' 
                    ? yearTotalCartons * tinsPerCarton 
                    : yearTotalCartons;
                  
                  return formatNumber(yearTotal);
                })()
              ) : measure.type === 'cover' ? (
                (() => {
                  // Calculate average cover for this year
                  if (!skuData || !skuData.months) {
                    return <div className="text-xs text-amber-700">—</div>;
                  }
                  const covers = yearMonths
                    .map(m => skuData.months[m.key]?.monthsCover)
                    .filter(v => typeof v === 'number');
                  const avgCover = covers.length > 0 
                    ? covers.reduce((s, v) => s + v, 0) / covers.length 
                    : 0;
                  return formatCover(avgCover);
                })()
              ) : measure.type === 'percentage' ? (
                (() => {
                  // Calculate average percentage for this year
                  if (!skuData || !skuData.months) {
                    return <div className="text-xs text-amber-700">—</div>;
                  }
                  const percentages = yearMonths
                    .map(m => skuData.months[m.key]?.[measure.key])
                    .filter(v => typeof v === 'number');
                  const avgPercentage = percentages.length > 0 
                    ? percentages.reduce((s, v) => s + v, 0) / percentages.length 
                    : 0;
                  return formatNumber(avgPercentage, 1) + '%';
                })()
              ) : (
                (() => {
                  // Sum for this year (in cartons - default unit in data)
                  const yearTotalCartons = yearMonths.reduce((sum, month) => {
                    if (!skuData || !skuData.months) return sum;
                    const monthData = skuData.months[month.key];
                    if (!monthData) return sum;
                    const value = monthData[measure.key];
                    return sum + (typeof value === 'number' ? value : 0);
                  }, 0);
                  
                  // Convert to display unit (tins or cartons)
                  const yearTotal = unitDisplay === 'tins' 
                    ? yearTotalCartons * tinsPerCarton 
                    : yearTotalCartons;
                  
                  return formatNumber(yearTotal);
                })()
              )}
            </td>
          );
        });
        
        return allCells;
      })()}
    </tr>
  );
};

