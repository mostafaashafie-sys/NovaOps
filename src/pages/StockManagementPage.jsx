import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/providers/index.js';
import { useStockCover, useOrderItems } from '@/hooks/index.js';
import { StockCoverService } from '@/services/index.js';
import { OrderManagementPanel, OrderPill } from '@/components/index.js';
import { formatNumber, formatCover, getCoverColor, getCoverTextColor, Logger } from '@/utils/index.js';

const logger = new Logger('StockManagementPage');

/**
 * Stock Management Page
 * Interactive table for managing stock cover and planning quantities
 */
export const StockManagementPage = ({ onCreateOrder, onViewOrder }) => {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { data } = useApp();
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState('');
  const { stockCoverData, loading: stockCoverLoading, refresh: refreshStockCover } = useStockCover(selectedCountry);
  const { updateDeliveryMonth, refresh: refreshOrderItems } = useOrderItems();
  const scrollContainerRef = useRef(null);
  const [expandedOrderRows, setExpandedOrderRows] = useState(new Set());
  const [draggedOrderItem, setDraggedOrderItem] = useState(null);
  const hasScrolledToCurrentMonth = useRef(false);
  const scrollPositionRef = useRef({ left: 0, top: 0 });
  
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

  // Preserve scroll position when rows expand/collapse
  useEffect(() => {
    if (scrollContainerRef.current && scrollPositionRef.current) {
      // Restore scroll position after any render that might have changed it
      const { left, top } = scrollPositionRef.current;
      if (left > 0 || top > 0) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = left;
            scrollContainerRef.current.scrollTop = top;
          }
        });
      }
    }
  }, [expandedOrderRows]);

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

  // Scroll to current month when data loads - center the current month in view
  // Only run once on initial load, not when expanding rows
  useEffect(() => {
    // Skip if we've already scrolled, or if data isn't ready
    if (hasScrolledToCurrentMonth.current || !data?.months || !scrollContainerRef.current || years.length === 0 || stockCoverLoading) {
      return;
    }

    const currentMonth = data.months.find(m => m.isCurrentMonth);
    if (!currentMonth) return;

    // Wait for table to render, then find the current month column and scroll to it
    const scrollToCurrentMonth = () => {
      if (!scrollContainerRef.current) return false;
      
      // Find the table element
      const table = scrollContainerRef.current.querySelector('table');
      if (!table) return false;
      
      // Find the current month header using data attribute
      const currentMonthHeader = table.querySelector(`th[data-month-key="${currentMonth.key}"]`);
      
      if (!currentMonthHeader) return false;
      
      // Get the position of the current month column relative to the scroll container
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const headerRect = currentMonthHeader.getBoundingClientRect();
      
      // Calculate the absolute position of the current month column
      const currentMonthLeft = headerRect.left - containerRect.left + scrollContainerRef.current.scrollLeft;
      
      // Calculate scroll position to center the current month
      const viewportWidth = scrollContainerRef.current.clientWidth;
      const monthColumnWidth = headerRect.width || 90; // Fallback to 90px if width not available
      const scrollPosition = currentMonthLeft - (viewportWidth / 2) + (monthColumnWidth / 2);
      
      // Scroll to center the current month
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      
      // Mark that we've successfully scrolled
      if (scrollPosition >= 0) {
        hasScrolledToCurrentMonth.current = true;
        logger.success('Scrolled to current month, marking as complete');
      }
      
      return true;
    };
    
    // Try scrolling with increasing delays until successful
    let attempts = 0;
    const maxAttempts = 10;
    const attemptScroll = () => {
      attempts++;
      const success = scrollToCurrentMonth();
      if (!success && attempts < maxAttempts && !hasScrolledToCurrentMonth.current) {
        setTimeout(attemptScroll, 100 * attempts);
      }
    };
    
    // Start attempting to scroll
    setTimeout(attemptScroll, 200);
    setTimeout(attemptScroll, 500);
    setTimeout(attemptScroll, 1000);
  }, [data?.months, monthsByYear, years, stockCoverLoading]);

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


  const countryData = stockCoverData || {};

  const measures = [
    { key: 'openingStock', label: 'Opening Stock', type: 'calc' },
    { key: 'consumption', label: 'Consumption', type: 'calc' },
    { key: 'orderItems', label: 'Orders', type: 'orderItems' },
    { key: 'closingStock', label: 'Closing Stock', type: 'calc' },
    { key: 'monthsCover', label: 'Months Cover', type: 'cover' }
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage stock levels and plan orders</p>
          </div>
          <div className="flex items-center gap-3">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            {data?.countries?.map(c => (
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
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden relative">
        {/* Scroll Indicator */}
        <div className="absolute top-2 right-2 z-30 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
          Scroll → to view all months
        </div>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto" 
        >
          <div style={{ minWidth: `${(data?.months?.length || 0) * 90 + (years.length * 100) + 260}px`, width: 'max-content' }}>
          <table className="w-full text-sm">
            <thead>
              {/* Month Header Row */}
              <tr className="sticky top-0 z-40 bg-blue-50 border-b-2 border-blue-200">
                <th className="sticky left-0 z-50 bg-blue-50 px-4 py-3 text-left font-semibold text-blue-900 min-w-[180px]">
                  SKU / Measure
                </th>
                {(() => {
                  let globalMonthIndex = 0;
                  return years.map(year => {
                    const yearMonths = monthsByYear[year];
                    return (
                      <Fragment key={year}>
                        {yearMonths.map((month) => {
                          const isEven = globalMonthIndex % 2 === 0;
                          const bgColor = month.isCurrentMonth 
                            ? 'bg-blue-100 border-l-2 border-blue-500' 
                            : 'bg-blue-50';
                          globalMonthIndex++;
                          return (
                            <th 
                              key={month.key}
                              data-month-key={month.key}
                              data-is-current={month.isCurrentMonth}
                              className={`px-3 py-3 text-right font-semibold text-blue-900 min-w-[90px] ${bgColor} ${month.isPast ? 'opacity-60' : ''}`}
                            >
                              <div className="flex flex-col">
                                <span>{month.label}</span>
                                {month.isCurrentMonth && (
                                  <span className="text-xs text-blue-700 font-normal">Current</span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th 
                          key={`total-header-${year}`}
                          className="px-3 py-3 text-right font-bold text-amber-900 min-w-[100px] border-l-2 border-amber-300 bg-amber-50"
                        >
                          {year} Total
                        </th>
                      </Fragment>
                    );
                  });
                })()}
              </tr>
            </thead>
            <tbody>
              {Object.entries(countryData).map(([skuId, skuData], skuIdx) => {
                const firstMonthData = skuData.months && Object.values(skuData.months)[0];
                return (
                  <Fragment key={skuId}>
                    {measures.map((measure, mIdx) => (
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
                              {measure.type === 'orderItems' ? (
                                <button
                                  onClick={() => {
                                    // Preserve scroll position when expanding/collapsing
                                    if (scrollContainerRef.current) {
                                      scrollPositionRef.current = {
                                        left: scrollContainerRef.current.scrollLeft,
                                        top: scrollContainerRef.current.scrollTop
                                      };
                                    }
                                    
                                    setExpandedOrderRows(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(skuId)) {
                                        newSet.delete(skuId);
                                      } else {
                                        newSet.add(skuId);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                                >
                                  <svg 
                                    className={`w-4 h-4 transition-transform ${expandedOrderRows.has(skuId) ? 'rotate-90' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span>{measure.label}</span>
                                </button>
                              ) : (
                                <span>{measure.label}</span>
                              )}
                            </div>
                          )}
                        </td>
                      {years.map(year => {
                        const yearMonths = monthsByYear[year];
                        return (
                          <Fragment key={year}>
                            {(() => {
                              let globalMonthIndex = 0;
                              return yearMonths.map((month) => {
                                const monthData = skuData.months?.[month.key];
                                const isEven = globalMonthIndex % 2 === 0;
                                const cellBgColor = month.isCurrentMonth 
                                  ? 'bg-blue-50 border-l-2 border-blue-400' 
                                  : isEven 
                                    ? 'bg-gray-50' 
                                    : 'bg-white';
                                globalMonthIndex++;
                                
                                if (!monthData) {
                                  return (
                                    <td 
                                      key={month.key} 
                                      className={`px-3 py-2 text-right text-gray-300 min-w-[90px] ${cellBgColor}`}
                                    >
                                      —
                                    </td>
                                  );
                                }
                                
                                if (measure.key === 'orderItems') {
                          // Get order items for this month (from monthData.orderItems or generate mock)
                          const orderItems = monthData.orderItems || [];
                          const isRowExpanded = expandedOrderRows.has(skuId);
                          const totalQty = orderItems.reduce((sum, item) => sum + (item.qtyCartons || 0), 0);
                          
                          // If row is collapsed, show summary
                          if (!isRowExpanded) {
                            return (
                              <td 
                                key={month.key} 
                                className={`px-2 py-2 text-center min-w-[90px] ${cellBgColor}`}
                              >
                                {orderItems.length > 0 ? (
                                  <div className="text-xs text-gray-600">
                                    <div className="font-medium">{orderItems.length} {orderItems.length === 1 ? 'order' : 'orders'}</div>
                                    <div className="text-gray-500">{formatNumber(totalQty)} cartons</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            );
                          }
                          
                          // If row is expanded, show full order items
                          const isFutureMonth = !month.isPast;
                          const isDraggedOver = draggedOrderItem && draggedOrderItem.targetMonth === month.key;
                          
                          const handleDragOver = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Only allow drop on future months (non-past months)
                            if (month.isPast) {
                              e.dataTransfer.dropEffect = 'none';
                              return;
                            }
                            
                            e.dataTransfer.dropEffect = 'move';
                            
                            if (draggedOrderItem) {
                              console.log('[StockManagementPage] 🔄 Drag over month', {
                                targetMonth: month.key,
                                draggedOrderItemId: draggedOrderItem.orderItemId,
                                currentMonth: draggedOrderItem.currentMonth
                              });
                            }
                          };

                          const handleDrop = async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            logger.action('Drop event triggered', {
                              targetMonth: month.key,
                              draggedOrderItem,
                              isPast: month.isPast
                            });
                            
                            // Prevent drop on past months
                            if (month.isPast) {
                              logger.warn('Cannot drop on past month');
                              setDraggedOrderItem(null);
                              return;
                            }
                            
                            try {
                              // Try to get data from dataTransfer first, fallback to state
                              let dragData = null;
                              try {
                                const dataTransferData = e.dataTransfer.getData('application/json');
                                if (dataTransferData) {
                                  dragData = JSON.parse(dataTransferData);
                                }
                              } catch (parseErr) {
                                logger.warn('Could not parse dataTransfer data, using state');
                              }
                              
                              // Fallback to state if dataTransfer doesn't have data
                              if (!dragData && draggedOrderItem) {
                                dragData = {
                                  orderItemId: draggedOrderItem.orderItemId,
                                  currentMonth: draggedOrderItem.currentMonth
                                };
                              }
                              
                              logger.data('Drag data', dragData);
                              
                              if (!dragData || !dragData.orderItemId) {
                                logger.warn('Invalid drag data, aborting drop');
                                setDraggedOrderItem(null);
                                return;
                              }

                              const { orderItemId, currentMonth } = dragData;
                              
                              // Validate that we have a valid currentMonth
                              if (!currentMonth) {
                                logger.warn('No current month in drag data');
                                setDraggedOrderItem(null);
                                return;
                              }
                              
                              logger.debug('Checking if month change is needed', {
                                orderItemId,
                                currentMonth,
                                targetMonth: month.key,
                                willUpdate: currentMonth !== month.key
                              });
                              
                              // Only update if dropped on a different month
                              if (currentMonth !== month.key) {
                                logger.action('Updating delivery month', {
                                  orderItemId,
                                  from: currentMonth,
                                  to: month.key
                                });
                                
                                await updateDeliveryMonth(orderItemId, month.key);
                                logger.success('Delivery month updated successfully');
                                
                                // Invalidate and refetch queries - getStockCoverData will automatically
                                // merge updated order items from OrderItemService
                                logger.debug('Refreshing queries');
                                queryClient.invalidateQueries({ queryKey: ['orderItems'] });
                                queryClient.invalidateQueries({ queryKey: ['stockCover'] });
                                
                                // Refetch queries to ensure UI updates
                                await queryClient.refetchQueries({ queryKey: ['orderItems'] });
                                await queryClient.refetchQueries({ queryKey: ['stockCover'] });
                                
                                logger.success('Queries refreshed');
                                
                                logger.success('Drop operation completed successfully');
                              } else {
                                console.log('[StockManagementPage] ℹ️ Same month, no update needed', {
                                  orderItemId,
                                  month: currentMonth
                                });
                              }
                            } catch (err) {
                              console.error('[StockManagementPage] ❌ Error updating delivery month:', err);
                              console.error('[StockManagementPage] Error details:', {
                                message: err.message,
                                stack: err.stack,
                                name: err.name
                              });
                              alert('Failed to update order delivery month: ' + err.message);
                            } finally {
                              // Always clear drag state
                              setDraggedOrderItem(null);
                              console.log('[StockManagementPage] 🧹 Cleared dragged order item state');
                            }
                          };

                          const handleDragEnter = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Only allow drag enter on future months
                            if (month.isPast) {
                              return;
                            }
                            
                            if (draggedOrderItem) {
                              console.log('[StockManagementPage] 🚪 Drag entered month cell', {
                                targetMonth: month.key,
                                draggedOrderItemId: draggedOrderItem.orderItemId,
                                currentMonth: draggedOrderItem.currentMonth
                              });
                              setDraggedOrderItem(prev => prev ? { ...prev, targetMonth: month.key } : null);
                            }
                          };

                          const handleDragLeave = (e) => {
                            e.preventDefault();
                            
                            // Only clear if we're leaving the cell entirely
                            // Check if relatedTarget is null (leaving window) or not a child of currentTarget
                            const relatedTarget = e.relatedTarget;
                            if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                              // Additional check: make sure we're not just moving to a child element
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX;
                              const y = e.clientY;
                              
                              // Only clear if mouse is actually outside the cell bounds
                              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                console.log('[StockManagementPage] 🚪 Drag left month cell', {
                                  targetMonth: month.key
                                });
                                setDraggedOrderItem(prev => {
                                  if (prev && prev.targetMonth === month.key) {
                                    return { ...prev, targetMonth: null };
                                  }
                                  return prev;
                                });
                              }
                            }
                          };

                          return (
                            <td 
                              key={month.key} 
                              className={`px-2 py-2 text-left min-w-[200px] ${cellBgColor} ${isDraggedOver ? 'bg-blue-100 border-2 border-blue-400' : ''}`}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              onDragEnter={handleDragEnter}
                              onDragLeave={handleDragLeave}
                            >
                              <div className="space-y-2">
                                {orderItems.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                    {orderItems.map((orderItem) => (
                                      <OrderPill
                                        key={orderItem.id}
                                        orderItem={orderItem}
                                        onClick={(item) => {
                                          console.log('[StockManagementPage] 🖱️ Order pill clicked', { orderItemId: item.id });
                                          setPanelState({
                                            isOpen: true,
                                            orderItemId: item.id,
                                            countryId: selectedCountry,
                                            skuId,
                                            monthKey: month.key
                                          });
                                        }}
                                        onDragStart={(dragData) => {
                                          console.log('[StockManagementPage] 🎬 Drag start callback received', dragData);
                                          setDraggedOrderItem({
                                            ...dragData,
                                            targetMonth: null
                                          });
                                        }}
                                        onDragEnd={() => {
                                          console.log('[StockManagementPage] 🏁 Drag end callback received');
                                          setDraggedOrderItem(null);
                                        }}
                                        showPO={true}
                                      />
                                    ))}
                                  </div>
                                )}
                                {isFutureMonth && (
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
                              </div>
                            </td>
                          );
                        }
                        
                        if (measure.type === 'cover') {
                          if (!monthData) {
                            return (
                              <td 
                                key={month.key}
                                className={`px-2 py-1 text-right min-w-[90px] ${cellBgColor}`}
                              >
                                <div className="text-xs text-amber-700">—</div>
                              </td>
                            );
                          }
                          return (
                            <td 
                              key={month.key}
                              className={`px-2 py-1 text-right min-w-[90px] ${cellBgColor}`}
                              style={{ 
                                backgroundColor: getCoverColor(monthData.monthsCover),
                                color: getCoverTextColor(monthData.monthsCover)
                              }}
                            >
                              <div className="font-semibold">{formatCover(monthData.monthsCover)}</div>
                            </td>
                          );
                        }
                        
                        if (!monthData) {
                          return (
                            <td 
                              key={month.key} 
                              className={`px-3 py-2 text-right text-gray-600 min-w-[90px] ${cellBgColor} ${
                                month.isCurrentMonth ? 'border-l-2 border-blue-400' : ''
                              }`}
                            >
                              <div className="text-xs text-amber-700">—</div>
                            </td>
                          );
                        }
                        
                        return (
                          <td 
                            key={month.key} 
                            className={`px-3 py-2 text-right text-gray-600 min-w-[90px] ${cellBgColor} ${
                              month.isCurrentMonth ? 'border-l-2 border-blue-400' : ''
                            }`}
                          >
                            {formatNumber(monthData[measure.key])}
                          </td>
                        );
                      });
                    })()}
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
                              ) : (
                                (() => {
                                  // Sum for this year
                                  const yearTotal = yearMonths.reduce((sum, month) => {
                                    if (!skuData || !skuData.months) return sum;
                                    const monthData = skuData.months[month.key];
                                    if (!monthData) return sum;
                                    const value = monthData[measure.key];
                                    return sum + (typeof value === 'number' ? value : 0);
                                  }, 0);
                                  return formatNumber(yearTotal);
                                })()
                              )}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mt-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200"></div>
          <span>Current Month</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-50"></div>
          <span>Even Months</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border border-gray-200"></div>
          <span>Odd Months</span>
        </div>
      </div>

      {/* Order Management Panel */}
      <OrderManagementPanel
        isOpen={panelState.isOpen}
        onClose={async () => {
          // Refresh data when panel closes to ensure table updates
          await refreshOrderItems();
          await refreshStockCover();
          queryClient.invalidateQueries({ queryKey: ['orderItems'] });
          queryClient.invalidateQueries({ queryKey: ['stockCover'] });
          setPanelState({ ...panelState, isOpen: false });
        }}
        orderItemId={panelState.orderItemId}
        countryId={panelState.countryId}
        skuId={panelState.skuId}
        monthKey={panelState.monthKey}
        onOrderCreated={async () => {
          await refreshOrderItems();
          await refreshStockCover();
          queryClient.invalidateQueries({ queryKey: ['orderItems'] });
          queryClient.invalidateQueries({ queryKey: ['stockCover'] });
        }}
      />
    </div>
  );
};

export default StockManagementPage;

