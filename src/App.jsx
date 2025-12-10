import { useState } from 'react';
import { AppProvider } from '@/providers/index.js';
import { Navigation } from '@/components/index.js';
import { 
  HomePage, 
  StockManagementPage, 
  ForecastsPage, 
  AllocationsPage, 
  ShipmentsPage,
  RegulatoryApprovalPage,
  POApprovalPage,
  POManagementPage,
  ReportsPage,
  SettingsPage
} from '@/pages/index.js';

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
        return <HomePage onNavigate={setCurrentPage} />;
      case 'stockcover':
        return <StockManagementPage onCreateOrder={handleCreateOrder} onViewOrder={handleViewOrder} />;
      case 'forecasts':
        return <ForecastsPage />;
      case 'allocations':
        return <AllocationsPage />;
      case 'shipments':
        return <ShipmentsPage />;
      case 'regulatory-approval':
        return <RegulatoryApprovalPage />;
      case 'po-management':
        return <POManagementPage />;
      case 'po-approval':
        return <POApprovalPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
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

