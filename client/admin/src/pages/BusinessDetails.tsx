import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  KeyIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CreditCardIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import {
  adminService,
  type CreateApiKeyData,
  type ApiKeyWithKey,
} from "../services/adminService";
import type { Business, ApiKey } from "../utils/api";

export default function BusinessDetails() {
  const { id } = useParams<{ id: string }>();
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyData>({
    name: "",
    permissions: {
      invoiceCreate: true,
      invoiceRead: true,
      invoiceUpdate: true,
      invoiceDelete: false,
      businessRead: true,
      businessUpdate: false,
    },
  });
  const [createdKey, setCreatedKey] = useState<ApiKeyWithKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: business,
    isLoading: businessLoading,
    error: businessError,
  } = useQuery({
    queryKey: ["business", id],
    queryFn: () => adminService.getBusinessById(id!),
    enabled: !!id,
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["businessApiKeys", id],
    queryFn: () => adminService.getBusinessApiKeys(id!),
    enabled: !!id,
  });

  const createKeyMutation = useMutation({
    mutationFn: (data: CreateApiKeyData) =>
      adminService.createBusinessApiKey(id!, data),
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["businessApiKeys", id] });
      setCreatedKey(newKey);
      setShowCreateKeyModal(false);
      setNewKeyData({
        name: "",
        permissions: {
          invoiceCreate: true,
          invoiceRead: true,
          invoiceUpdate: true,
          invoiceDelete: false,
          businessRead: true,
          businessUpdate: false,
        },
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: ({ keyId, reason }: { keyId: string; reason?: string }) =>
      adminService.revokeApiKey(id!, keyId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessApiKeys", id] });
      setKeyToRevoke(null);
    },
  });

  const resetUsageMutation = useMutation({
    mutationFn: () => adminService.resetBusinessUsage(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", id] });
    },
  });

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    createKeyMutation.mutate(newKeyData);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
      revoked: "bg-red-100 text-red-800",
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

  if (businessLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-sm text-gray-600">
          Loading business details...
        </span>
      </div>
    );
  }

  if (businessError || !business) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error loading business
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {businessError instanceof Error
            ? businessError.message
            : "Business not found"}
        </p>
        <Link
          to="/businesses"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Businesses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            to="/businesses"
            className="mr-4 p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center mr-4">
              <span className="text-lg font-medium text-white">
                {business?.name?.charAt(0) ?? ""}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {business.name}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                    business.status
                  )}`}
                >
                  {business.status}
                </span>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadge(
                    business.plan
                  )}`}
                >
                  {business.plan}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Info */}
        <div className="lg:col-span-1">
          <div className="card p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Business Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Email
                </label>
                <div className="mt-1 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    {business.email}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Business Type
                </label>
                <div className="mt-1 flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900 capitalize">
                    {business?.businessType ?? ""}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Plan & Status
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadge(
                      business.plan
                    )}`}
                  >
                    {business.plan}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                      business.status
                    )}`}
                  >
                    {business.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Joined
                </label>
                <div className="mt-1 flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    {new Date(business.signupDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Trial Ends
                </label>
                <div className="mt-1 flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    {business.trialEndsAt
                      ? new Date(business.trialEndsAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Settings
                </label>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center text-sm">
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${
                        business?.settings?.emailNotifications
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    ></span>
                    <span className="text-gray-600">
                      Email Notifications:{" "}
                      {business?.settings?.emailNotifications
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Timezone: {business.timezone} | Currency:{" "}
                    {business.currency} | Language: {business.language}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Address
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {business.address?.street && (
                    <div>{business.address.street}</div>
                  )}
                  <div>
                    {business.address?.city && `${business.address.city}, `}
                    {business.address?.state && `${business.address.state} `}
                    {business.address?.postalCode}
                  </div>
                  <div>{business.address?.country}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Usage Statistics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Current Month
                  </span>
                  <button
                    onClick={() => resetUsageMutation.mutate()}
                    disabled={resetUsageMutation.isPending}
                    className="text-xs text-primary-600 hover:text-primary-800 disabled:opacity-50"
                  >
                    Reset Usage
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Invoices</span>
                    <span className="text-sm font-medium">
                      {business?.usage?.currentMonth?.invoices ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">API Calls</span>
                    <span className="text-sm font-medium">
                      {business?.usage?.currentMonth?.apiCalls ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Storage Used</span>
                    <span className="text-sm font-medium">
                      {business?.usage?.currentMonth?.storageUsedMB ?? 0} MB
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Total Usage
                </span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Total Invoices
                    </span>
                    <span className="text-sm font-medium">
                      {business?.usage?.total?.invoices ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Total API Calls
                    </span>
                    <span className="text-sm font-medium">
                      {business?.usage?.total?.apiCalls ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Limits
                </span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Monthly Invoices
                    </span>
                    <span className="text-sm font-medium">
                      {business?.limits?.monthlyInvoices ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      API Calls Per Day
                    </span>
                    <span className="text-sm font-medium">
                      {business?.limits?.apiCallsPerDay ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Storage Limit</span>
                    <span className="text-sm font-medium">
                      {business?.limits?.storageGB ?? 0} GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Team Members</span>
                    <span className="text-sm font-medium">
                      {business?.limits?.teamMembers ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">API Keys</span>
                  <span className="text-sm font-medium">
                    {business.apiKeysCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recent Invoices</span>
                  <span className="text-sm font-medium">
                    {business.recentInvoicesCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2" />
                  API Keys
                </h3>
                <button
                  onClick={() => setShowCreateKeyModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create API Key
                </button>
              </div>
            </div>

            <div className="p-6">
              {keysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-2 text-sm text-gray-600">
                    Loading API keys...
                  </span>
                </div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {apiKey.name}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Created{" "}
                            {new Date(apiKey.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Last used:{" "}
                            {apiKey?.lastUsedAt
                              ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                              apiKey.status
                            )}`}
                          >
                            {apiKey.status}
                          </span>
                          {apiKey.status === "active" && (
                            <button
                              onClick={() => setKeyToRevoke(apiKey)}
                              className="text-red-600 hover:text-red-800"
                              title="Revoke Key"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Key:
                        </div>
                        <div className="flex items-center bg-gray-50 rounded px-3 py-2">
                          <code className="text-sm text-gray-800 flex-1 font-mono">
                            {apiKey.maskedKey}
                          </code>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Permissions:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(apiKey.permissions).map(
                            ([permission, enabled]) => (
                              <div
                                key={permission}
                                className="flex items-center"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full mr-2 ${
                                    enabled ? "bg-green-500" : "bg-gray-300"
                                  }`}
                                ></span>
                                <span
                                  className={
                                    enabled ? "text-gray-900" : "text-gray-500"
                                  }
                                >
                                  {permission
                                    .replace(/([A-Z])/g, " $1")
                                    .toLowerCase()}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No API keys
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create an API key to allow this business to access the API.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateKeyModal(true)}
                      className="btn btn-primary"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create First API Key
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Create API Key
              </h3>
              <form onSubmit={handleCreateKey}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g., Production Key"
                    value={newKeyData.name}
                    onChange={(e) =>
                      setNewKeyData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {Object.entries(newKeyData.permissions!).map(
                      ([permission, enabled]) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={enabled}
                            onChange={(e) =>
                              setNewKeyData((prev) => ({
                                ...prev,
                                permissions: {
                                  ...prev.permissions!,
                                  [permission]: e.target.checked,
                                },
                              }))
                            }
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {permission
                              .replace(/([A-Z])/g, " $1")
                              .toLowerCase()}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateKeyModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createKeyMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Created Key Modal */}
      {createdKey && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                API Key Created
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <strong>Important:</strong> This is the only time the full
                    API key will be shown. Please copy it now and store it
                    securely.
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="flex items-center bg-gray-50 rounded border p-3">
                  <code className="text-sm text-gray-800 flex-1 font-mono break-all">
                    {createdKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdKey.key!)}
                    className="ml-2 p-2 text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    {copiedKey ? (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCreatedKey(null)}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700"
                >
                  I've Saved the Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Key Modal */}
      {keyToRevoke && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">
                Revoke API Key
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to revoke the API key{" "}
                  <strong>"{keyToRevoke.name}"</strong>? This action cannot be
                  undone and will immediately stop all API access using this
                  key.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setKeyToRevoke(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 mr-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    revokeKeyMutation.mutate({
                      keyId: keyToRevoke._id,
                      reason: "Revoked by admin",
                    })
                  }
                  disabled={revokeKeyMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 hover:bg-red-700 disabled:opacity-50"
                >
                  {revokeKeyMutation.isPending ? "Revoking..." : "Revoke"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
