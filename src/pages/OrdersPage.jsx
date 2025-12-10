import React, { useState } from 'react';
import { useApp } from '../providers/index.js';
import { useOrders } from '../hooks/index.js';
import { FilterBar, StatusBadge, PageHeader, LoadingState, ErrorState, OrderDetailsModal } from '../components/index.js';
import { formatNumber, formatDate } from '../utils/index.js';

/**
 * Orders Page Component
 * Order management with filtering and status updates
 */
export const OrdersPage = ({ onViewOrder, onCreateOrder }) => {
  const { data } = useApp();
  const { 
    orders: filteredOrders, 
    loading, 
    error,
    filters, 
    setFilters,
    updateOrderStatus,
    createOrder: createOrderService
  } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!data || loading) {
    return <LoadingState message="Loading orders..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const statusTabs = ['All', 'Draft', 'Submitted', 'Approved', 'Confirmed', 'Shipped', 'Received', 'Rejected'];

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Order Management" 
        description="Create, track and manage purchase orders"
        action={() => setShowCreateModal(true)}
        actionLabel="New Order"
      />
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

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
                        onClick={async () => {
                          try {
                            await updateOrderStatus(order.id, 'Submitted');
                          } catch (err) {
                            console.error('Error updating order status:', err);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Submit
                      </button>
                    )}
                    {order.status === 'Submitted' && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await updateOrderStatus(order.id, 'Approved');
                            } catch (err) {
                              console.error('Error updating order status:', err);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await updateOrderStatus(order.id, 'Rejected');
                            } catch (err) {
                              console.error('Error updating order status:', err);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === 'Approved' && (
                      <button
                        onClick={async () => {
                          try {
                            await updateOrderStatus(order.id, 'Confirmed');
                          } catch (err) {
                            console.error('Error updating order status:', err);
                          }
                        }}
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

      <OrderDetailsModal 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        order={selectedOrder}
      />
    </div>
  );
};

export default OrdersPage;

