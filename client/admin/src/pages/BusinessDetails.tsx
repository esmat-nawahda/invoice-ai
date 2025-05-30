import React, { useState, useEffect } from "react";
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
  CodeBracketIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import {
  adminService,
  type CreateApiKeyData,
  type ApiKeyWithKey,
  type Invoice,
  type InvoicesResponse,
} from "../services/adminService";
import type { Business, ApiKey } from "../utils/api";

// Business Invoices Section Component
interface BusinessInvoicesSectionProps {
  businessId: string;
}

function BusinessInvoicesSection({ businessId }: BusinessInvoicesSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["businessInvoices", businessId, currentPage],
    queryFn: () =>
      adminService.getBusinessInvoices(businessId, {
        page: currentPage,
        limit,
      }),
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const getTypeBadge = (type: string) => {
    return type === "received"
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "bg-green-50 text-green-700 border border-green-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading invoices...</span>
      </div>
    );
  }

  if (!invoicesData || invoicesData.invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No invoices found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          This business hasn't processed any invoices yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Invoices Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
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
                    <span className="capitalize">{invoice.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {new Date(invoice.date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-primary-600 hover:text-primary-800"
                    title="View Invoice"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {invoicesData.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
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
              of <span className="font-medium">{invoicesData.total}</span>{" "}
              invoices
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary btn-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {invoicesData.totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage(
                  Math.min(invoicesData.totalPages, currentPage + 1)
                )
              }
              disabled={currentPage === invoicesData.totalPages}
              className="btn btn-secondary btn-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showFullKeys, setShowFullKeys] = useState<{
    [keyId: string]: boolean;
  }>({});

  // API Testing states
  const [testApiKey, setTestApiKey] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<"received" | "sent">(
    "received"
  );

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

  const copyToClipboard = async (
    text: string,
    type: "key" | "code" = "key"
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "key") {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getApiBaseUrl = () => {
    return "http://localhost:3000/api/v1"; // Replace with actual API URL
  };

  const getCodeExample = (language: string, apiKey: string) => {
    const baseUrl = getApiBaseUrl();

    switch (language) {
      case "javascript":
        return `// JavaScript/Node.js Example
const axios = require('axios');
const fs = require('fs');

async function extractInvoice(imagePath) {
  try {
    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString('base64');
    
    // Prepare JSON payload
    const payload = {
      image: base64String,
      type: "received", // or "sent"
      saveToDatabase: true // set to false for testing
    };
    
    const response = await axios.post('${baseUrl}/invoices/extract', payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '${apiKey}'
      }
    });
    
    console.log('Extracted data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
extractInvoice('./invoice.jpg');`;

      case "python":
        return `# Python Example
import requests
import base64

def extract_invoice(image_path):
    url = '${baseUrl}/invoices/extract'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': '${apiKey}'
    }
    
    try:
        # Read file and convert to base64
        with open(image_path, 'rb') as file:
            image_data = file.read()
            base64_string = base64.b64encode(image_data).decode('utf-8')
        
        # Prepare JSON payload
        payload = {
            'image': base64_string,
            'type': 'received',  # or 'sent'
            'saveToDatabase': True  # set to False for testing
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print('Extracted data:', data)
        return data
        
    except requests.exceptions.RequestException as error:
        print('Error:', error)
        return None

# Usage
extract_invoice('./invoice.jpg')`;

      case "curl":
        return `# cURL Example
# First, convert your file to base64 (on Unix/Linux/macOS):
# base64 -i ./invoice.jpg > invoice_base64.txt

curl -X POST "${baseUrl}/invoices/extract" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "image": "YOUR_BASE64_ENCODED_FILE_HERE",
    "type": "received",
    "saveToDatabase": false
  }'

# Or with base64 encoding inline (Linux/macOS):
curl -X POST "${baseUrl}/invoices/extract" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d "{\\"image\\": \\"$(base64 -w 0 ./invoice.jpg)\\", \\"type\\": \\"received\\", \\"saveToDatabase\\": false}"`;

      case "php":
        return `<?php
// PHP Example
function extractInvoice($imagePath) {
    $url = '${baseUrl}/invoices/extract';
    $headers = [
        'Content-Type': 'application/json',
        'X-API-Key: ${apiKey}'
    ];
    
    // Read file and convert to base64
    $imageData = file_get_contents($imagePath);
    if ($imageData === false) {
        echo "Error: Could not read file";
        return null;
    }
    
    $base64String = base64_encode($imageData);
    
    // Prepare JSON payload
    $payload = [
        'image' => $base64String,
        'type' => 'received', // or 'sent'
        'saveToDatabase' => true // set to false for testing
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        echo "Extracted data: " . print_r($data, true);
        return $data;
    } else {
        echo "Error: " . $response;
        return null;
    }
}

// Usage
extractInvoice('./invoice.jpg');
?>`;

      case "go":
        return `// Go Example
package main

import (
    "bytes"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

type InvoicePayload struct {
    Image          string \`json:"image"\`
    Type           string \`json:"type"\`
    SaveToDatabase bool   \`json:"saveToDatabase"\`
}

func extractInvoice(imagePath string) error {
    url := "${baseUrl}/invoices/extract"
    
    // Read file and convert to base64
    fileData, err := os.ReadFile(imagePath)
    if err != nil {
        return fmt.Errorf("failed to read file: %v", err)
    }
    
    base64String := base64.StdEncoding.EncodeToString(fileData)
    
    // Prepare JSON payload
    payload := InvoicePayload{
        Image:          base64String,
        Type:           "received", // or "sent"
        SaveToDatabase: true,       // set to false for testing
    }
    
    jsonData, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("failed to marshal JSON: %v", err)
    }
    
    req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        return err
    }
    
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", "${apiKey}")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    responseBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return err
    }
    
    fmt.Printf("Response: %s\\n", responseBody)
    return nil
}

func main() {
    err := extractInvoice("./invoice.jpg")
    if err != nil {
        fmt.Printf("Error: %v\\n", err)
    }
}`;

      case "ruby":
        return `# Ruby Example
require 'net/http'
require 'uri'
require 'json'
require 'base64'

def extract_invoice(image_path)
  uri = URI('${baseUrl}/invoices/extract')
  
  begin
    # Read file and convert to base64
    image_data = File.read(image_path)
    base64_string = Base64.strict_encode64(image_data)
    
    # Prepare JSON payload
    payload = {
      image: base64_string,
      type: 'received', # or 'sent'
      saveToDatabase: true # set to false for testing
    }
    
    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request['X-API-Key'] = '${apiKey}'
    request.body = payload.to_json
    
    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
      http.request(request)
    end
    
    if response.code == '200'
      puts "Extracted data: #{response.body}"
      JSON.parse(response.body)
    else
      puts "Error: #{response.body}"
      nil
    end
  rescue => error
    puts "Error: #{error.message}"
    nil
  end
end

# Usage
extract_invoice('./invoice.jpg')`;

      default:
        return getCodeExample("javascript", apiKey);
    }
  };

  const languages = [
    { id: "javascript", name: "JavaScript/Node.js" },
    { id: "python", name: "Python" },
    { id: "curl", name: "cURL" },
    { id: "php", name: "PHP" },
    { id: "go", name: "Go" },
    { id: "ruby", name: "Ruby" },
  ];

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

  const getAvailableApiKey = () => {
    // If we have a recently created key with full key, use it
    if (createdKey?.key) {
      return createdKey.key;
    }

    // Otherwise, check if we have any API keys and return placeholder
    if (apiKeys && apiKeys.length > 0) {
      // For security, we'll use a placeholder since we only have masked keys
      return "YOUR_API_KEY_HERE";
    }

    return "YOUR_API_KEY_HERE";
  };

  const testApiCall = async () => {
    if (!testApiKey || !selectedFile) {
      setTestError("Please provide both an API key and select a file");
      return;
    }

    setIsTestingApi(true);
    setTestError(null);
    setTestResult(null);

    try {
      // Convert file to base64
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Prepare JSON payload
      const payload = {
        image: base64String,
        type: invoiceType, // Use selected type
        saveToDatabase: false, // Don't save test calls to database
      };

      const response = await fetch(`${getApiBaseUrl()}/invoices/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": testApiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          data: responseData,
          status: response.status,
          statusText: response.statusText,
        });
      } else {
        setTestResult({
          success: false,
          error: responseData,
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : "Network error occurred"
      );
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type - only allow images
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setTestError("Please select a valid image file (JPEG or PNG only)");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setTestError("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
      setTestError(null);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowFullKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  // Auto-populate test API key when a new key is created
  useEffect(() => {
    if (createdKey?.key && !testApiKey) {
      setTestApiKey(createdKey.key);
    }
  }, [createdKey?.key, testApiKey]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
            <div className="space-y-6">
              {/* Current Month Usage with Progress Bars */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-500">
                    Current Month Usage
                  </span>
                  <button
                    onClick={() => resetUsageMutation.mutate()}
                    disabled={resetUsageMutation.isPending}
                    className="text-xs text-primary-600 hover:text-primary-800 disabled:opacity-50"
                  >
                    Reset Usage
                  </button>
                </div>

                {/* Invoices Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Invoices</span>
                    <span className="text-sm font-medium">
                      {business?.usage?.currentMonth?.invoices ?? 0} /{" "}
                      {business?.limits?.monthlyInvoices ?? 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (business?.usage?.currentMonth?.invoices ?? 0) /
                          (business?.limits?.monthlyInvoices ?? 1) >
                        0.8
                          ? "bg-red-500"
                          : (business?.usage?.currentMonth?.invoices ?? 0) /
                              (business?.limits?.monthlyInvoices ?? 1) >
                            0.6
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((business?.usage?.currentMonth?.invoices ?? 0) /
                            (business?.limits?.monthlyInvoices ?? 1)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      ((business?.usage?.currentMonth?.invoices ?? 0) /
                        (business?.limits?.monthlyInvoices ?? 1)) *
                        100
                    )}
                    % used
                  </div>
                </div>

                {/* API Calls Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">
                      API Calls (Daily)
                    </span>
                    <span className="text-sm font-medium">
                      {business?.usage?.currentMonth?.apiCalls ?? 0} /{" "}
                      {business?.limits?.apiCallsPerDay ?? 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (business?.usage?.currentMonth?.apiCalls ?? 0) /
                          (business?.limits?.apiCallsPerDay ?? 1) >
                        0.8
                          ? "bg-red-500"
                          : (business?.usage?.currentMonth?.apiCalls ?? 0) /
                              (business?.limits?.apiCallsPerDay ?? 1) >
                            0.6
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((business?.usage?.currentMonth?.apiCalls ?? 0) /
                            (business?.limits?.apiCallsPerDay ?? 1)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      ((business?.usage?.currentMonth?.apiCalls ?? 0) /
                        (business?.limits?.apiCallsPerDay ?? 1)) *
                        100
                    )}
                    % used
                  </div>
                </div>

                {/* Storage Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Storage</span>
                    <span className="text-sm font-medium">
                      {(
                        (business?.usage?.currentMonth?.storageUsedMB ?? 0) /
                        1024
                      ).toFixed(2)}{" "}
                      GB / {business?.limits?.storageGB ?? 0} GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (business?.usage?.currentMonth?.storageUsedMB ?? 0) /
                          1024 /
                          (business?.limits?.storageGB ?? 1) >
                        0.8
                          ? "bg-red-500"
                          : (business?.usage?.currentMonth?.storageUsedMB ??
                              0) /
                              1024 /
                              (business?.limits?.storageGB ?? 1) >
                            0.6
                          ? "bg-yellow-500"
                          : "bg-purple-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((business?.usage?.currentMonth?.storageUsedMB ?? 0) /
                            1024 /
                            (business?.limits?.storageGB ?? 1)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      ((business?.usage?.currentMonth?.storageUsedMB ?? 0) /
                        1024 /
                        (business?.limits?.storageGB ?? 1)) *
                        100
                    )}
                    % used
                  </div>
                </div>
              </div>

              {/* Usage Comparison Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Total Invoices
                      </p>
                      <p className="text-2xl font-bold text-blue-700">
                        {business?.usage?.total?.invoices ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-200 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-blue-600">
                      {business?.usage?.currentMonth?.invoices ?? 0} this month
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Total API Calls
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        {business?.usage?.total?.apiCalls ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-green-200 rounded-full">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-green-600">
                      {business?.usage?.currentMonth?.apiCalls ?? 0} this month
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Limits Overview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Plan Limits ({business?.plan} Plan)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Invoices:</span>
                    <span className="font-medium">
                      {business?.limits?.monthlyInvoices === -1
                        ? "Unlimited"
                        : business?.limits?.monthlyInvoices ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily API Calls:</span>
                    <span className="font-medium">
                      {business?.limits?.apiCallsPerDay === -1
                        ? "Unlimited"
                        : business?.limits?.apiCallsPerDay ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage:</span>
                    <span className="font-medium">
                      {business?.limits?.storageGB ?? 0} GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team Members:</span>
                    <span className="font-medium">
                      {business?.limits?.teamMembers === -1
                        ? "Unlimited"
                        : business?.limits?.teamMembers ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {business?.apiKeysCount ?? 0}
                    </div>
                    <div className="text-sm text-gray-500">Active API Keys</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {business?.recentInvoicesCount ?? 0}
                    </div>
                    <div className="text-sm text-gray-500">
                      Recent Invoices (30d)
                    </div>
                  </div>
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
                            {showFullKeys[apiKey._id]
                              ? // Show full key if we have it from createdKey, otherwise show masked key
                                createdKey?.key && createdKey._id === apiKey._id
                                ? createdKey.key
                                : apiKey.maskedKey
                              : apiKey.maskedKey}
                          </code>
                          <div className="flex items-center ml-2 space-x-1">
                            <button
                              onClick={() => toggleKeyVisibility(apiKey._id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title={
                                showFullKeys[apiKey._id]
                                  ? "Hide key"
                                  : "Show full key"
                              }
                            >
                              {showFullKeys[apiKey._id] ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </button>
                            {showFullKeys[apiKey._id] && (
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    createdKey?.key &&
                                      createdKey._id === apiKey._id
                                      ? createdKey.key
                                      : apiKey.maskedKey
                                  )
                                }
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Copy key"
                              >
                                {copiedKey ? (
                                  <CheckIcon className="h-4 w-4 text-green-500" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        {!showFullKeys[apiKey._id] && (
                          <div className="text-xs text-gray-500 mt-1">
                            Click the eye icon to reveal the key
                          </div>
                        )}
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

      {/* API Usage Examples Widget */}
      <div className="card mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CodeBracketIcon className="h-5 w-5 mr-2" />
              API Usage Examples
            </h3>
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                Invoice Extract Endpoint
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    API Usage Instructions
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Use the examples below to integrate with the Invoice Extract
                    API.
                    {apiKeys && apiKeys.length > 0
                      ? " The examples use your active API key."
                      : " You'll need to create an API key first."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {apiKeys && apiKeys.length > 0 ? (
            <div>
              {/* API Key Status */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      API Key Status
                    </h4>
                    <p className="text-sm text-blue-700">
                      {createdKey?.key
                        ? "Using recently created API key in examples below"
                        : "Using placeholder in examples - create a new key to get actual working code"}
                    </p>
                  </div>
                  {createdKey?.key && (
                    <div className="flex items-center text-green-700">
                      <CheckIcon className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">
                        Real Key Available
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* API Testing Section */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-4">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <h4 className="text-sm font-medium text-green-800">
                    Test API Endpoint
                  </h4>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  Test the Invoice Extract API directly from your browser with a
                  real API key and file.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* API Key Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        className="input w-full pr-10"
                        placeholder="Enter your API key"
                      />
                      {createdKey?.key && (
                        <button
                          onClick={() => setTestApiKey(createdKey.key!)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          title="Use recently created key"
                        >
                          <KeyIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                    {createdKey?.key && (
                      <p className="text-xs text-gray-500 mt-1">
                        Click the key icon to use your recently created API key
                      </p>
                    )}
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice File
                    </label>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".jpg,.jpeg,.png"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Support: JPEG, PNG images only (max 10MB)
                    </p>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Type
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) =>
                      setInvoiceType(e.target.value as "received" | "sent")
                    }
                    className="input w-full max-w-xs"
                  >
                    <option value="received">Received Invoice</option>
                    <option value="sent">Sent Invoice</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Specify whether this is an invoice you received or sent
                  </p>
                </div>

                {/* Test Button */}
                <div className="mt-4 flex items-center space-x-4">
                  <button
                    onClick={testApiCall}
                    disabled={!testApiKey || !selectedFile || isTestingApi}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTestingApi ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testing API...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Test API Call
                      </div>
                    )}
                  </button>

                  {selectedFile && (
                    <div className="text-sm text-gray-600">
                      Selected: {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {testError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                      <div className="text-sm text-red-700">{testError}</div>
                    </div>
                  </div>
                )}

                {/* Test Result Display */}
                {testResult && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-700">
                        API Response
                      </h5>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          testResult.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {testResult.status} {testResult.statusText}
                      </span>
                    </div>
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-400 ml-4">
                            API Response
                          </span>
                        </div>
                      </div>
                      <pre className="p-4 text-sm text-gray-100 overflow-x-auto max-h-96">
                        <code>
                          {JSON.stringify(
                            testResult.success
                              ? testResult.data
                              : testResult.error,
                            null,
                            2
                          )}
                        </code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Programming Language:
                </label>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedLanguage === lang.id
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Example */}
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    {languages.find((l) => l.id === selectedLanguage)?.name}{" "}
                    Example
                  </h4>
                  <div className="flex items-center space-x-2">
                    {createdKey?.key && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        Using real API key
                      </span>
                    )}
                    <button
                      onClick={() =>
                        copyToClipboard(
                          getCodeExample(
                            selectedLanguage,
                            getAvailableApiKey()
                          ),
                          "code"
                        )
                      }
                      className="flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      {copiedCode ===
                      getCodeExample(selectedLanguage, getAvailableApiKey()) ? (
                        <>
                          <CheckIcon className="h-3 w-3 mr-1 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
                          Copy Code
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-400 ml-4">
                        {selectedLanguage === "curl"
                          ? "Terminal"
                          : `${
                              languages.find((l) => l.id === selectedLanguage)
                                ?.name
                            }`}
                      </span>
                    </div>
                  </div>
                  <pre className="p-4 text-sm text-gray-100 overflow-x-auto">
                    <code>
                      {getCodeExample(selectedLanguage, getAvailableApiKey())}
                    </code>
                  </pre>
                </div>
              </div>

              {/* API Key Notice */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <strong>Important:</strong>
                    {createdKey?.key ? (
                      <>
                        {" "}
                        The code above contains your actual API key. Never
                        expose your API key in client-side code or public
                        repositories.
                      </>
                    ) : (
                      <>
                        {" "}
                        Replace{" "}
                        <code className="bg-yellow-100 px-1 rounded">
                          YOUR_API_KEY_HERE
                        </code>{" "}
                        with your actual API key. Create a new API key to get
                        working code examples with your real key.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* API Documentation Links */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                  <div className="flex items-center mb-2">
                    <DocumentTextIcon className="h-5 w-5 text-primary-600 mr-2" />
                    <h5 className="font-medium text-gray-900">
                      API Documentation
                    </h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Complete API reference and endpoint documentation.
                  </p>
                  <a
                    href="/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    View Docs →
                  </a>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                  <div className="flex items-center mb-2">
                    <CodeBracketIcon className="h-5 w-5 text-primary-600 mr-2" />
                    <h5 className="font-medium text-gray-900">SDK Libraries</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Official SDKs for popular programming languages.
                  </p>
                  <a
                    href="#"
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Browse SDKs →
                  </a>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-primary-600 mr-2" />
                    <h5 className="font-medium text-gray-900">Support</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Get help with integration and troubleshooting.
                  </p>
                  <a
                    href="#"
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Contact Support →
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No API Keys Available
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Create an API key first to see integration examples.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateKeyModal(true)}
                  className="btn btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create API Key
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Invoices Section */}
      <div className="card mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Recent Invoices
            </h3>
            <Link
              to={`/invoices?businessId=${id}`}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              View All →
            </Link>
          </div>
        </div>

        <BusinessInvoicesSection businessId={id!} />
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
