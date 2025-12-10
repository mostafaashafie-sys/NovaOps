import React, { useState } from 'react';
import { AppProvider } from './providers/index.js';
import { Navigation } from './components/index.js';
import { 
  HomePage, 
  StockCoverPage, 
  OrdersPage, 
  ForecastsPage, 
  AllocationsPage, 
  ShipmentsPage 
} from './pages/index.js';

/**
 * Main App Component
 * Root component that manages routing and page navigation
 */
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [createOrderData, setCreateOrderData] = useState(null);
  const [viewOrderId, setViewOrderId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleCreateOrder = (orderData) => {
    setCreateOrderData(orderData);
    setCurrentPage('orders');
  };

  const handleViewOrder = (orderId) => {
    setViewOrderId(orderId);
    setCurrentPage('orders');
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
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              <p className="text-lg">Reports interface coming soon</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              <p className="text-lg">Settings interface coming soon</p>
            </div>
          </div>
        );
      default:
        return <HomePage />;
    }
  };

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          currentPage={currentPage} 
          onNavigate={setCurrentPage}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />
        <main className={`p-6 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}>
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
}

export default App;

