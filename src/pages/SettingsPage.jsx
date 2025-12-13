import { useState } from 'react';
import { useApp } from '@/providers/index.js';
import { PageHeader, Card } from '@/components/index.js';
import { DATAVERSE_BASE_URL } from '@/config/dataverse-schema.js';

/**
 * Settings Page Component
 * System configuration and settings management
 */
export const SettingsPage = () => {
  const { data } = useApp();
  const [settings, setSettings] = useState({
    useMockData: true,
    dataverseUrl: DATAVERSE_BASE_URL,
    autoRefresh: true,
    refreshInterval: 30, // seconds
    notifications: true,
    emailNotifications: false
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // In production, save to Dataverse settings table
    // For now, just save to localStorage
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setTimeout(() => {
      setIsSaving(false);
      showMessage.success('Settings saved successfully!');
    }, 500);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        useMockData: true,
        dataverseUrl: DATAVERSE_BASE_URL,
        autoRefresh: true,
        refreshInterval: 30,
        notifications: true,
        emailNotifications: false
      };
      setSettings(defaultSettings);
      localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        subtitle="Configure system settings and preferences"
      />

      {/* Data Source Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Source Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useMockData}
                  onChange={(e) => setSettings({ ...settings, useMockData: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Use Mock Data</div>
                  <div className="text-sm text-gray-500">
                    Enable mock data for development and testing
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dataverse URL
              </label>
              <input
                type="text"
                value={settings.dataverseUrl}
                onChange={(e) => setSettings({ ...settings, dataverseUrl: e.target.value })}
                disabled={settings.useMockData}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="https://YOUR_ORG.crm.dynamics.com/api/data/v9.2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Configure your Dataverse environment URL
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Refresh Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Auto-Refresh Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Enable Auto-Refresh</div>
                  <div className="text-sm text-gray-500">
                    Automatically refresh data at specified intervals
                  </div>
                </div>
              </label>
            </div>

            {settings.autoRefresh && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 30 })}
                  min="10"
                  max="300"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Data will refresh every {settings.refreshInterval} seconds
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Browser Notifications</div>
                  <div className="text-sm text-gray-500">
                    Show browser notifications for important events
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  disabled={!settings.notifications}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div>
                  <div className="font-medium text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-500">
                    Send email notifications for approvals and status changes
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Application Version:</span>
              <span className="font-medium text-gray-900">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Data Mode:</span>
              <span className="font-medium text-gray-900">
                {settings.useMockData ? 'Mock Data' : 'Dataverse'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Countries:</span>
              <span className="font-medium text-gray-900">
                {data?.countries?.length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SKUs:</span>
              <span className="font-medium text-gray-900">
                {data?.skus?.length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Months:</span>
              <span className="font-medium text-gray-900">
                {data?.months?.length || 0}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;

