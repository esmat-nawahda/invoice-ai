import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import {
  adminService,
  type Invoice,
  type InvoicesResponse,
} from "../services/adminService";
import type { Business } from "../utils/api";

// Invoice Thumbnail Component
interface InvoiceThumbnailProps {
  invoiceId: string;
}

function InvoiceThumbnail({ invoiceId }: InvoiceThumbnailProps) {
  const [showImage, setShowImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { data: imageData, isLoading: imageLoading } = useQuery({
    queryKey: ['invoice-image', invoiceId],
    queryFn: async () => {
      try {
        return await adminService.getInvoiceImage(invoiceId);
      } catch (error) {
        setImageError(true);
        throw error;
      }
    },
    enabled: showImage,
    retry: false,
  });

  if (!showImage) {
    return (
      <button
        onClick={() => setShowImage(true)}
        className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors"
        title="Load invoice image"
      >
        <PhotoIcon className="h-6 w-6 text-gray-400" />
      </button>
    );
  }

  if (imageLoading) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (imageError || !imageData) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
        <PhotoIcon className="h-6 w-6 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={`data:${imageData?.mimeType || 'image/jpeg'};base64,${imageData?.image || ''}`}
        alt="Invoice thumbnail"
        className="w-12 h-12 rounded-lg object-cover border border-gray-200 cursor-pointer hover:border-primary-500 transition-colors"
        onError={() => setImageError(true)}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity"></div>
    </div>
  );
}

export default function Invoices() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    businessId: "",
    status: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const {
    data: invoicesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoices", currentPage, searchTerm, filters],
    queryFn: () =>
      adminService.getInvoices({
        page: currentPage,
        limit,
        search: searchTerm,
        ...filters,
      }),
  });

  const { data: businesses } = useQuery({
    queryKey: ["businesses-list"],
    queryFn: () => adminService.getBusinesses(),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      businessId: "",
      status: "",
      type: "",
      dateFrom: "",
      dateTo: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "processing":
        return <ClockIcon className="h-4 w-4" />;
      case "failed":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "received"
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "bg-green-50 text-green-700 border border-green-200";
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error loading invoices
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor all invoices across businesses
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {invoicesData && (
            <div className="text-sm text-gray-500">
              {invoicesData.total} total invoices
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices by number, business, vendor..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).some((v) => v) && (
              <span className="ml-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Business Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business
                </label>
                <select
                  value={filters.businessId}
                  onChange={(e) =>
                    handleFilterChange("businessId", e.target.value)
                  }
                  className="input w-full"
                >
                  <option value="">All Businesses</option>
                  {businesses?.map((business) => (
                    <option key={business._id} value={business._id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Types</option>
                  <option value="received">Received</option>
                  <option value="sent">Sent</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                  className="input w-full"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="btn btn-secondary btn-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-sm text-gray-600">
              Loading invoices...
            </span>
          </div>
        ) : invoicesData && invoicesData.invoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoicesData.invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <InvoiceThumbnail invoiceId={invoice._id} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber ||
                                `Invoice ${invoice._id.slice(-6)}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {invoice.vendor?.name ||
                                invoice.customer?.name ||
                                "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/businesses/${invoice.businessId}`}
                          className="flex items-center text-sm text-primary-600 hover:text-primary-800"
                        >
                          <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                          {invoice.businessName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {invoice.amount.toLocaleString()} {invoice.currency}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getTypeBadge(
                            invoice.type
                          )}`}
                        >
                          {invoice.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                            invoice.status
                          )}`}
                        >
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1 capitalize">
                            {invoice.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(invoice.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/invoices/${invoice._id}`}
                          className="text-primary-600 hover:text-primary-800 mr-3 inline-block"
                          title="View Invoice"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoicesData.totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(invoicesData.totalPages, currentPage + 1)
                        )
                      }
                      disabled={currentPage === invoicesData.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * limit + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(currentPage * limit, invoicesData.total)}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {invoicesData.total}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: Math.min(5, invoicesData.totalPages) },
                          (_, i) => {
                            const pageNum =
                              Math.max(
                                1,
                                Math.min(
                                  invoicesData.totalPages - 4,
                                  currentPage - 2
                                )
                              ) + i;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNum
                                    ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(invoicesData.totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === invoicesData.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No invoices found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some((v) => v)
                ? "Try adjusting your search or filters"
                : "No invoices have been processed yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
