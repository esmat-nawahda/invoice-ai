import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { adminService } from "../services/adminService";
import type { PlatformStatistics } from "../services/adminService";

export default function Dashboard() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<PlatformStatistics>({
    queryKey: ["platform-statistics"],
    queryFn: () => adminService.getPlatformStatistics(),
  });

  const { data: recentBusinesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["recent-businesses"],
    queryFn: () => adminService.getAllBusinesses({ limit: 5, page: 1 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error loading dashboard
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error
            ? error.message
            : "Failed to load dashboard data"}
        </p>
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Businesses",
      value:
        typeof stats?.totalBusinesses === "number"
          ? stats.totalBusinesses.toLocaleString()
          : "0",
      change:
        stats?.businessGrowth !== undefined
          ? `${stats.businessGrowth > 0 ? "+" : ""}${
              stats.businessGrowth
            }%`
          : "N/A",
      changeType:
        stats?.businessGrowth !== undefined
          ? stats.businessGrowth > 0
            ? "increase"
            : stats.businessGrowth < 0
            ? "decrease"
            : "neutral"
          : "neutral",
      icon: BuildingOfficeIcon,
    },
    {
      name: "Active Businesses",
      value:
        typeof stats?.activeBusinesses === "number"
          ? stats.activeBusinesses.toLocaleString()
          : "0",
      change: stats?.totalBusinesses
        ? `${Math.round(
            (stats.activeBusinesses / stats.totalBusinesses) * 100
          )}%`
        : "0%",
      changeType: "neutral",
      icon: UserGroupIcon,
    },
    {
      name: "Total Invoices",
      value:
        typeof stats?.totalInvoices === "number"
          ? stats.totalInvoices.toLocaleString()
          : "0",
      change: `${stats?.monthlyInvoices || 0} this month`,
      changeType: "neutral",
      icon: DocumentTextIcon,
    },
    {
      name: "New This Month",
      value:
        typeof stats?.newBusinessesThisMonth === "number"
          ? stats.newBusinessesThisMonth.toLocaleString()
          : "0",
      change:
        stats?.businessGrowth !== undefined
          ? `${stats.businessGrowth > 0 ? "+" : ""}${
              stats.businessGrowth
            }%`
          : "N/A",
      changeType:
        stats?.businessGrowth !== undefined
          ? stats.businessGrowth > 0
            ? "increase"
            : stats.businessGrowth < 0
            ? "decrease"
            : "neutral"
          : "neutral",
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
            Welcome to the Invoice AI Admin Dashboard
          </p>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {item.value}
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        item.changeType === "increase"
                          ? "text-green-600"
                          : item.changeType === "decrease"
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {item.changeType === "increase" ? (
                        <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                      ) : item.changeType === "decrease" ? (
                        <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
                      ) : null}
                      <span className="sr-only">
                        {item.changeType === "increase"
                          ? "Increased"
                          : "Decreased"}{" "}
                        by
                      </span>
                      {item.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Plan Breakdown */}
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Plan Distribution
            </h3>
          </div>
          <div className="p-6">
            {stats?.planBreakdown ? (
              <div className="space-y-4">
                {Object.entries(stats.planBreakdown).map(
                  ([plan, count]) => (
                    <div
                      key={plan}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {plan}
                      </span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-3">
                          {count || 0}
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${
                                stats.totalBusinesses > 0
                                  ? (count / stats.totalBusinesses) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Status Distribution
            </h3>
          </div>
          <div className="p-6">
            {stats?.statusBreakdown ? (
              <div className="space-y-4">
                {Object.entries(stats.statusBreakdown).map(
                  ([status, count]) => {
                    const statusColors = {
                      active: "bg-green-500",
                      trial: "bg-blue-500",
                      suspended: "bg-red-500",
                      inactive: "bg-gray-500",
                    };
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-2 ${
                              statusColors[
                                status as keyof typeof statusColors
                              ] || "bg-gray-500"
                            }`}
                          ></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-3">
                            {count || 0}
                          </span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                statusColors[
                                  status as keyof typeof statusColors
                                ] || "bg-gray-500"
                              }`}
                              style={{
                                width: `${
                                  stats.totalBusinesses > 0
                                    ? (count / stats.totalBusinesses) * 100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Businesses
              </h3>
              <Link
                to="/businesses"
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {businessesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Loading businesses...
                </span>
              </div>
            ) : recentBusinesses?.businesses &&
              recentBusinesses.businesses.length > 0 ? (
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentBusinesses.businesses.map((business) => (
                    <li key={business._id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {business.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/businesses/${business._id}`}
                            className="text-sm font-medium text-gray-900 truncate hover:text-primary-600"
                          >
                            {business.name}
                          </Link>
                          <p className="text-sm text-gray-500 capitalize">
                            {business.plan} Plan • {business.status}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(business.signupDate).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No businesses found
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Stats
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Monthly Invoices
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats?.monthlyInvoices?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Business Growth
                </span>
                <span
                  className={`text-sm font-semibold ${
                    stats?.businessGrowth && stats.businessGrowth > 0
                      ? "text-green-600"
                      : stats?.businessGrowth &&
                        stats.businessGrowth < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {stats?.businessGrowth !== undefined
                    ? `${stats.businessGrowth > 0 ? "+" : ""}${
                        stats.businessGrowth
                      }%`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Active Rate
                </span>
                <span className="text-sm font-semibold text-green-600">
                  {stats?.totalBusinesses
                    ? `${Math.round(
                        (stats.activeBusinesses /
                          stats.totalBusinesses) *
                          100
                      )}%`
                    : "0%"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  New This Month
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {stats?.newBusinessesThisMonth || "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
