import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { Business } from "../utils/api";
import {
  adminService,
  type BusinessFilters,
  type CreateBusinessData,
} from "../services/adminService";

export default function Businesses() {
  const [filters, setFilters] = useState<BusinessFilters>({
    page: 1,
    limit: 10,
    search: "",
    status: "all",
    plan: "all",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(
    null
  );

  const queryClient = useQueryClient();

  const {
    data: businessData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["businesses", filters],
    queryFn: () => {
      const apiFilters = { ...filters };
      if (apiFilters.status === "all") delete apiFilters.status;
      if (apiFilters.plan === "all") delete apiFilters.plan;
      if (!apiFilters.search) delete apiFilters.search;
      return adminService.getAllBusinesses(apiFilters);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteBusiness(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setBusinessToDelete(null);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.suspendBusiness(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => adminService.activateBusiness(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBusinessData) => adminService.createBusiness(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setShowCreateModal(false);
    },
  });

  const handleFilterChange = (
    key: keyof BusinessFilters,
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : Number(value), // Ensure page is always a number
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled by the filter state
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      starter: "bg-yellow-100 text-yellow-800",
      professional: "bg-purple-100 text-purple-800",
      enterprise: "bg-indigo-100 text-indigo-800",
    };
    return colors[plan as keyof typeof colors] || colors.free;
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error loading businesses
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-7 text-gray-900">
            Businesses
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all registered businesses and their accounts.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Business
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 gap-6 sm:grid-cols-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="input pl-10"
                placeholder="Search businesses..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              className="input"
              value={filters.status || "all"}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan
            </label>
            <select
              className="input"
              value={filters.plan || "all"}
              onChange={(e) => handleFilterChange("plan", e.target.value)}
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Page
            </label>
            <select
              className="input"
              value={filters.limit || 10}
              onChange={(e) =>
                handleFilterChange("limit", parseInt(e.target.value))
              }
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-sm text-gray-600">
              Loading businesses...
            </span>
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businessData?.data?.businesses?.map((business) => (
                    <tr key={business._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {business.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {business.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {business.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                            business.status
                          )}`}
                        >
                          {business.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadge(
                            business.plan
                          )}`}
                        >
                          {business.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          {business.usage.currentMonth.invoices} invoices
                        </div>
                        <div>
                          {business.usage.currentMonth.apiCalls} API calls
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(business.signupDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/businesses/${business._id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>

                          {business.status === "suspended" ? (
                            <button
                              onClick={() =>
                                activateMutation.mutate(business._id)
                              }
                              className="text-green-600 hover:text-green-900"
                              title="Activate"
                              disabled={activateMutation.isPending}
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                suspendMutation.mutate({
                                  id: business._id,
                                  reason: "Admin action",
                                })
                              }
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Suspend"
                              disabled={suspendMutation.isPending}
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setBusinessToDelete(business)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {businessData?.data?.pagination &&
              businessData.data.pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        handleFilterChange(
                          "page",
                          Math.max(1, (filters.page || 1) - 1)
                        )
                      }
                      disabled={!businessData?.data?.pagination?.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        handleFilterChange(
                          "page",
                          Math.min(
                            businessData?.data?.pagination?.totalPages || 1,
                            (filters.page || 1) + 1
                          )
                        )
                      }
                      disabled={!businessData?.data?.pagination?.hasNext}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page{" "}
                        <span className="font-medium">
                          {businessData?.data?.pagination?.page}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {businessData?.data?.pagination?.totalPages}
                        </span>{" "}
                        ({businessData?.data?.pagination?.total} total)
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() =>
                            handleFilterChange(
                              "page",
                              Math.max(1, (filters.page || 1) - 1)
                            )
                          }
                          disabled={!businessData?.data?.pagination?.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            handleFilterChange(
                              "page",
                              Math.min(
                                businessData?.data?.pagination?.totalPages || 1,
                                (filters.page || 1) + 1
                              )
                            )
                          }
                          disabled={!businessData?.data?.pagination?.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
          </>
        )}
      </div>

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Create New Business
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const businessData: CreateBusinessData = {
                    name: formData.get("name") as string,
                    email: formData.get("email") as string,
                    plan: formData.get("plan") as any,
                    status: formData.get("status") as any,
                    businessType: formData.get("businessType") as any,
                    address: {
                      street: (formData.get("street") as string) || undefined,
                      city: (formData.get("city") as string) || undefined,
                      state: (formData.get("state") as string) || undefined,
                      postalCode:
                        (formData.get("postalCode") as string) || undefined,
                      country: (formData.get("country") as string) || "US",
                    },
                  };
                  // Clean up empty address fields
                  Object.keys(businessData.address!).forEach((key) => {
                    if (
                      !businessData.address![
                        key as keyof typeof businessData.address
                      ]
                    ) {
                      delete businessData.address![
                        key as keyof typeof businessData.address
                      ];
                    }
                  });
                  createMutation.mutate(businessData);
                }}
              >
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="input w-full"
                      placeholder="Enter business name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="input w-full"
                      placeholder="contact@business.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plan
                      </label>
                      <select
                        name="plan"
                        className="input w-full"
                        defaultValue="free"
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        name="status"
                        className="input w-full"
                        defaultValue="trial"
                      >
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      name="businessType"
                      className="input w-full"
                      defaultValue="company"
                    >
                      <option value="company">Company</option>
                      <option value="individual">Individual</option>
                      <option value="non-profit">Non-Profit</option>
                      <option value="government">Government</option>
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Address (Optional)
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        name="street"
                        className="input w-full"
                        placeholder="Street address"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          name="city"
                          className="input w-full"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          name="state"
                          className="input w-full"
                          placeholder="State/Province"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          name="postalCode"
                          className="input w-full"
                          placeholder="Postal Code"
                        />
                        <input
                          type="text"
                          name="country"
                          className="input w-full"
                          placeholder="Country"
                          defaultValue="US"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createMutation.isPending
                      ? "Creating..."
                      : "Create Business"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {businessToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">
                Delete Business
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete{" "}
                  <strong>{businessToDelete.name}</strong>? This will revoke all
                  API keys and set the business status to inactive.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setBusinessToDelete(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 mr-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(businessToDelete._id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
