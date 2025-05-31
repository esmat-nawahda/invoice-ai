import React, { useState } from "react";
import { Listbox } from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronUpDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface ExtractedData {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendor?: {
    name?: string;
    address?: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
  customer?: {
    name?: string;
    address?: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
  lineItems?: Array<{
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }>;
  subtotal?: number;
  taxAmount?: number;
  taxRate?: number;
  discountAmount?: number;
  totalAmount?: number;
  currency?: string;
  paymentTerms?: string;
  paymentStatus?: string;
  notes?: string;
  confidence?: number;
  extractedAt?: string;
}

const paymentStatusOptions = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
];

const InvoiceFlow: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000/api/v1");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedInvoice, setSavedInvoice] = useState<any>(null);
  const [invoiceType, setInvoiceType] = useState<"received" | "sent">("received");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError("");
      setSavedInvoice(null);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractInvoice = async () => {
    if (!apiKey) {
      setError("Please enter an API key");
      return;
    }
    if (!base64Image) {
      setError("Please select an image file");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiUrl}/invoices/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          image: base64Image,
          type: invoiceType,
          saveToDatabase: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to extract invoice");
      }

      setExtractedData(result.data.extracted);
      setEditedData(result.data.extracted);
      setSuccess("Invoice extracted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract invoice");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (path: string, value: any) => {
    if (!editedData) return;

    const newData = { ...editedData };
    const keys = path.split(".");
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setEditedData(newData);
  };

  const saveInvoice = async () => {
    if (!apiKey) {
      setError("Please enter an API key");
      return;
    }
    if (!editedData) {
      setError("No invoice data to save");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiUrl}/invoices/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          type: invoiceType,
          invoiceData: editedData,
          originalImage: {
            base64: base64Image,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save invoice");
      }

      setSavedInvoice(result.data);
      setSuccess(`Invoice saved successfully! ID: ${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setSelectedFile(null);
    setBase64Image("");
    setExtractedData(null);
    setEditedData(null);
    setSavedInvoice(null);
    setError("");
    setSuccess("");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Invoice API Flow Tester</h1>

      {/* Configuration */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            API Configuration
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
                API Key
              </label>
              <input
                type="password"
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Enter your API key"
              />
            </div>
            <div>
              <label htmlFor="api-url" className="block text-sm font-medium text-gray-700">
                API URL
              </label>
              <input
                type="text"
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="http://localhost:3000/api/v1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Upload and Extract */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 text-sm font-bold mr-3">
              1
            </span>
            Upload & Extract Invoice
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice Type</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as "received" | "sent")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="received">Received</option>
                <option value="sent">Sent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Invoice Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}

            {base64Image && (
              <div className="border rounded-lg p-4">
                <img
                  src={base64Image}
                  alt="Invoice preview"
                  className="max-w-full h-auto max-h-64 mx-auto"
                />
              </div>
            )}

            <button
              onClick={extractInvoice}
              disabled={!base64Image || !apiKey || loading}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !base64Image || !apiKey || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extracting...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Extract Invoice Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Review and Edit */}
      {extractedData && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 text-sm font-bold mr-3">
                  2
                </span>
                Review & Edit Extracted Data
              </span>
              {extractedData.confidence && (
                <span className="text-sm font-normal text-gray-600">
                  Confidence: {(extractedData.confidence * 100).toFixed(1)}%
                </span>
              )}
            </h3>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                    <input
                      type="text"
                      value={editedData?.invoiceNumber || ""}
                      onChange={(e) => updateField("invoiceNumber", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                    <input
                      type="date"
                      value={editedData?.invoiceDate?.split("T")[0] || ""}
                      onChange={(e) => updateField("invoiceDate", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={editedData?.dueDate?.split("T")[0] || ""}
                      onChange={(e) => updateField("dueDate", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Vendor Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Vendor Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={editedData?.vendor?.name || ""}
                      onChange={(e) => updateField("vendor.name", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                    <input
                      type="text"
                      value={editedData?.vendor?.taxId || ""}
                      onChange={(e) => updateField("vendor.taxId", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={editedData?.vendor?.email || ""}
                      onChange={(e) => updateField("vendor.email", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={editedData?.vendor?.phone || ""}
                      onChange={(e) => updateField("vendor.phone", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={editedData?.vendor?.address || ""}
                      onChange={(e) => updateField("vendor.address", e.target.value)}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={editedData?.customer?.name || ""}
                      onChange={(e) => updateField("customer.name", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                    <input
                      type="text"
                      value={editedData?.customer?.taxId || ""}
                      onChange={(e) => updateField("customer.taxId", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={editedData?.customer?.email || ""}
                      onChange={(e) => updateField("customer.email", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={editedData?.customer?.phone || ""}
                      onChange={(e) => updateField("customer.phone", e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={editedData?.customer?.address || ""}
                      onChange={(e) => updateField("customer.address", e.target.value)}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData?.subtotal || ""}
                      onChange={(e) => updateField("subtotal", parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData?.taxAmount || ""}
                      onChange={(e) => updateField("taxAmount", parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData?.totalAmount || ""}
                      onChange={(e) => updateField("totalAmount", parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <input
                      type="text"
                      value={editedData?.currency || ""}
                      onChange={(e) => updateField("currency", e.target.value)}
                      maxLength={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                    <Listbox
                      value={editedData?.paymentStatus || "unpaid"}
                      onChange={(value) => updateField("paymentStatus", value)}
                    >
                      <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm">
                          <span className="block truncate">
                            {paymentStatusOptions.find(opt => opt.value === (editedData?.paymentStatus || "unpaid"))?.label}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {paymentStatusOptions.map((option) => (
                            <Listbox.Option
                              key={option.value}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                                }`
                              }
                              value={option.value}
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {option.label}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={editedData?.notes || ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Save */}
      {editedData && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 text-sm font-bold mr-3">
                3
              </span>
              Save Invoice
            </h3>
            <button
              onClick={saveInvoice}
              disabled={loading}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : savedInvoice
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : savedInvoice ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Invoice Saved
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Save Invoice to Database
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {savedInvoice && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-green-600 mb-4">
              Invoice Saved Successfully!
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Invoice ID:</strong> {savedInvoice.id}</p>
              <p><strong>Invoice Number:</strong> {savedInvoice.invoiceNumber}</p>
              <p><strong>Total Amount:</strong> {savedInvoice.totalAmount} {savedInvoice.currency}</p>
              <p><strong>Created At:</strong> {new Date(savedInvoice.createdAt).toLocaleString()}</p>
            </div>
            <button
              onClick={resetFlow}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Test Another Invoice
            </button>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      {success && !savedInvoice && (
        <div className="rounded-md bg-green-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Raw Data Preview */}
      {(extractedData || savedInvoice) && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Raw Data</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {extractedData && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Extracted Data</h4>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                </div>
              )}
              {savedInvoice && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Saved Invoice</h4>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
                    {JSON.stringify(savedInvoice, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceFlow;