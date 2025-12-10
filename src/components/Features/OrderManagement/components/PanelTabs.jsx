import React from 'react';

/**
 * Panel Tabs Component
 * Displays tab navigation for the order management panel
 */
export const PanelTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'details', label: 'Details', icon: '📋' },
    { id: 'actions', label: 'Actions', icon: '⚡' },
    { id: 'po', label: 'PO', icon: '📄' },
    { id: 'forecast', label: 'Forecast', icon: '📈' },
    { id: 'shipping', label: 'Shipping', icon: '🚚' }
  ];

  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default PanelTabs;

