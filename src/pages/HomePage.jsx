import { useApp } from '@/providers/index.js';
import { useShipments, useStockCover, useOrderItems, usePOs } from '@/hooks/index.js';
import { Card, StatusBadge, PageHeader, LoadingState } from '@/components/index.js';
import { formatNumber } from '@/utils/index.js';

/**
 * Home Page Component
 * Dashboard with key metrics and recent activity
 */
export const HomePage = ({ onNavigate }) => {
  const { data, loading: appLoading } = useApp();
  const { shipments, loading: shipmentsLoading } = useShipments();
  const { stockCoverData, loading: stockCoverLoading } = useStockCover();
  const { orderItems, loading: orderItemsLoading } = useOrderItems();
  const { pos, loading: posLoading } = usePOs();
  
  const isLoading = appLoading || shipmentsLoading || stockCoverLoading || orderItemsLoading || posLoading;
  
  if (!data || isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }
  
  // Calculate order item statistics
  const pendingPlannedItems = orderItems.filter(oi => oi.status === 'Planned').length;
  const backOrderItems = orderItems.filter(oi => oi.status === 'Back Order').length;
  const lowStockAlerts = Object.values(stockCoverData || {}).reduce((count, country) => {
    return count + Object.values(country).filter(sku => {
      const latestMonth = Object.values(sku.months || {})[2];
      return latestMonth && latestMonth.monthsCover < 2;
    }).length;
  }, 0);
  const shipmentsInTransit = shipments.filter(s => s.status === 'In Transit').length;
  
  // Approval counts
  const pendingRegulatoryApprovals = orderItems.filter(oi => oi.status === 'Pending Regulatory').length;
  const pendingPOApprovals = pos.filter(po => po.status === 'Pending CFO Approval').length;

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
        {pendingPlannedItems > 0 && (
          <Card 
            title="Planned Items" 
            value={pendingPlannedItems}
            subtitle="Order items ready to confirm"
            color="amber"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            onClick={onNavigate ? () => onNavigate('stockcover') : undefined}
            clickable={true}
          />
        )}
        {pendingRegulatoryApprovals > 0 && (
          <Card 
            title="Regulatory Approval" 
            value={pendingRegulatoryApprovals}
            subtitle="Labels pending approval"
            color="orange"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            onClick={onNavigate ? () => onNavigate('regulatory-approval') : undefined}
            clickable={true}
          />
        )}
        {pendingPOApprovals > 0 && (
          <Card 
            title="PO Approval (CFO)" 
            value={pendingPOApprovals}
            subtitle="Purchase orders pending"
            color="purple"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            onClick={onNavigate ? () => onNavigate('po-approval') : undefined}
            clickable={true}
          />
        )}
        <Card 
          title="Back Order Items" 
          value={backOrderItems}
          subtitle="Ready for allocation"
          color="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          onClick={backOrderItems > 0 && onNavigate ? () => onNavigate('stockcover') : undefined}
          clickable={backOrderItems > 0}
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
        {/* Recent Order Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Order Items</h2>
          <div className="space-y-3">
            {orderItems.slice(0, 5).map(orderItem => (
              <div key={orderItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 font-mono text-sm">{orderItem.id}</p>
                  <p className="text-sm text-gray-500">{orderItem.skuName} • {orderItem.countryName}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={orderItem.status} />
                  <p className="text-sm text-gray-400 mt-1">{formatNumber(orderItem.qtyCartons)} cartons</p>
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

