import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  ServerIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { adminService } from '../services/adminService';

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  country?: string;
  region?: string;
}

interface SystemSettings {
  platform: {
    name: string;
    description: string;
    supportEmail: string;
    maintenanceMode: boolean;
    maxUploadSize: number;
    allowedFileTypes: string[];
  };
  billing: {
    defaultCurrency: string;
    taxRate: number;
    trialPeriodDays: number;
    gracePeriodDays: number;
  };
  security: {
    passwordMinLength: number;
    requireTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableApiAccess: boolean;
    enableMultiCurrency: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    webhookNotifications: boolean;
    notificationRetries: number;
  };
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'currency' | 'security' | 'billing' | 'notifications' | 'advanced'>('general');
  const [isEditing, setIsEditing] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', decimalPlaces: 2 });
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch currencies
  const { data: currencies, isLoading: currenciesLoading } = useQuery({
    queryKey: ['admin-currencies'],
    queryFn: () => adminService.get('/currencies'),
  });

  // Fetch system settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminService.get('/settings'),
    initialData: {
      platform: {
        name: 'Invoice AI Platform',
        description: 'Advanced AI-powered invoice processing platform',
        supportEmail: 'support@invoiceai.com',
        maintenanceMode: false,
        maxUploadSize: 10,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
      },
      billing: {
        defaultCurrency: 'USD',
        taxRate: 0,
        trialPeriodDays: 14,
        gracePeriodDays: 7,
      },
      security: {
        passwordMinLength: 8,
        requireTwoFactor: false,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
      },
      features: {
        enableAnalytics: true,
        enableNotifications: true,
        enableApiAccess: true,
        enableMultiCurrency: true,
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        webhookNotifications: true,
        notificationRetries: 3,
      },
    } as SystemSettings,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<SystemSettings>) =>
      adminService.put('/settings', updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setIsEditing(false);
    },
  });

  // Currency mutations
  const addCurrencyMutation = useMutation({
    mutationFn: (currency: typeof newCurrency) =>
      adminService.post('/currencies', currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      setNewCurrency({ code: '', name: '', symbol: '', decimalPlaces: 2 });
      setShowAddCurrency(false);
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: ({ id, ...currency }: { id: string } & Partial<Currency>) =>
      adminService.put(`/currencies/${id}`, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
    },
  });

  const updateExchangeRatesMutation = useMutation({
    mutationFn: (baseCurrency: string) =>
      adminService.post('/currencies/rates/update', { baseCurrency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
    },
  });

  const handleSettingsUpdate = (section: keyof SystemSettings, field: string, value: any) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value,
      },
    };
    
    updateSettingsMutation.mutate(updatedSettings);
  };

  const handleCurrencyToggle = (currency: Currency) => {
    updateCurrencyMutation.mutate({
      id: currency._id,
      isActive: !currency.isActive,
    });
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'currency', name: 'Currency', icon: CurrencyDollarIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'billing', name: 'Billing', icon: DocumentTextIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'advanced', name: 'Advanced', icon: ServerIcon },
  ];

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <div className="flex items-center space-x-2">
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
          >
            {isEditing ? 'Save Changes' : 'Edit Settings'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="card">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Platform Information</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={settings?.platform.name || ''}
                        onChange={(e) => handleSettingsUpdate('platform', 'name', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={settings?.platform.supportEmail || ''}
                        onChange={(e) => handleSettingsUpdate('platform', 'supportEmail', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={settings?.platform.description || ''}
                      onChange={(e) => handleSettingsUpdate('platform', 'description', e.target.value)}
                      disabled={!isEditing}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Upload Size (MB)
                      </label>
                      <input
                        type="number"
                        value={settings?.platform.maxUploadSize || 10}
                        onChange={(e) => handleSettingsUpdate('platform', 'maxUploadSize', parseInt(e.target.value))}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings?.platform.maintenanceMode || false}
                          onChange={(e) => handleSettingsUpdate('platform', 'maintenanceMode', e.target.checked)}
                          disabled={!isEditing}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Feature Toggles</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(settings?.features || {}).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleSettingsUpdate('features', key, e.target.checked)}
                          disabled={!isEditing}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Currency Management */}
          {activeTab === 'currency' && (
            <div className="space-y-6">
              <div className="card">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Currency Management</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateExchangeRatesMutation.mutate('USD')}
                      disabled={updateExchangeRatesMutation.isPending}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1 inline" />
                      Update Rates
                    </button>
                    <button
                      onClick={() => setShowAddCurrency(true)}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-1 inline" />
                      Add Currency
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Currency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Decimals
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currenciesLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            Loading currencies...
                          </td>
                        </tr>
                      ) : currencies?.map((currency: Currency) => (
                        <tr key={currency._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {currency.code}
                              </span>
                              {currency.country && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({currency.country})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {currency.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {currency.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {currency.decimalPlaces}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleCurrencyToggle(currency)}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                currency.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {currency.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-2">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Currency Modal */}
              {showAddCurrency && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Currency</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Currency Code
                          </label>
                          <input
                            type="text"
                            value={newCurrency.code}
                            onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                            placeholder="USD"
                            maxLength={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Currency Name
                          </label>
                          <input
                            type="text"
                            value={newCurrency.name}
                            onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                            placeholder="US Dollar"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Symbol
                          </label>
                          <input
                            type="text"
                            value={newCurrency.symbol}
                            onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                            placeholder="$"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Decimal Places
                          </label>
                          <select
                            value={newCurrency.decimalPlaces}
                            onChange={(e) => setNewCurrency({ ...newCurrency, decimalPlaces: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={0}>0</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 mt-6">
                        <button
                          onClick={() => setShowAddCurrency(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => addCurrencyMutation.mutate(newCurrency)}
                          disabled={!newCurrency.code || !newCurrency.name || !newCurrency.symbol}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add Currency
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Security Configuration</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      value={settings?.security.passwordMinLength || 8}
                      onChange={(e) => handleSettingsUpdate('security', 'passwordMinLength', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min={6}
                      max={32}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings?.security.sessionTimeout || 60}
                      onChange={(e) => handleSettingsUpdate('security', 'sessionTimeout', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min={15}
                      max={480}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      value={settings?.security.maxLoginAttempts || 5}
                      onChange={(e) => handleSettingsUpdate('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min={3}
                      max={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings?.security.requireTwoFactor || false}
                        onChange={(e) => handleSettingsUpdate('security', 'requireTwoFactor', e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Settings */}
          {activeTab === 'billing' && (
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Billing Configuration</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Currency
                    </label>
                    <select
                      value={settings?.billing.defaultCurrency || 'USD'}
                      onChange={(e) => handleSettingsUpdate('billing', 'defaultCurrency', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={settings?.billing.taxRate || 0}
                      onChange={(e) => handleSettingsUpdate('billing', 'taxRate', parseFloat(e.target.value))}
                      disabled={!isEditing}
                      step="0.01"
                      min={0}
                      max={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trial Period (days)
                    </label>
                    <input
                      type="number"
                      value={settings?.billing.trialPeriodDays || 14}
                      onChange={(e) => handleSettingsUpdate('billing', 'trialPeriodDays', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min={0}
                      max={90}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grace Period (days)
                    </label>
                    <input
                      type="number"
                      value={settings?.billing.gracePeriodDays || 7}
                      onChange={(e) => handleSettingsUpdate('billing', 'gracePeriodDays', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min={0}
                      max={30}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings?.notifications.emailNotifications || false}
                        onChange={(e) => handleSettingsUpdate('notifications', 'emailNotifications', e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings?.notifications.smsNotifications || false}
                        onChange={(e) => handleSettingsUpdate('notifications', 'smsNotifications', e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">SMS Notifications</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings?.notifications.webhookNotifications || false}
                        onChange={(e) => handleSettingsUpdate('notifications', 'webhookNotifications', e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Webhook Notifications</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notification Retries
                    </label>
                    <input
                      type="number"
                      value={settings?.notifications.notificationRetries || 3}
                      onChange={(e) => handleSettingsUpdate('notifications', 'notificationRetries', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min={1}
                      max={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="card">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">System Information</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Platform Version</div>
                      <div className="text-lg font-semibold text-gray-900">v2.1.0</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Database Status</div>
                      <div className="text-lg font-semibold text-green-600 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                        Connected
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Last Backup</div>
                      <div className="text-lg font-semibold text-gray-900">2 hours ago</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">System Load</div>
                      <div className="text-lg font-semibold text-yellow-600">Medium</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Danger Zone</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-red-800">Clear All Cache</h4>
                        <p className="text-sm text-red-600">This will clear all cached data and may temporarily slow down the system.</p>
                      </div>
                      <button className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50">
                        Clear Cache
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-red-800">Reset System Settings</h4>
                        <p className="text-sm text-red-600">This will reset all settings to their default values.</p>
                      </div>
                      <button className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50">
                        Reset Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}