import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ============================================================================
// MOCK DATA & HELPERS
// ============================================================================

const generateMockData = () => {
  const countries = [
    { id: 'KSA', name: 'Saudi Arabia', region: 'GCC', currency: 'SAR' },
    { id: 'Kuwait', name: 'Kuwait', region: 'GCC', currency: 'KWD' },
    { id: 'UAE', name: 'UAE', region: 'GCC', currency: 'AED' },
    { id: 'Lebanon', name: 'Lebanon', region: 'Levant', currency: 'LBP' }
  ];

  const skus = [
    { id: 'N1-400', name: 'NOVALAC N1 12x400gr', category: 'Infant Formula' },
    { id: 'N1-800', name: 'NOVALAC N1 6x800gr', category: 'Infant Formula' },
    { id: 'N2-400', name: 'NOVALAC N2 12x400gr', category: 'Follow-on Formula' },
    { id: 'N2-800', name: 'NOVALAC N2 6x800gr', category: 'Follow-on Formula' },
    { id: 'AC-400', name: 'NOVALAC AC 12x400gr', category: 'Specialty' },
  ];

  const months = [];
  const startDate = new Date(2025, 0, 1);
  for (let i = 0; i < 12; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    months.push({
      key: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      date
    });
  }

  // Generate orders
  const orders = [];
  const statuses = ['Draft', 'Submitted', 'Approved', 'Confirmed', 'Shipped'];
  for (let i = 0; i < 15; i++) {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const sku = skus[Math.floor(Math.random() * skus.length)];
    orders.push({
      id: `PO-2025-${String(i + 1).padStart(3, '0')}`,
      countryId: country.id, countryName: country.name,
      skuId: sku.id, skuName: sku.name,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      channel: ['Private', 'Government', 'Tender'][Math.floor(Math.random() * 3)],
      qtyCartons: 500 + Math.floor(Math.random() * 2000),
      deliveryMonth: months[Math.floor(Math.random() * 6)].key,
      createdOn: new Date(2025, 0, Math.floor(Math.random() * 15) + 1).toISOString(),
    });
  }

  // Generate stock cover data
  const stockCoverData = {};
  countries.forEach(country => {
    stockCoverData[country.id] = {};
    skus.forEach((sku, skuIndex) => {
      stockCoverData[country.id][sku.id] = { sku, months: {} };
      let runningStock = 3000 + skuIndex * 500 + Math.floor(Math.random() * 2000);
      
      months.forEach((month, idx) => {
        const consumption = 1200 + skuIndex * 100 + Math.floor(Math.random() * 400) - 200;
        const confirmedQty = idx < 2 && Math.random() > 0.5 ? 1500 + Math.floor(Math.random() * 1000) : 0;
        const pendingQty = idx >= 2 && idx < 5 && Math.random() > 0.6 ? 1000 + Math.floor(Math.random() * 1500) : 0;
        const plannedQty = idx >= 4 ? Math.floor(Math.random() * 2000) + 500 : 0;
        
        const openingStock = runningStock;
        const closingStock = openingStock + confirmedQty - consumption;
        runningStock = Math.max(100, closingStock);
        const monthsCover = Math.max(0, closingStock / (consumption || 1));
        
        stockCoverData[country.id][sku.id].months[month.key] = {
          openingStock, consumption, plannedQty,
          confirmedOrderQty: confirmedQty,
          confirmedOrderId: confirmedQty ? `PO-2025-${String(skuIndex * 10 + idx + 1).padStart(3, '0')}` : null,
          pendingOrderQty: pendingQty,
          pendingOrderId: pendingQty ? `PO-2025-${String(skuIndex * 10 + idx + 50).padStart(3, '0')}` : null,
          shipmentQty: confirmedQty, closingStock, monthsCover,
          isEditable: idx >= 2
        };
      });
    });
  });

  return { countries, skus, months, orders, stockCoverData };
};

const formatNumber = (num) => num === null || num === undefined ? '—' : Math.round(num).toLocaleString();
const formatCover = (num) => num === null || num === undefined ? '—' : num.toFixed(1);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getCoverColor = (v) => {
  if (v === null || v === undefined) return '#e5e7eb';
  if (v < 2) return '#ef4444';
  if (v < 3) return '#f59e0b';
  if (v < 4) return '#22c55e';
  return '#3b82f6';
};

