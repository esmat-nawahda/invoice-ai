import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ServerIcon,
  AdjustmentsHorizontalIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { adminService } from '../services/adminService';

// Color schemes
const PLAN_COLORS = {
  free: '#9CA3AF',
  starter: '#F59E0B',
  professional: '#8B5CF6',
  enterprise: '#06B6D4',
};

const STATUS_COLORS = {
  draft: '#6B7280',
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  paid: '#059669',
  cancelled: '#6B7280',
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics', dateRange.startDate, dateRange.endDate, groupBy],
    queryFn: () => adminService.getAnalytics({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy,
    }),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading analytics</h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Failed to load analytics data'}
        </p>
      </div>
    );
  }

  // Prepare chart data
  const businessGrowthChartData = analytics.businessGrowth.map(item => ({
    date: formatDate(item.date),
    total: item.count,
    ...item.planBreakdown,
  }));

  const invoiceDailyChartData = analytics.invoiceAnalytics.dailyStats.map(item => ({
    date: formatDate(item._id),
    invoices: item.count,
    amount: item.amount,
  }));

  const planBreakdownData = Object.entries(analytics.usageAnalytics.byPlan).map(([plan, data]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    businesses: data.businesses,
    invoices: data.invoices,
    apiCalls: data.apiCalls,
    storage: data.storageGB,
    color: PLAN_COLORS[plan as keyof typeof PLAN_COLORS],
  }));

  const statusBreakdownData = Object.entries(analytics.invoiceAnalytics.statusBreakdown).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
  }));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">
              Platform insights from {new Date(analytics.dateRange.start).toLocaleDateString()} to{' '}
              {new Date(analytics.dateRange.end).toLocaleDateString()}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="input text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="input text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                className="input text-sm"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.revenueAnalytics.mrr)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              {analytics.revenueAnalytics.growthRate >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                analytics.revenueAnalytics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(Math.abs(analytics.revenueAnalytics.growthRate))}
              </span>
              <span className="text-sm text-gray-600 ml-1">growth</span>
            </div>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.invoiceAnalytics.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Total value: {formatCurrency(analytics.invoiceAnalytics.totalAmount)}
            </p>
          </div>
        </div>

        {/* Platform Usage */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Platform Usage</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.usageAnalytics.total.invoices.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {analytics.usageAnalytics.total.apiCalls.toLocaleString()} API calls
            </p>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.usageAnalytics.total.storageGB.toFixed(1)} GB</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ServerIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, analytics.usageAnalytics.utilizationRate.storage * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {formatPercentage(analytics.usageAnalytics.utilizationRate.storage)} utilization
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Business Growth */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Business Growth by Plan
          </h3>
          <div className="space-y-4">
            {Object.entries(analytics.usageAnalytics.byPlan).map(([plan, data]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: PLAN_COLORS[plan as keyof typeof PLAN_COLORS] }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{plan}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{data.businesses}</div>
                  <div className="text-xs text-gray-500">businesses</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Recent growth: {businessGrowthChartData.length > 0 ? businessGrowthChartData[businessGrowthChartData.length - 1].total : 0} new businesses in selected period
            </div>
          </div>
        </div>

        {/* Invoice Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Invoice Activity Summary
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{analytics.invoiceAnalytics.total}</div>
                <div className="text-sm text-blue-600">Total Invoices</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{formatCurrency(analytics.invoiceAnalytics.totalAmount)}</div>
                <div className="text-sm text-green-600">Total Value</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{formatCurrency(analytics.invoiceAnalytics.averageAmount)}</div>
                <div className="text-sm text-purple-600">Average Amount</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">{invoiceDailyChartData.length}</div>
                <div className="text-sm text-orange-600">Active Days</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution and Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Plan Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Plan Distribution
          </h3>
          <div className="space-y-4">
            {planBreakdownData.map((plan) => (
              <div key={plan.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: plan.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{plan.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{plan.businesses}</div>
                    <div className="text-xs text-gray-500">businesses</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{plan.invoices}</div>
                    <div className="text-xs text-gray-500">invoices</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Status Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Invoice Status Distribution
          </h3>
          <div className="space-y-4">
            {statusBreakdownData.filter(status => status.value > 0).map((status) => (
              <div key={status.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: status.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{status.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{status.value}</div>
                    <div className="text-xs text-gray-500">invoices</div>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: status.color,
                        width: `${Math.min(100, (status.value / analytics.invoiceAnalytics.total) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Businesses Table */}
      <div className="card mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Top Businesses by Invoice Count
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg per Invoice
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.topBusinesses.map((business, index) => (
                <tr key={business.businessId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {business.businessName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {business.businessName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Rank #{index + 1}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      business.plan === 'free' ? 'bg-gray-100 text-gray-800' :
                      business.plan === 'starter' ? 'bg-yellow-100 text-yellow-800' :
                      business.plan === 'professional' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {business.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {business.invoiceCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(business.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(business.totalAmount / business.invoiceCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Revenue Analytics
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.revenueAnalytics.mrr)}
              </div>
              <div className="text-sm text-gray-600">Monthly Recurring Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.revenueAnalytics.arr)}
              </div>
              <div className="text-sm text-gray-600">Annual Recurring Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.invoiceAnalytics.averageAmount)}
              </div>
              <div className="text-sm text-gray-600">Average Invoice Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(analytics.usageAnalytics.utilizationRate.invoices)}
              </div>
              <div className="text-sm text-gray-600">Platform Utilization</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.revenueAnalytics.revenueByPlan).map(([plan, revenue]) => (
              <div key={plan} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(revenue)}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {plan} Plan
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}