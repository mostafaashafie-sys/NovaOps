import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ============================================================================
// DATAVERSE CONFIGURATION & API SERVICE
// ============================================================================

const DataverseConfig = {
  baseUrl: 'https://YOUR_ORG.crm.dynamics.com/api/data/v9.2',
  tables: {
    countries: 'new_countries',
    skus: 'new_skus',
    orders: 'new_orders',
    orderItems: 'new_orderitems',
    forecasts: 'new_forecasts',
    allocations: 'new_allocations',
    shipments: 'new_shipments',
    inventory: 'new_inventory',
    settings: 'new_settings'
  },
  statusCodes: {
    draft: 100000000,
    submitted: 100000001,
    approved: 100000002,
    rejected: 100000003,
    confirmed: 100000004,
    shipped: 100000005,
    received: 100000006
  }
};

// Dataverse API Service (mock implementation - replace with actual API calls)
const DataverseService = {
  async getAccessToken() {
    // In production: Use MSAL to get token from Azure AD
    return 'mock-token';
  },

  async fetch(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const response = await fetch(`${DataverseConfig.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'return=representation',
        ...options.headers
      }
    });
    if (!response.ok) throw new Error(`Dataverse API error: ${response.status}`);
    return response.json();
  },

  async getCountries() {
    return this.fetch(`/${DataverseConfig.tables.countries}?$select=new_countryid,new_name,new_region,new_currency`);
  },

  async getSKUs(countryId = null) {
    let filter = countryId ? `&$filter=_new_countryid_value eq ${countryId}` : '';
    return this.fetch(`/${DataverseConfig.tables.skus}?$select=new_skuid,new_name,new_category,new_tinsize,new_tinspercarton,new_status${filter}`);
  },

  async getOrders(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_countryid_value eq ${filters.countryId}`);
    if (filters.skuId) filterStr.push(`_new_skuid_value eq ${filters.skuId}`);
    if (filters.status) filterStr.push(`new_status eq ${filters.status}`);
    if (filters.fromDate) filterStr.push(`new_orderdate ge ${filters.fromDate}`);
    if (filters.toDate) filterStr.push(`new_orderdate le ${filters.toDate}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(`/${DataverseConfig.tables.orders}?$expand=new_CountryId,new_SKUId${filter}&$orderby=new_orderdate desc`);
  },

  async createOrder(orderData) {
    return this.fetch(`/${DataverseConfig.tables.orders}`, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async updateOrder(orderId, orderData) {
    return this.fetch(`/${DataverseConfig.tables.orders}(${orderId})`, {
      method: 'PATCH',
      body: JSON.stringify(orderData)
    });
  },

  async getForecasts(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_countryid_value eq ${filters.countryId}`);
    if (filters.skuId) filterStr.push(`_new_skuid_value eq ${filters.skuId}`);
    if (filters.year) filterStr.push(`new_year eq ${filters.year}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(`/${DataverseConfig.tables.forecasts}?$expand=new_CountryId,new_SKUId${filter}`);
  },

  async updateForecast(forecastId, data) {
    return this.fetch(`/${DataverseConfig.tables.forecasts}(${forecastId})`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async getAllocations(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_countryid_value eq ${filters.countryId}`);
    if (filters.skuId) filterStr.push(`_new_skuid_value eq ${filters.skuId}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(`/${DataverseConfig.tables.allocations}?$expand=new_CountryId,new_SKUId,new_OrderId${filter}`);
  },

  async createAllocation(data) {
    return this.fetch(`/${DataverseConfig.tables.allocations}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getShipments(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_destinationcountryid_value eq ${filters.countryId}`);
    if (filters.status) filterStr.push(`new_status eq ${filters.status}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(`/${DataverseConfig.tables.shipments}?$expand=new_DestinationCountryId${filter}&$orderby=new_deliverydate desc`);
  },

  async getInventory(countryId, skuId) {
    return this.fetch(`/${DataverseConfig.tables.inventory}?$filter=_new_countryid_value eq ${countryId} and _new_skuid_value eq ${skuId}&$orderby=new_date desc&$top=1`);
  },

  async calculateMonthsCover(countryId, skuId) {
    // This would typically call an Azure Function
    // For now, return mock calculation
    return { monthsCover: 3.5, closingStock: 4500, avgConsumption: 1285 };
  }
};

// ============================================================================
// MOCK DATA GENERATOR (for development without Dataverse connection)
// ============================================================================

const generateMockData = () => {
  const countries = [
    { id: 'KSA', name: 'Saudi Arabia', region: 'GCC', currency: 'SAR' },
    { id: 'Kuwait', name: 'Kuwait', region: 'GCC', currency: 'KWD' },
    { id: 'UAE', name: 'UAE', region: 'GCC', currency: 'AED' },
    { id: 'Lebanon', name: 'Lebanon', region: 'Levant', currency: 'LBP' }
  ];

  const skus = [
    { id: 'N1-400', name: 'NOVALAC N1 12x400gr', category: 'Infant Formula', tinSize: '400g', tinsPerCarton: 12 },
    { id: 'N1-800', name: 'NOVALAC N1 6x800gr', category: 'Infant Formula', tinSize: '800g', tinsPerCarton: 6 },
    { id: 'N2-400', name: 'NOVALAC N2 12x400gr', category: 'Follow-on Formula', tinSize: '400g', tinsPerCarton: 12 },
    { id: 'N2-800', name: 'NOVALAC N2 6x800gr', category: 'Follow-on Formula', tinSize: '800g', tinsPerCarton: 6 },
    { id: 'AC-400', name: 'NOVALAC AC 12x400gr', category: 'Specialty', tinSize: '400g', tinsPerCarton: 12 },
    { id: 'AR-400', name: 'NOVALAC AR 12x400gr', category: 'Specialty', tinSize: '400g', tinsPerCarton: 12 },
    { id: 'AD-400', name: 'NOVALAC AD 12x400gr', category: 'Specialty', tinSize: '400g', tinsPerCarton: 12 },
  ];

  const months = [];
  const startDate = new Date(2025, 0, 1);
  for (let i = 0; i < 12; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    months.push({
      key: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      date
    });
  }

  // Generate orders
  const orders = [];
  const statuses = ['Draft', 'Submitted', 'Approved', 'Confirmed', 'Shipped', 'Received', 'Rejected'];
  const channels = ['Private', 'Government', 'Tender'];
  
  for (let i = 0; i < 25; i++) {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const sku = skus[Math.floor(Math.random() * skus.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const month = months[Math.floor(Math.random() * 6)];
    
    orders.push({
      id: `PO-2025-${String(i + 1).padStart(3, '0')}`,
      countryId: country.id,
      countryName: country.name,
      skuId: sku.id,
      skuName: sku.name,
      status,
      channel: channels[Math.floor(Math.random() * channels.length)],
      qtyCartons: 500 + Math.floor(Math.random() * 2000),
      qtyUnits: 0,
      orderDate: new Date(2025, month.month - 1, Math.floor(Math.random() * 28) + 1).toISOString(),
      deliveryMonth: month.key,
      tender: Math.random() > 0.7,
      comments: '',
      createdBy: 'Ahmed Hassan',
      createdOn: new Date(2025, 0, Math.floor(Math.random() * 15) + 1).toISOString(),
      modifiedBy: 'Ahmed Hassan',
      modifiedOn: new Date().toISOString(),
      history: [
        { action: 'Created', by: 'Ahmed Hassan', date: new Date(2025, 0, 10).toISOString() },
        { action: 'Submitted', by: 'Ahmed Hassan', date: new Date(2025, 0, 11).toISOString() },
      ]
    });
  }

  // Generate forecasts
  const forecasts = [];
  countries.forEach(country => {
    skus.forEach(sku => {
      months.forEach(month => {
        forecasts.push({
          id: `FC-${country.id}-${sku.id}-${month.key}`,
          countryId: country.id,
          countryName: country.name,
          skuId: sku.id,
          skuName: sku.name,
          month: month.month,
          year: month.year,
          monthKey: month.key,
          forecastQty: 800 + Math.floor(Math.random() * 600),
          budgetQty: 900 + Math.floor(Math.random() * 500),
          actualQty: month.month <= 2 ? 850 + Math.floor(Math.random() * 300) : null,
        });
      });
    });
  });

  // Generate allocations
  const allocations = [];
  orders.filter(o => ['Confirmed', 'Shipped', 'Received'].includes(o.status)).forEach((order, idx) => {
    allocations.push({
      id: `AL-2025-${String(idx + 1).padStart(3, '0')}`,
      orderId: order.id,
      countryId: order.countryId,
      countryName: order.countryName,
      skuId: order.skuId,
      skuName: order.skuName,
      allocatedQty: order.qtyCartons,
      allocatedDate: order.orderDate,
      deliveryMonth: order.deliveryMonth,
      status: order.status === 'Received' ? 'Received' : 'Allocated'
    });
  });

  // Generate shipments
  const shipments = [];
  orders.filter(o => ['Shipped', 'Received'].includes(o.status)).forEach((order, idx) => {
    shipments.push({
      id: `SH-2025-${String(idx + 1).padStart(3, '0')}`,
      orderId: order.id,
      countryId: order.countryId,
      countryName: order.countryName,
      skuId: order.skuId,
      skuName: order.skuName,
      shipmentNumber: `SHIP-${String(idx + 1).padStart(4, '0')}`,
      qtyCartons: order.qtyCartons,
      shipDate: new Date(2025, 0, 15 + idx).toISOString(),
      deliveryDate: new Date(2025, 1, 1 + idx).toISOString(),
      status: order.status === 'Received' ? 'Delivered' : 'In Transit',
      carrier: ['DHL', 'Maersk', 'FedEx'][Math.floor(Math.random() * 3)],
      trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    });
  });

  // Generate stock cover data
  const stockCoverData = {};
  countries.forEach(country => {
    stockCoverData[country.id] = {};
    skus.forEach((sku, skuIndex) => {
      stockCoverData[country.id][sku.id] = { sku, months: {} };
      let runningStock = 3000 + skuIndex * 500 + Math.floor(Math.random() * 2000);
      
      months.forEach((month, idx) => {
        const baseConsumption = 1200 + skuIndex * 100;
        const consumption = baseConsumption + Math.floor(Math.random() * 400) - 200;
        
        const relevantOrders = orders.filter(o => 
          o.countryId === country.id && 
          o.skuId === sku.id && 
          o.deliveryMonth === month.key
        );
        
        const confirmedOrderQty = relevantOrders
          .filter(o => ['Confirmed', 'Shipped', 'Received'].includes(o.status))
          .reduce((sum, o) => sum + o.qtyCartons, 0);
        
        const pendingOrderQty = relevantOrders
          .filter(o => ['Draft', 'Submitted', 'Approved'].includes(o.status))
          .reduce((sum, o) => sum + o.qtyCartons, 0);
        
        const confirmedOrder = relevantOrders.find(o => ['Confirmed', 'Shipped', 'Received'].includes(o.status));
        const pendingOrder = relevantOrders.find(o => ['Draft', 'Submitted', 'Approved'].includes(o.status));
        
        const plannedQty = idx >= 4 ? Math.floor(Math.random() * 2000) + 500 : 0;
        const shipmentQty = confirmedOrderQty;
        
        const openingStock = runningStock;
        const totalIn = shipmentQty;
        const closingStock = openingStock + totalIn - consumption;
        runningStock = Math.max(100, closingStock);
        
        const avgConsumption = consumption || 1;
        const monthsCover = Math.max(0, closingStock / avgConsumption);
        
        stockCoverData[country.id][sku.id].months[month.key] = {
          openingStock,
          consumption,
          plannedQty,
          confirmedOrderQty,
          confirmedOrderId: confirmedOrder?.id || null,
          confirmedOrderStatus: confirmedOrder?.status || null,
          pendingOrderQty,
          pendingOrderId: pendingOrder?.id || null,
          pendingOrderStatus: pendingOrder?.status || null,
          shipmentQty,
          closingStock,
          monthsCover,
          isEditable: idx >= 2
        };
      });
    });
  });

  return { countries, skus, months, orders, forecasts, allocations, shipments, stockCoverData };
};

// ============================================================================
// CONTEXT & STATE MANAGEMENT
// ============================================================================

const AppContext = createContext();

const useApp = () => useContext(AppContext);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatNumber = (num) => {
  if (num === null || num === undefined) return '—';
  return Math.round(num).toLocaleString();
};

const formatCover = (num) => {
  if (num === null || num === undefined) return '—';
  return num.toFixed(1);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', { 
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const getCoverColor = (value) => {
  if (value === null || value === undefined) return '#e5e7eb';
  if (value < 2) return '#ef4444';
  if (value < 3) return '#f59e0b';
  if (value < 4) return '#22c55e';
  return '#3b82f6';
};

const getCoverTextColor = (value) => {
  return 'white';
};

const getStatusColor = (status) => {
  const colors = {
    'Draft': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    'Submitted': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'Approved': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'Rejected': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    'Confirmed': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    'Shipped': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Received': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'In Transit': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'Delivered': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'Allocated': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  };
  return colors[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const StatusBadge = ({ status }) => {
  const colors = getStatusColor(status);
  return (
    <span 
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {status}
    </span>
  );
};

const FilterBar = ({ filters, onFilterChange, showSKU = true, showDateRange = true }) => {
  const { data } = useApp();
  
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">Country</label>
        <select
          value={filters.countryId || ''}
          onChange={(e) => onFilterChange({ ...filters, countryId: e.target.value || null })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Countries</option>
          {data.countries.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      
      {showSKU && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">SKU</label>
          <select
            value={filters.skuId || ''}
            onChange={(e) => onFilterChange({ ...filters, skuId: e.target.value || null })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All SKUs</option>
            {data.skus.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {showDateRange && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">From</label>
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => onFilterChange({ ...filters, fromDate: e.target.value || null })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">To</label>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => onFilterChange({ ...filters, toDate: e.target.value || null })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      )}
      
      <button
        onClick={() => onFilterChange({ countryId: null, skuId: null, fromDate: null, toDate: null })}
        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, value, subtitle, icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d={trend > 0 ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} 
            />
          </svg>
          <span>{Math.abs(trend)}% vs last month</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// NAVIGATION
// ============================================================================

const Navigation = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'stockcover', label: 'Stock Cover Planning', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    )},
    { id: 'orders', label: 'Order Management', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
    { id: 'forecasts', label: 'Forecast Management', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    )},
    { id: 'allocations', label: 'Allocation Management', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )},
    { id: 'shipments', label: 'Shipping Management', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    )},
    { id: 'reports', label: 'Reports', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { id: 'settings', label: 'Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ];

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white flex flex-col z-40">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg">Supply Chain</h1>
            <p className="text-xs text-gray-400">Management System</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
              currentPage === item.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
            AH
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Ahmed Hassan</p>
            <p className="text-xs text-gray-400">Supply Planner</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// PAGE: HOME DASHBOARD
// ============================================================================

const HomePage = () => {
  const { data } = useApp();
  
  const pendingOrders = data.orders.filter(o => o.status === 'Submitted').length;
  const confirmedOrders = data.orders.filter(o => o.status === 'Confirmed').length;
  const lowStockAlerts = Object.values(data.stockCoverData).reduce((count, country) => {
    return count + Object.values(country).filter(sku => {
      const latestMonth = Object.values(sku.months)[2];
      return latestMonth && latestMonth.monthsCover < 2;
    }).length;
  }, 0);
  const shipmentsInTransit = data.shipments.filter(s => s.status === 'In Transit').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your supply chain overview.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          title="Low Stock Alerts" 
          value={lowStockAlerts}
          subtitle="SKUs below 2 months cover"
          color="red"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <Card 
          title="Pending Approvals" 
          value={pendingOrders}
          subtitle="Orders awaiting approval"
          color="amber"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <Card 
          title="Confirmed Orders" 
          value={confirmedOrders}
          subtitle="Ready for shipment"
          color="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <Card 
          title="In Transit" 
          value={shipmentsInTransit}
          subtitle="Shipments on the way"
          color="blue"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {data.orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.skuName} • {order.countryName}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} />
                  <p className="text-sm text-gray-400 mt-1">{formatNumber(order.qtyCartons)} cartons</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Alerts</h2>
          <div className="space-y-3">
            {Object.entries(data.stockCoverData).slice(0, 1).flatMap(([countryId, skus]) =>
              Object.entries(skus).filter(([_, skuData]) => {
                const latestMonth = Object.values(skuData.months)[2];
                return latestMonth && latestMonth.monthsCover < 3;
              }).slice(0, 5).map(([skuId, skuData]) => {
                const latestMonth = Object.values(skuData.months)[2];
                return (
                  <div key={`${countryId}-${skuId}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{skuData.sku.name}</p>
                      <p className="text-sm text-gray-500">{data.countries.find(c => c.id === countryId)?.name}</p>
                    </div>
                    <div 
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ 
                        backgroundColor: getCoverColor(latestMonth.monthsCover),
                        color: getCoverTextColor(latestMonth.monthsCover)
                      }}
                    >
                      {formatCover(latestMonth.monthsCover)} months
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE: STOCK COVER PLANNING
// ============================================================================

const StockCoverPage = ({ onCreateOrder, onViewOrder }) => {
  const { data, updatePlannedQty } = useApp();
  const [selectedCountry, setSelectedCountry] = useState(data.countries[0]?.id || '');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEdit = (skuId, monthKey, currentValue) => {
    setEditingCell({ skuId, monthKey });
    setEditValue(currentValue || '');
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const newValue = Number(editValue) || 0;
    updatePlannedQty(selectedCountry, editingCell.skuId, editingCell.monthKey, newValue);
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const countryData = data.stockCoverData[selectedCountry] || {};

  const measures = [
    { key: 'openingStock', label: 'Opening Stock', type: 'calc' },
    { key: 'consumption', label: 'Consumption', type: 'calc' },
    { key: 'confirmedOrder', label: 'Confirmed Orders', type: 'order' },
    { key: 'pendingOrder', label: 'Pending Orders', type: 'order' },
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[120px]">SKU</th>
                <th className="sticky left-[120px] z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[140px]">Measure</th>
                {data.months.map(month => (
                  <th key={month.key} className="px-3 py-3 text-right font-semibold text-gray-600 min-w-[90px]">
                    {month.label}
                  </th>
                ))}
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
                      {data.months.map(month => {
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
                        
                        if (measure.key === 'confirmedOrder') {
                          return (
                            <td key={month.key} className="px-3 py-2 text-right">
                              {monthData.confirmedOrderQty ? (
                                <div>
                                  <div className="font-medium">{formatNumber(monthData.confirmedOrderQty)}</div>
                                  <button
                                    onClick={() => onViewOrder(monthData.confirmedOrderId)}
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    {monthData.confirmedOrderId}
                                  </button>
                                </div>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        }
                        
                        if (measure.key === 'pendingOrder') {
                          return (
                            <td key={month.key} className="px-3 py-2 text-right">
                              {monthData.pendingOrderQty ? (
                                <div>
                                  <div className="font-medium">{formatNumber(monthData.pendingOrderQty)}</div>
                                  <button
                                    onClick={() => onViewOrder(monthData.pendingOrderId)}
                                    className="text-xs text-amber-600 hover:underline"
                                  >
                                    {monthData.pendingOrderId}
                                  </button>
                                </div>
                              ) : <span className="text-gray-300">—</span>}
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
                                  onClick={() => onCreateOrder({
                                    countryId: selectedCountry,
                                    skuId,
                                    skuName: skuData.sku.name,
                                    monthKey: month.key,
                                    monthLabel: month.label,
                                    monthsCover: monthData.monthsCover,
                                    suggestedQty: Math.max(500, Math.ceil((4 - monthData.monthsCover) * monthData.consumption))
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
                          <td key={month.key} className="px-3 py-2 text-right text-gray-600 bg-gray-50/50">
                            {formatNumber(monthData[measure.key])}
                          </td>
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
    </div>
  );
};

// ============================================================================
// PAGE: ORDER MANAGEMENT
// ============================================================================

const OrdersPage = ({ onViewOrder, onCreateOrder }) => {
  const { data, updateOrderStatus } = useApp();
  const [filters, setFilters] = useState({ countryId: null, skuId: null, status: null, fromDate: null, toDate: null });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredOrders = data.orders.filter(order => {
    if (filters.countryId && order.countryId !== filters.countryId) return false;
    if (filters.skuId && order.skuId !== filters.skuId) return false;
    if (filters.status && order.status !== filters.status) return false;
    return true;
  });

  const statusTabs = ['All', 'Draft', 'Submitted', 'Approved', 'Confirmed', 'Shipped', 'Received', 'Rejected'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 mt-1">Create, track and manage purchase orders</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {statusTabs.map(status => (
          <button
            key={status}
            onClick={() => setFilters({ ...filters, status: status === 'All' ? null : status })}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              (status === 'All' && !filters.status) || filters.status === status
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Order ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Country</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Delivery Month</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Qty (Cartons)</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Channel</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {order.id}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{order.skuId}</div>
                    <div className="text-xs text-gray-400">{order.skuName}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{order.countryName}</td>
                <td className="px-4 py-3 text-gray-600">{order.deliveryMonth}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNumber(order.qtyCartons)}</td>
                <td className="px-4 py-3 text-gray-600">{order.channel}</td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdOn)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {order.status === 'Draft' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Submitted')}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Submit
                      </button>
                    )}
                    {order.status === 'Submitted' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Approved')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Rejected')}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === 'Approved' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Confirmed')}
                        className="px-2 py-1 text-xs bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No orders found matching your filters
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order ${selectedOrder?.id}`} size="lg">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedOrder.status} />
              {selectedOrder.tender && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Tender</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-medium">{selectedOrder.skuName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Country</p>
                <p className="font-medium">{selectedOrder.countryName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Delivery Month</p>
                <p className="font-medium">{selectedOrder.deliveryMonth}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">{formatNumber(selectedOrder.qtyCartons)} cartons</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Channel</p>
                <p className="font-medium">{selectedOrder.channel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium">{selectedOrder.createdBy}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Order History</h3>
              <div className="space-y-3">
                {selectedOrder.history?.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.action}</p>
                      <p className="text-sm text-gray-500">{entry.by} • {formatDateTime(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Order" size="lg">
        <OrderForm 
          onSave={(orderData) => {
            console.log('Creating order:', orderData);
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
};

// Order Form Component
const OrderForm = ({ initialData, onSave, onCancel }) => {
  const { data } = useApp();
  const [formData, setFormData] = useState({
    countryId: initialData?.countryId || '',
    skuId: initialData?.skuId || '',
    deliveryMonth: initialData?.monthKey || '',
    qtyCartons: initialData?.suggestedQty || '',
    channel: '',
    tender: false,
    comments: '',
    ...initialData
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
          <select
            required
            value={formData.countryId}
            onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Country</option>
            {data.countries.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
          <select
            required
            value={formData.skuId}
            onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select SKU</option>
            {data.skus.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Month *</label>
          <select
            required
            value={formData.deliveryMonth}
            onChange={(e) => setFormData({ ...formData, deliveryMonth: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Month</option>
            {data.months.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Cartons) *</label>
          <input
            type="number"
            required
            min="1"
            value={formData.qtyCartons}
            onChange={(e) => setFormData({ ...formData, qtyCartons: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter quantity"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Channel *</label>
          <select
            required
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Channel</option>
            <option value="Private">Private</option>
            <option value="Government">Government</option>
            <option value="Tender">Tender</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="tender"
            checked={formData.tender}
            onChange={(e) => setFormData({ ...formData, tender: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="tender" className="text-sm font-medium text-gray-700">Tender Order</label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
        <textarea
          value={formData.comments}
          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add any notes or comments..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Order
        </button>
      </div>
    </form>
  );
};

// ============================================================================
// PAGE: FORECAST MANAGEMENT
// ============================================================================

const ForecastsPage = () => {
  const { data } = useApp();
  const [filters, setFilters] = useState({ countryId: data.countries[0]?.id || null, skuId: null });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const filteredForecasts = data.forecasts.filter(f => {
    if (filters.countryId && f.countryId !== filters.countryId) return false;
    if (filters.skuId && f.skuId !== filters.skuId) return false;
    return true;
  });

  // Group by SKU
  const forecastsBySkU = filteredForecasts.reduce((acc, f) => {
    if (!acc[f.skuId]) acc[f.skuId] = { sku: data.skus.find(s => s.id === f.skuId), months: {} };
    acc[f.skuId].months[f.monthKey] = f;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Management</h1>
          <p className="text-gray-500 mt-1">Manage sales forecasts and budgets by SKU and month</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Forecast
        </button>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showDateRange={false} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">SKU</th>
                <th className="sticky left-[200px] z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[100px]">Type</th>
                {data.months.map(month => (
                  <th key={month.key} className="px-3 py-3 text-right font-semibold text-gray-600 min-w-[80px]">
                    {month.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-gray-600 min-w-[100px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(forecastsBySkU).map(([skuId, skuData]) => (
                <React.Fragment key={skuId}>
                  {['forecastQty', 'budgetQty', 'actualQty'].map((type, idx) => (
                    <tr key={`${skuId}-${type}`} className={`${idx === 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-50'} hover:bg-gray-50/50`}>
                      <td className="sticky left-0 z-10 bg-white px-4 py-2">
                        {idx === 0 && (
                          <div>
                            <div className="font-semibold text-gray-900">{skuData.sku?.name || skuId}</div>
                            <div className="text-xs text-gray-400">{skuData.sku?.category}</div>
                          </div>
                        )}
                      </td>
                      <td className="sticky left-[200px] z-10 bg-white px-4 py-2">
                        <span className={`text-sm ${type === 'forecastQty' ? 'text-blue-600 font-medium' : type === 'budgetQty' ? 'text-purple-600' : 'text-green-600'}`}>
                          {type === 'forecastQty' ? 'Forecast' : type === 'budgetQty' ? 'Budget' : 'Actual'}
                        </span>
                      </td>
                      {data.months.map(month => {
                        const monthData = skuData.months[month.key];
                        const value = monthData?.[type];
                        return (
                          <td key={month.key} className={`px-3 py-2 text-right ${type === 'forecastQty' ? 'bg-blue-50' : ''}`}>
                            {value !== null && value !== undefined ? formatNumber(value) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatNumber(Object.values(skuData.months).reduce((sum, m) => sum + (m[type] || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE: ALLOCATION MANAGEMENT
// ============================================================================

const AllocationsPage = () => {
  const { data } = useApp();
  const [filters, setFilters] = useState({ countryId: null, skuId: null });
  const [showMoveModal, setShowMoveModal] = useState(null);

  const filteredAllocations = data.allocations.filter(a => {
    if (filters.countryId && a.countryId !== filters.countryId) return false;
    if (filters.skuId && a.skuId !== filters.skuId) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Allocation Management</h1>
          <p className="text-gray-500 mt-1">Manage and move inventory allocations</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Allocation
        </button>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Allocation ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Country</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Delivery Month</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Allocated Qty</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllocations.map(allocation => (
              <tr key={allocation.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{allocation.id}</td>
                <td className="px-4 py-3 text-blue-600">{allocation.orderId}</td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{allocation.skuId}</div>
                    <div className="text-xs text-gray-400">{allocation.skuName}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{allocation.countryName}</td>
                <td className="px-4 py-3 text-gray-600">{allocation.deliveryMonth}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNumber(allocation.allocatedQty)}</td>
                <td className="px-4 py-3"><StatusBadge status={allocation.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setShowMoveModal(allocation)}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      Move
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAllocations.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No allocations found matching your filters
          </div>
        )}
      </div>

      {/* Move Allocation Modal */}
      <Modal isOpen={!!showMoveModal} onClose={() => setShowMoveModal(null)} title="Move Allocation">
        {showMoveModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Current Allocation</p>
              <p className="font-medium">{showMoveModal.skuName}</p>
              <p className="text-sm text-gray-600">{showMoveModal.countryName} • {showMoveModal.deliveryMonth}</p>
              <p className="text-sm font-medium mt-2">{formatNumber(showMoveModal.allocatedQty)} cartons</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Move to Country</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {data.countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Move</label>
              <input 
                type="number" 
                defaultValue={showMoveModal.allocatedQty}
                max={showMoveModal.allocatedQty}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Delivery Month</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {data.months.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowMoveModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg">
                Cancel
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Move Allocation
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// PAGE: SHIPPING MANAGEMENT
// ============================================================================

const ShipmentsPage = () => {
  const { data } = useApp();
  const [filters, setFilters] = useState({ countryId: null, status: null });
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredShipments = data.shipments.filter(s => {
    if (filters.countryId && s.countryId !== filters.countryId) return false;
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Management</h1>
          <p className="text-gray-500 mt-1">Track and manage shipments</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Shipment
        </button>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showSKU={false} />

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['In Transit', 'Delivered', 'Pending', 'Delayed'].map(status => {
          const count = data.shipments.filter(s => s.status === status).length;
          return (
            <div key={status} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{status}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Shipment #</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Destination</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Ship Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ETA</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Carrier</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map(shipment => (
              <tr 
                key={shipment.id} 
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                onClick={() => setSelectedShipment(shipment)}
              >
                <td className="px-4 py-3 font-medium text-blue-600">{shipment.shipmentNumber}</td>
                <td className="px-4 py-3 text-gray-600">{shipment.orderId}</td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{shipment.skuId}</div>
                    <div className="text-xs text-gray-400">{shipment.skuName}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{shipment.countryName}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNumber(shipment.qtyCartons)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(shipment.shipDate)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(shipment.deliveryDate)}</td>
                <td className="px-4 py-3 text-gray-600">{shipment.carrier}</td>
                <td className="px-4 py-3"><StatusBadge status={shipment.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredShipments.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No shipments found matching your filters
          </div>
        )}
      </div>

      {/* Shipment Detail Modal */}
      <Modal isOpen={!!selectedShipment} onClose={() => setSelectedShipment(null)} title={`Shipment ${selectedShipment?.shipmentNumber}`} size="lg">
        {selectedShipment && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedShipment.status} />
              <span className="text-sm text-gray-500">Tracking: {selectedShipment.trackingNumber}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{selectedShipment.orderId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-medium">{selectedShipment.skuName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Destination</p>
                <p className="font-medium">{selectedShipment.countryName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">{formatNumber(selectedShipment.qtyCartons)} cartons</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Ship Date</p>
                <p className="font-medium">{formatDate(selectedShipment.shipDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">{formatDate(selectedShipment.deliveryDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Carrier</p>
                <p className="font-medium">{selectedShipment.carrier}</p>
              </div>
            </div>

            {selectedShipment.status === 'In Transit' && (
              <div className="flex gap-3 pt-4 border-t">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Mark as Delivered
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Report Issue
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// PAGE: REPORTS
// ============================================================================

const ReportsPage = () => {
  const { data } = useApp();
  const [selectedReport, setSelectedReport] = useState('stock-cover');
  const [filters, setFilters] = useState({ countryId: null, year: '2025' });

  const reports = [
    { id: 'stock-cover', name: 'Stock Cover Summary', icon: '📊' },
    { id: 'orders', name: 'Orders Report', icon: '📋' },
    { id: 'forecasts', name: 'Forecast vs Actual', icon: '📈' },
    { id: 'shipments', name: 'Shipment Analysis', icon: '🚚' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Analytics and insights for your supply chain</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selection */}
        <div className="space-y-2">
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                selectedReport === report.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{report.icon}</span>
              <span className="font-medium">{report.name}</span>
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {reports.find(r => r.id === selectedReport)?.name}
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={filters.countryId || ''}
                onChange={(e) => setFilters({ ...filters, countryId: e.target.value || null })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All Countries</option>
                {data.countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Export PDF
              </button>
            </div>
          </div>

          {/* Placeholder for report content */}
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">Report visualization would appear here</p>
              <p className="text-sm mt-1">Connect to Power BI embedded or build custom charts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE: SETTINGS
// ============================================================================

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'users', label: 'Users & Roles' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'integration', label: 'Integration' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your supply chain management system</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input type="text" defaultValue="Menarini Group" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>USD - US Dollar</option>
                    <option>EUR - Euro</option>
                    <option>SAR - Saudi Riyal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year Start</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>January</option>
                    <option>April</option>
                    <option>July</option>
                    <option>October</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Cover Thresholds</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Critical (Red) Below</label>
                  <input type="number" defaultValue="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warning (Yellow) Below</label>
                  <input type="number" defaultValue="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Healthy (Green) Below</label>
                  <input type="number" defaultValue="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Excess (Blue) Above</label>
                  <input type="number" defaultValue="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'integration' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Dataverse Connection</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-green-700 font-medium">Connected to Dataverse</span>
            </div>
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment URL</label>
                <input type="text" defaultValue="https://yourorg.crm.dynamics.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azure AD Tenant ID</label>
                <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="text-gray-500">User management settings would appear here</div>
        )}

        {activeTab === 'notifications' && (
          <div className="text-gray-500">Notification settings would appear here</div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function SupplyChainApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOrderData, setCreateOrderData] = useState(null);
  const [viewOrderId, setViewOrderId] = useState(null);

  useEffect(() => {
    // Load mock data (in production, fetch from Dataverse)
    const mockData = generateMockData();
    setData(mockData);
    setLoading(false);
  }, []);

  const updatePlannedQty = useCallback((countryId, skuId, monthKey, newValue) => {
    setData(prev => {
      const newData = { ...prev };
      if (newData.stockCoverData[countryId]?.[skuId]?.months[monthKey]) {
        newData.stockCoverData[countryId][skuId].months[monthKey].plannedQty = newValue;
      }
      return newData;
    });
  }, []);

  const updateOrderStatus = useCallback((orderId, newStatus) => {
    setData(prev => {
      const newData = { ...prev };
      const orderIndex = newData.orders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        newData.orders[orderIndex] = {
          ...newData.orders[orderIndex],
          status: newStatus,
          history: [
            ...newData.orders[orderIndex].history,
            { action: newStatus, by: 'Ahmed Hassan', date: new Date().toISOString() }
          ]
        };
      }
      return newData;
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Supply Chain Management...</p>
        </div>
      </div>
    );
  }

  const handleCreateOrder = (orderData) => {
    setCreateOrderData(orderData);
    setCurrentPage('orders');
  };

  const handleViewOrder = (orderId) => {
    setViewOrderId(orderId);
    setCurrentPage('orders');
  };

  const contextValue = {
    data,
    setData,
    updatePlannedQty,
    updateOrderStatus
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'stockcover':
        return <StockCoverPage onCreateOrder={handleCreateOrder} onViewOrder={handleViewOrder} />;
      case 'orders':
        return <OrdersPage onViewOrder={handleViewOrder} onCreateOrder={handleCreateOrder} />;
      case 'forecasts':
        return <ForecastsPage />;
      case 'allocations':
        return <AllocationsPage />;
      case 'shipments':
        return <ShipmentsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="ml-64 p-6">
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
}