const getStatusStyle = (status) => {
  const styles = {
    'Draft': { bg: '#f3f4f6', text: '#374151' },
    'Submitted': { bg: '#dbeafe', text: '#1e40af' },
    'Approved': { bg: '#d1fae5', text: '#065f46' },
    'Confirmed': { bg: '#cffafe', text: '#155e75' },
    'Shipped': { bg: '#e0e7ff', text: '#3730a3' },
  };
  return styles[status] || { bg: '#f3f4f6', text: '#374151' };
};

const AppContext = createContext();
const useApp = () => useContext(AppContext);

// ============================================================================
// COMPONENTS
// ============================================================================

const StatusBadge = ({ status }) => {
  const style = getStatusStyle(status);
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: style.bg, color: style.text }}>
      {status}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Navigation = ({ currentPage, onNavigate }) => {
  const items = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'stockcover', label: 'Stock Cover', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'forecasts', label: 'Forecasts', icon: '📈' },
    { id: 'allocations', label: 'Allocations', icon: '🔄' },
    { id: 'shipments', label: 'Shipments', icon: '🚚' },
  ];

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-56 bg-slate-900 text-white flex flex-col z-40">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">📦</div>
          <div>
            <h1 className="font-bold">Supply Chain</h1>
            <p className="text-xs text-slate-400">Management</p>
          </div>
        </div>
      </div>
      <div className="flex-1 py-2 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
              currentPage === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">AH</div>
          <div className="text-xs">
            <p className="text-white">Ahmed Hassan</p>
            <p className="text-slate-400">Planner</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// PAGES
// ============================================================================

