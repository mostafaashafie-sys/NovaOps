import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../providers/index.js';
import { useStockCover } from '../hooks/index.js';
import { OrderManagementPanel, OrderPill } from '../components/index.js';
import { formatNumber, formatCover, getCoverColor, getCoverTextColor } from '../utils/index.js';

/**
 * Stock Cover Planning Page
 * Interactive table for managing stock cover and planning quantities
 */
export const StockCoverPage = ({ onCreateOrder, onViewOrder }) => {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { data } = useApp();
  const [selectedCountry, setSelectedCountry] = useState('');
  const { stockCoverData, updatePlannedQty, loading: stockCoverLoading } = useStockCover(selectedCountry);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
  // Order management panel state
  const [panelState, setPanelState] = useState({
    isOpen: false,
    orderItemId: null,
    countryId: null,
    skuId: null,
    monthKey: null
  });

  // Initialize selectedCountry when data loads
  useEffect(() => {
    if (data?.countries && !selectedCountry) {
      setSelectedCountry(data.countries[0]?.id || '');
    }
  }, [data?.countries, selectedCountry]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Group months by year for totals - must be before early return
  const monthsByYear = useMemo(() => {
    if (!data?.months) return {};
    const grouped = {};
    data.months.forEach(month => {
      if (!grouped[month.year]) {
        grouped[month.year] = [];
      }
      grouped[month.year].push(month);
    });
    return grouped;
  }, [data?.months]);

  // Get unique years in order - must be before early return
  const years = useMemo(() => {
    return Object.keys(monthsByYear).sort((a, b) => parseInt(a) - parseInt(b));
  }, [monthsByYear]);

  if (!data || stockCoverLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock cover data...</p>
        </div>
      </div>
    );
  }

  const startEdit = (skuId, monthKey, currentValue) => {
    setEditingCell({ skuId, monthKey });
    setEditValue(currentValue || '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const newValue = Number(editValue) || 0;
    try {
      await updatePlannedQty(selectedCountry, editingCell.skuId, editingCell.monthKey, newValue);
      setEditingCell(null);
    } catch (err) {
      console.error('Error updating planned quantity:', err);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const countryData = stockCoverData || {};

  const measures = [
    { key: 'openingStock', label: 'Opening Stock', type: 'calc' },
    { key: 'consumption', label: 'Consumption', type: 'calc' },
    { key: 'orderItems', label: 'Orders', type: 'orderItems' },
    { key: 'plannedQty', label: 'Planned Qty', type: 'edit' },
    { key: 'shipmentQty', label: 'Shipments', type: 'calc' },
    { key: 'closingStock', label: 'Closing Stock', type: 'calc' },
    { key: 'monthsCover', label: 'Months Cover', type: 'cover' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Cover Planning</h1>
          <p className="text-gray-500 mt-1">Monitor and plan inventory levels across SKUs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            {data.countries.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
        {/* Scroll Indicator */}
        <div className="absolute top-2 right-2 z-30 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
          Scroll → to view all months
        </div>
        <div 
          ref={scrollContainerRef}
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
                    <React.Fragment key={year}>
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
                    </React.Fragment>
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
                    <React.Fragment key={year}>
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
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(countryData).map(([skuId, skuData], skuIdx) => (
                <React.Fragment key={skuId}>
                  {measures.map((measure, mIdx) => (
                    <tr 
                      key={`${skuId}-${measure.key}`}
                      className={`${mIdx === 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-50'} hover:bg-gray-50/50`}
                    >
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
                        return (
                          <React.Fragment key={year}>
                            {yearMonths.map(month => {
                              const monthData = skuData.months[month.key];
                              if (!monthData) return <td key={month.key} className="px-3 py-2 text-right text-gray-300">—</td>;
                              
                              const isEditing = editingCell?.skuId === skuId && editingCell?.monthKey === month.key;
                        
                        if (measure.type === 'edit') {
                          if (!monthData.isEditable) {
                            return (
                              <td key={month.key} className="px-3 py-2 text-right bg-gray-50 text-gray-400">
                                {formatNumber(monthData.plannedQty) || '—'}
                              </td>
                            );
                          }
                          if (isEditing) {
                            return (
                              <td key={month.key} className="px-1 py-1 text-right">
                                <input
                                  ref={inputRef}
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  className="w-20 px-2 py-1 text-right border-2 border-blue-500 rounded text-sm focus:outline-none"
                                />
                              </td>
                            );
                          }
                          return (
                            <td 
                              key={month.key}
                              onClick={() => startEdit(skuId, month.key, monthData.plannedQty)}
                              className="px-3 py-2 text-right bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors text-blue-900"
                            >
                              {monthData.plannedQty ? formatNumber(monthData.plannedQty) : <span className="text-blue-300">—</span>}
                            </td>
                          );
                        }
                        
                        if (measure.key === 'orderItems') {
                          // Get order items for this month (from monthData.orderItems or generate mock)
                          const orderItems = monthData.orderItems || [];
                          
                          return (
                            <td 
                              key={month.key} 
                              className="px-2 py-2 text-left bg-gray-50/30 min-w-[200px]"
                              onClick={() => {
                                // If no order items, allow creating new one
                                if (orderItems.length === 0) {
                                  setPanelState({
                                    isOpen: true,
                                    orderItemId: null,
                                    countryId: selectedCountry,
                                    skuId,
                                    monthKey: month.key
                                  });
                                }
                              }}
                            >
                              {orderItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {orderItems.map((orderItem) => (
                                    <OrderPill
                                      key={orderItem.id}
                                      orderItem={orderItem}
                                      onClick={(item) => {
                                        setPanelState({
                                          isOpen: true,
                                          orderItemId: item.id,
                                          countryId: selectedCountry,
                                          skuId,
                                          monthKey: month.key
                                        });
                                      }}
                                      showPO={true}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPanelState({
                                      isOpen: true,
                                      orderItemId: null,
                                      countryId: selectedCountry,
                                      skuId,
                                      monthKey: month.key
                                    });
                                  }}
                                  className="text-xs text-gray-400 hover:text-blue-600 cursor-pointer px-2 py-1 border border-dashed border-gray-300 rounded hover:border-blue-400 transition-colors"
                                >
                                  + Add Order
                                </button>
                              )}
                            </td>
                          );
                        }
                        
                        if (measure.type === 'cover') {
                          const showCreateBtn = monthData.isEditable && monthData.monthsCover < 3 && !monthData.pendingOrderId;
                          return (
                            <td 
                              key={month.key}
                              className="px-2 py-1 text-right"
                              style={{ 
                                backgroundColor: getCoverColor(monthData.monthsCover),
                                color: getCoverTextColor(monthData.monthsCover)
                              }}
                            >
                              <div className="font-semibold">{formatCover(monthData.monthsCover)}</div>
                              {showCreateBtn && (
                                <button
                                  onClick={() => setPanelState({
                                    isOpen: true,
                                    orderItemId: null,
                                    countryId: selectedCountry,
                                    skuId,
                                    monthKey: month.key
                                  })}
                                  className="text-xs bg-white/90 text-gray-800 px-2 py-0.5 rounded mt-1 hover:bg-white font-medium"
                                >
                                  + Order
                                </button>
                              )}
                            </td>
                          );
                        }
                        
                        return (
                          <td 
                            key={month.key} 
                            className={`px-3 py-2 text-right text-gray-600 bg-gray-50/50 ${
                              month.isCurrentMonth ? 'bg-blue-50 border-l-2 border-blue-400' : ''
                            }`}
                          >
                            {formatNumber(monthData[measure.key])}
                          </td>
                        );
                      })}
                      {/* Year Total Column - after each year's months */}
                      <td 
                        key={`total-${year}`}
                        className="bg-amber-50 px-3 py-2 text-right font-bold text-amber-900 border-l-2 border-amber-300"
                      >
                        {measure.type === 'orderItems' ? (
                          <div className="text-xs text-amber-700">—</div>
                        ) : measure.type === 'cover' ? (
                          (() => {
                            // Calculate average cover for this year
                            const covers = yearMonths
                              .map(m => skuData.months[m.key]?.monthsCover)
                              .filter(v => typeof v === 'number');
                            const avgCover = covers.length > 0 
                              ? covers.reduce((s, v) => s + v, 0) / covers.length 
                              : 0;
                            return formatCover(avgCover);
                          })()
                        ) : (
                          (() => {
                            // Sum for this year
                            const yearTotal = yearMonths.reduce((sum, month) => {
                              const monthData = skuData.months[month.key];
                              if (!monthData) return sum;
                              const value = monthData[measure.key];
                              return sum + (typeof value === 'number' ? value : 0);
                            }, 0);
                            return formatNumber(yearTotal);
                          })()
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200"></div>
          <span>Editable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{backgroundColor: '#ef4444'}}></div>
          <span>&lt;2 months (Critical)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{backgroundColor: '#f59e0b'}}></div>
          <span>2-3 months (Warning)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{backgroundColor: '#22c55e'}}></div>
          <span>3-4 months (Healthy)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{backgroundColor: '#3b82f6'}}></div>
          <span>&gt;4 months (Excess)</span>
        </div>
      </div>

      {/* Order Management Panel */}
      <OrderManagementPanel
        isOpen={panelState.isOpen}
        onClose={() => setPanelState({ ...panelState, isOpen: false })}
        orderItemId={panelState.orderItemId}
        countryId={panelState.countryId}
        skuId={panelState.skuId}
        monthKey={panelState.monthKey}
        onCreateOrder={() => {
          // Panel will handle refresh internally via hooks
        }}
      />
    </div>
  );
};

export default StockCoverPage;

