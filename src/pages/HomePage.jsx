import React from 'react';
import { useApp } from '../providers/index.js';
import { useOrders, useShipments, useStockCover } from '../hooks/index.js';
import { Card, StatusBadge, PageHeader, LoadingState } from '../components/index.js';
import { formatNumber } from '../utils/index.js';

/**
 * Home Page Component
 * Dashboard with key metrics and recent activity
 */
export const HomePage = () => {
  const { data, loading: appLoading } = useApp();
  const { orders, loading: ordersLoading } = useOrders();
  const { shipments, loading: shipmentsLoading } = useShipments();
  const { stockCoverData, loading: stockCoverLoading } = useStockCover();
  
  const isLoading = appLoading || ordersLoading || shipmentsLoading || stockCoverLoading;
  
  if (!data || isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }
  
  const pendingOrders = orders.filter(o => o.status === 'Submitted').length;
  const confirmedOrders = orders.filter(o => o.status === 'Confirmed').length;
  const lowStockAlerts = Object.values(stockCoverData || {}).reduce((count, country) => {
    return count + Object.values(country).filter(sku => {
      const latestMonth = Object.values(sku.months || {})[2];
      return latestMonth && latestMonth.monthsCover < 2;
    }).length;
  }, 0);
  const shipmentsInTransit = shipments.filter(s => s.status === 'In Transit').length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        description="Welcome to NovaOps! Here's your supply chain overview."
      />
      
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
            {orders.slice(0, 5).map(order => (
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
            {Object.entries(stockCoverData || {}).slice(0, 1).flatMap(([countryId, skus]) =>
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
                        backgroundColor: latestMonth.monthsCover < 2 ? '#ef4444' : '#f59e0b',
                        color: 'white'
                      }}
                    >
                      {latestMonth.monthsCover.toFixed(1)} months
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

export default HomePage;