const HomePage = () => {
  const { data } = useApp();
  const pendingOrders = data.orders.filter(o => o.status === 'Submitted').length;
  const confirmedOrders = data.orders.filter(o => o.status === 'Confirmed').length;
  
  let lowStockCount = 0;
  Object.values(data.stockCoverData).forEach(country => {
    Object.values(country).forEach(sku => {
      const m = Object.values(sku.months)[2];
      if (m && m.monthsCover < 2) lowStockCount++;
    });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Supply chain overview</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className="text-3xl font-bold text-red-600">{lowStockCount}</p>
          <p className="text-xs text-gray-400 mt-1">SKUs below 2 months</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Pending Approvals</p>
          <p className="text-3xl font-bold text-amber-600">{pendingOrders}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Confirmed Orders</p>
          <p className="text-3xl font-bold text-emerald-600">{confirmedOrders}</p>
          <p className="text-xs text-gray-400 mt-1">Ready for shipment</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-4">Recent Orders</h2>
        <div className="space-y-2">
          {data.orders.slice(0, 5).map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{order.id}</p>
                <p className="text-sm text-gray-500">{order.skuId} • {order.countryName}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StockCoverPage = ({ onCreateOrder }) => {
  const { data, updatePlannedQty } = useApp();
  const [country, setCountry] = useState(data.countries[0]?.id || '');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const countryData = data.stockCoverData[country] || {};
  const measures = [
    { key: 'openingStock', label: 'Opening Stock', type: 'calc' },
    { key: 'consumption', label: 'Consumption', type: 'calc' },
    { key: 'confirmedOrder', label: 'Confirmed Orders', type: 'order' },
    { key: 'pendingOrder', label: 'Pending Orders', type: 'order' },
    { key: 'plannedQty', label: 'Planned Qty', type: 'edit' },
    { key: 'closingStock', label: 'Closing Stock', type: 'calc' },
    { key: 'monthsCover', label: 'Months Cover', type: 'cover' }
  ];

  const saveEdit = () => {
    if (editingCell) {
      updatePlannedQty(country, editingCell.skuId, editingCell.monthKey, Number(editValue) || 0);
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Cover Planning</h1>
          <p className="text-gray-500">Monitor inventory levels</p>
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          {data.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 min-w-[100px]">SKU</th>
                <th className="sticky left-[100px] z-20 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 min-w-[110px]">Measure</th>
                {data.months.map(m => (
                  <th key={m.key} className="px-2 py-2 text-right font-semibold text-gray-600 min-w-[70px] text-xs">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(countryData).map(([skuId, skuData]) => (
                <React.Fragment key={skuId}>
                  {measures.map((measure, mIdx) => (
                    <tr key={`${skuId}-${measure.key}`} className={`${mIdx === 0 ? 'border-t-2' : 'border-t border-gray-50'} hover:bg-gray-50/50`}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                        {mIdx === 0 && <div className="font-semibold text-gray-900 text-xs">{skuId}</div>}
                      </td>
                      <td className="sticky left-[100px] z-10 bg-white px-3 py-1.5">
                        <span className={`text-xs ${measure.type === 'edit' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                          {measure.label}{measure.type === 'edit' && ' ✎'}
                        </span>
                      </td>
                      {data.months.map(month => {
                        const md = skuData.months[month.key];
                        if (!md) return <td key={month.key} className="px-2 py-1.5 text-right text-gray-300 text-xs">—</td>;
                        
                        const isEditing = editingCell?.skuId === skuId && editingCell?.monthKey === month.key;

                        if (measure.type === 'edit') {
                          if (!md.isEditable) return <td key={month.key} className="px-2 py-1.5 text-right bg-gray-50 text-gray-400 text-xs">{formatNumber(md.plannedQty) || '—'}</td>;
                          if (isEditing) return (
                            <td key={month.key} className="px-1 py-1">
                              <input
                                ref={inputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                className="w-14 px-1 py-0.5 text-right border-2 border-blue-500 rounded text-xs"
                              />
                            </td>
                          );
                          return (
                            <td 
                              key={month.key}
                              onClick={() => { setEditingCell({ skuId, monthKey: month.key }); setEditValue(md.plannedQty || ''); }}
                              className="px-2 py-1.5 text-right bg-blue-50 cursor-pointer hover:bg-blue-100 text-blue-900 text-xs"
                            >
                              {md.plannedQty ? formatNumber(md.plannedQty) : <span className="text-blue-300">—</span>}
                            </td>
                          );
                        }

                        if (measure.key === 'confirmedOrder') return (
                          <td key={month.key} className="px-2 py-1.5 text-right text-xs">
                            {md.confirmedOrderQty ? <div><div>{formatNumber(md.confirmedOrderQty)}</div><div className="text-blue-600 text-[10px]">{md.confirmedOrderId}</div></div> : <span className="text-gray-300">—</span>}
                          </td>
                        );

                        if (measure.key === 'pendingOrder') return (
                          <td key={month.key} className="px-2 py-1.5 text-right text-xs">
                            {md.pendingOrderQty ? <div><div>{formatNumber(md.pendingOrderQty)}</div><div className="text-amber-600 text-[10px]">{md.pendingOrderId}</div></div> : <span className="text-gray-300">—</span>}
                          </td>
                        );

                        if (measure.type === 'cover') {
                          const showBtn = md.isEditable && md.monthsCover < 3 && !md.pendingOrderId;
                          return (
                            <td key={month.key} className="px-1 py-1 text-right" style={{ backgroundColor: getCoverColor(md.monthsCover), color: 'white' }}>
                              <div className="font-semibold text-xs">{formatCover(md.monthsCover)}</div>
                              {showBtn && (
                                <button
                                  onClick={() => onCreateOrder({ countryId: country, skuId, skuName: skuData.sku.name, monthKey: month.key, monthLabel: month.label, monthsCover: md.monthsCover, suggestedQty: Math.max(500, Math.ceil((4 - md.monthsCover) * md.consumption)) })}
                                  className="text-[10px] bg-white/90 text-gray-800 px-1.5 py-0.5 rounded mt-0.5 hover:bg-white font-medium"
                                >
                                  + Order
                                </button>
                              )}
                            </td>
                          );
                        }

                        return <td key={month.key} className="px-2 py-1.5 text-right text-gray-600 bg-gray-50/50 text-xs">{formatNumber(md[measure.key])}</td>;
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-50 border"></div>Editable</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{backgroundColor:'#ef4444'}}></div>&lt;2 months</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{backgroundColor:'#f59e0b'}}></div>2-3 months</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{backgroundColor:'#22c55e'}}></div>3-4 months</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{backgroundColor:'#3b82f6'}}></div>&gt;4 months</div>
      </div>
    </div>
  );
};

const OrdersPage = () => {
  const { data, updateOrderStatus } = useApp();
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = filter === 'All' ? data.orders : data.orders.filter(o => o.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500">Track and manage orders</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ New Order</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['All', 'Draft', 'Submitted', 'Approved', 'Confirmed', 'Shipped'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-sm rounded ${filter === s ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{s}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Order ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Country</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3"><button onClick={() => setSelected(order)} className="font-medium text-blue-600 hover:underline">{order.id}</button></td>
                <td className="px-4 py-3"><div className="font-medium">{order.skuId}</div><div className="text-xs text-gray-400">{order.skuName}</div></td>
                <td className="px-4 py-3 text-gray-600">{order.countryName}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNumber(order.qtyCartons)}</td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    {order.status === 'Draft' && <button onClick={() => updateOrderStatus(order.id, 'Submitted')} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Submit</button>}
                    {order.status === 'Submitted' && (
                      <>
                        <button onClick={() => updateOrderStatus(order.id, 'Approved')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                        <button onClick={() => updateOrderStatus(order.id, 'Draft')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                      </>
                    )}
                    {order.status === 'Approved' && <button onClick={() => updateOrderStatus(order.id, 'Confirmed')} className="px-2 py-1 text-xs bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200">Confirm</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.id}`}>
        {selected && (
          <div className="space-y-4">
            <StatusBadge status={selected.status} />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">SKU</p><p className="font-medium">{selected.skuName}</p></div>
              <div><p className="text-gray-500">Country</p><p className="font-medium">{selected.countryName}</p></div>
              <div><p className="text-gray-500">Quantity</p><p className="font-medium">{formatNumber(selected.qtyCartons)} cartons</p></div>
              <div><p className="text-gray-500">Channel</p><p className="font-medium">{selected.channel}</p></div>
              <div><p className="text-gray-500">Delivery Month</p><p className="font-medium">{selected.deliveryMonth}</p></div>
              <div><p className="text-gray-500">Created</p><p className="font-medium">{formatDate(selected.createdOn)}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const ForecastsPage = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Forecast Management</h1>
      <p className="text-gray-500">Manage sales forecasts and budgets</p>
    </div>
    <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
      <p className="text-lg">Forecast management interface</p>
      <p className="text-sm">View and edit forecasts by SKU and month</p>
    </div>
  </div>
);

const AllocationsPage = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Allocation Management</h1>
      <p className="text-gray-500">Manage inventory allocations</p>
    </div>
    <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
      <p className="text-lg">Allocation management interface</p>
      <p className="text-sm">Move and adjust allocations between countries</p>
    </div>
  </div>
);

const ShipmentsPage = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Shipping Management</h1>
      <p className="text-gray-500">Track shipments and deliveries</p>
    </div>
    <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
      <p className="text-lg">Shipment tracking interface</p>
      <p className="text-sm">Monitor in-transit and delivered shipments</p>
    </div>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================

export default function SupplyChainApp() {
  const [page, setPage] = useState('home');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(generateMockData());
  }, []);

  const updatePlannedQty = useCallback((countryId, skuId, monthKey, newValue) => {
    setData(prev => {
      const newData = { ...prev, stockCoverData: { ...prev.stockCoverData } };
      if (newData.stockCoverData[countryId]?.[skuId]?.months[monthKey]) {
        newData.stockCoverData[countryId] = { ...newData.stockCoverData[countryId] };
        newData.stockCoverData[countryId][skuId] = { ...newData.stockCoverData[countryId][skuId], months: { ...newData.stockCoverData[countryId][skuId].months } };
        newData.stockCoverData[countryId][skuId].months[monthKey] = { ...newData.stockCoverData[countryId][skuId].months[monthKey], plannedQty: newValue };
      }
      return newData;
    });
  }, []);

  const updateOrderStatus = useCallback((orderId, newStatus) => {
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    }));
  }, []);

  if (!data) return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  const handleCreateOrder = (orderData) => {
    console.log('Create order:', orderData);
    setPage('orders');
  };

  return (
    <AppContext.Provider value={{ data, updatePlannedQty, updateOrderStatus }}>
      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage={page} onNavigate={setPage} />
        <main className="ml-56 p-6">
          {page === 'home' && <HomePage />}
          {page === 'stockcover' && <StockCoverPage onCreateOrder={handleCreateOrder} />}
          {page === 'orders' && <OrdersPage />}
          {page === 'forecasts' && <ForecastsPage />}
          {page === 'allocations' && <AllocationsPage />}
          {page === 'shipments' && <ShipmentsPage />}
        </main>
      </div>
    </AppContext.Provider>
  );
}
