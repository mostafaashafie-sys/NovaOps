import { Fragment } from 'react';
import { OrderPill } from '@/components/index.js';
import { formatNumber, formatCover, getCoverColor, getCoverTextColor } from '@/utils/index.js';

/**
 * Stock Cover Table Component
 * Displays the stock cover planning table
 */
export const StockCoverTable = ({
  data,
  monthsByYear,
  years,
  countryData,
  measures,
  editingCell,
  editValue,
  inputRef,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onKeyDown,
  onOrderItemClick,
  onAddOrder
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
      <div className="absolute top-2 right-2 z-30 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
        Scroll → to view all months
      </div>
      <div 
        className="overflow-x-auto overflow-y-auto" 
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <div style={{ minWidth: `${(data?.months?.length || 0) * 90 + (years.length * 100) + 260}px` }}>
          <table className="w-full text-sm">
            <thead>
              {/* Year Header Row */}
              <tr className="bg-blue-50 border-b-2 border-blue-200">
                <th className="sticky left-0 z-30 bg-blue-50 px-4 py-2 text-center font-bold text-blue-900 min-w-[120px]" colSpan="2"></th>
                {years.map(year => {
                  const yearMonths = monthsByYear[year];
                  return (
                    <Fragment key={year}>
                      <th 
                        className="px-2 py-2 text-center font-bold text-blue-900 border-l-2 border-blue-300"
                        colSpan={yearMonths.length}
                      >
                        {year}
                      </th>
                      <th 
                        className="px-2 py-2 text-center font-bold text-amber-900 border-l-2 border-amber-400 min-w-[100px] bg-amber-100"
                      >
                        {year} Total
                      </th>
                    </Fragment>
                  );
                })}
              </tr>
              {/* Month Header Row */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[120px]">SKU</th>
                <th className="sticky left-[120px] z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[140px]">Measure</th>
                {years.map(year => {
                  const yearMonths = monthsByYear[year];
                  return (
                    <Fragment key={year}>
                      {yearMonths.map(month => (
                        <th 
                          key={month.key} 
                          className={`px-3 py-3 text-right font-semibold text-gray-600 min-w-[90px] ${
                            month.isCurrentMonth ? 'bg-blue-100 border-l-2 border-blue-400' : ''
                          } ${month.isPast ? 'opacity-60' : ''}`}
                        >
                          <div className="flex flex-col">
                            <span>{month.label}</span>
                            {month.isCurrentMonth && (
                              <span className="text-xs text-blue-600 font-normal">Current</span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th 
                        key={`total-header-${year}`}
                        className="px-3 py-3 text-right font-bold text-amber-900 min-w-[100px] border-l-2 border-amber-300 bg-amber-50"
                      >
                        {year} Total
                      </th>
                    </Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(countryData).map(([skuId, skuData], skuIdx) => (
                <Fragment key={skuId}>
                  {measures.map((measure, mIdx) => (
                    <StockCoverTableRow
                      key={`${skuId}-${measure.key}`}
                      skuId={skuId}
                      skuData={skuData}
                      measure={measure}
                      mIdx={mIdx}
                      years={years}
                      monthsByYear={monthsByYear}
                      editingCell={editingCell}
                      editValue={editValue}
                      inputRef={inputRef}
                      onStartEdit={onStartEdit}
                      onSaveEdit={onSaveEdit}
                      onCancelEdit={onCancelEdit}
                      onKeyDown={onKeyDown}
                      onOrderItemClick={onOrderItemClick}
                      onAddOrder={onAddOrder}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StockCoverTableRow = ({
  skuId,
  skuData,
  measure,
  mIdx,
  years,
  monthsByYear,
  editingCell,
  editValue,
  inputRef,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onKeyDown,
  onOrderItemClick,
  onAddOrder
}) => {
  return (
    <tr className={`${mIdx === 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-50'} hover:bg-gray-50/50`}>
      <td className="sticky left-0 z-10 bg-white px-4 py-2">
        {mIdx === 0 && (
          <div>
            <div className="font-semibold text-gray-900">{skuId}</div>
            <div className="text-xs text-gray-400">{skuData.sku.category}</div>
          </div>
        )}
      </td>
      <td className="sticky left-[120px] z-10 bg-white px-4 py-2">
        <span className={`text-gray-600 ${measure.type === 'edit' ? 'text-blue-600 font-medium' : ''}`}>
          {measure.label}
          {measure.type === 'edit' && <span className="ml-1 text-blue-400">✎</span>}
        </span>
      </td>
      {years.map(year => {
        const yearMonths = monthsByYear[year];
        const yearTotal = calculateYearTotal(skuData, measure, yearMonths);
        return (
          <Fragment key={year}>
            {yearMonths.map(month => (
              <StockCoverTableCell
                key={month.key}
                month={month}
                monthData={skuData.months[month.key]}
                measure={measure}
                skuId={skuId}
                editingCell={editingCell}
                editValue={editValue}
                inputRef={inputRef}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onKeyDown={onKeyDown}
                onOrderItemClick={onOrderItemClick}
                onAddOrder={onAddOrder}
              />
            ))}
            <td 
              key={`total-${year}-${measure.key}`}
              className="px-3 py-2 text-right font-bold text-amber-900 border-l-2 border-amber-300 bg-amber-50"
            >
              {formatYearTotal(yearTotal, measure.type)}
            </td>
          </Fragment>
        );
      })}
    </tr>
  );
};

const StockCoverTableCell = ({
  month,
  monthData,
  measure,
  skuId,
  editingCell,
  editValue,
  inputRef,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onKeyDown,
  onOrderItemClick,
  onAddOrder
}) => {
  if (!monthData) return <td className="px-3 py-2 text-right text-gray-300">—</td>;
  
  const isEditing = editingCell?.skuId === skuId && editingCell?.monthKey === month.key;

  if (measure.type === 'edit') {
    if (!monthData.isEditable) {
      return (
        <td className="px-3 py-2 text-right bg-gray-50 text-gray-400">
          {formatNumber(monthData.plannedQty) || '—'}
        </td>
      );
    }
    if (isEditing) {
      return (
        <td className="px-1 py-1 text-right">
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => onStartEdit(skuId, month.key, e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={onKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded text-right focus:outline-none"
            autoFocus
          />
        </td>
      );
    }
    return (
      <td 
        className="px-3 py-2 text-right cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={() => onStartEdit(skuId, month.key, monthData.plannedQty)}
      >
        {formatNumber(monthData.plannedQty) || '—'}
      </td>
    );
  }

  if (measure.type === 'orderItems') {
    return (
      <td className="px-2 py-2">
        <div className="flex flex-wrap gap-1 min-w-[120px]">
          {monthData.orderItems && monthData.orderItems.length > 0 ? (
            monthData.orderItems.map(orderItem => (
              <OrderPill
                key={orderItem.id}
                orderItem={orderItem}
                onClick={() => onOrderItemClick(orderItem.id)}
              />
            ))
          ) : (
            <button
              onClick={() => onAddOrder(skuId, month.key)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
            >
              + Add Order
            </button>
          )}
        </div>
      </td>
    );
  }

  if (measure.type === 'cover') {
    const showCreateBtn = monthData.isEditable && monthData.monthsCover < 3 && !monthData.pendingOrderId;
    return (
      <td 
        className="px-2 py-1 text-right"
        style={{ 
          backgroundColor: getCoverColor(monthData.monthsCover),
          color: getCoverTextColor(monthData.monthsCover)
        }}
      >
        <div className="font-semibold">{formatCover(monthData.monthsCover)}</div>
        {showCreateBtn && (
          <button
            onClick={() => onAddOrder(skuId, month.key)}
            className="text-xs bg-white/90 text-gray-800 px-2 py-0.5 rounded mt-1 hover:bg-white font-medium"
          >
            + Order
          </button>
        )}
      </td>
    );
  }

  // Default: display calculated value
  const value = monthData[measure.key];
  return (
    <td className="px-3 py-2 text-right text-gray-600">
      {value !== undefined && value !== null ? formatNumber(value) : '—'}
    </td>
  );
};

const calculateYearTotal = (skuData, measure, yearMonths) => {
  if (measure.type === 'cover') {
    // Average for months cover
    const values = yearMonths
      .map(m => skuData.months[m.key]?.[measure.key])
      .filter(v => v !== undefined && v !== null);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
  
  // Sum for other measures
  return yearMonths.reduce((sum, month) => {
    const value = skuData.months[month.key]?.[measure.key];
    return sum + (value || 0);
  }, 0);
};

const formatYearTotal = (total, type) => {
  if (total === null || total === undefined) return '—';
  if (type === 'cover') {
    return total.toFixed(1);
  }
  return formatNumber(total);
};

export default StockCoverTable;

