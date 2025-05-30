import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  ClockIcon,
  PlusIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import type { InvoiceStatistics } from '../utils/api';

export default function Dashboard() {
  const { api } = useAuth();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['invoice-statistics'],
    queryFn: () => api?.get<{ data: InvoiceStatistics }>('/invoices/statistics'),
    enabled: !!api,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statisticsData = stats?.data || {
    totalInvoices: 0,
    thisMonth: 0,
    totalAmount: 0,
    averageAmount: 0,
    statusBreakdown: {
      paid: 0,
      pending: 0,
      overdue: 0,
      draft: 0,
      sent: 0,
      cancelled: 0,
    },
    monthlyTrend: [],
  };

  const statCards = [
    {
      name: 'Total Invoices',
      value: statisticsData.totalInvoices.toLocaleString(),
      change: '+12%',
      changeType: 'increase',
      icon: DocumentTextIcon,
    },
    {
      name: 'This Month',
      value: statisticsData.thisMonth.toLocaleString(),
      change: '+8%',
      changeType: 'increase',
      icon: ClockIcon,
    },
    {
      name: 'Total Amount',
      value: `$${statisticsData.totalAmount.toLocaleString()}`,
      change: '+15%',
      changeType: 'increase',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Average Amount',
      value: `$${statisticsData.averageAmount.toLocaleString()}`,
      change: '+3%',
      changeType: 'increase',
      icon: CurrencyDollarIcon,
    },
  ];

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's an overview of your invoice activity.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            to="/upload"
            className="btn btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Invoice
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((item) => (
          <div key={item.name} className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <item.icon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                      <span className="sr-only">Increased by</span>
                      {item.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <Link
                to="/upload"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DocumentTextIcon className="h-6 w-6 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload New Invoice</p>
                  <p className="text-sm text-gray-500">Extract data from invoice images</p>
                </div>
              </Link>
              <Link
                to="/invoices"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DocumentTextIcon className="h-6 w-6 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">View All Invoices</p>
                  <p className="text-sm text-gray-500">Manage your invoice collection</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Invoice Status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Paid</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {statisticsData.statusBreakdown.paid}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Pending</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {statisticsData.statusBreakdown.pending}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Overdue</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {statisticsData.statusBreakdown.overdue}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Draft</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {statisticsData.statusBreakdown.draft}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}