import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { Invoice } from '../utils/api';
import {
  ArrowLeftIcon,
  PhotoIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [showImage, setShowImage] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => {
      if (!api || !id) throw new Error('API not initialized or ID missing');
      return api.get<Invoice>(`/invoices/${id}`);
    },
    enabled: !!api && !!id,
  });

  // Query for currency conversion
  const { data: currencyConversion, isLoading: isConverting } = useQuery({
    queryKey: ['currency-conversion', invoice?.total, invoice?.currency, targetCurrency],
    queryFn: async () => {
      if (!api || !invoice || invoice.currency === targetCurrency) return null;
      // This would be an API call to convert currency
      // For now, we'll simulate the conversion
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${invoice.currency}`);
      const data = await response.json();
      const rate = data.rates[targetCurrency];
      if (rate) {
        return {
          originalAmount: invoice.total,
          originalCurrency: invoice.currency,
          convertedAmount: invoice.total * rate,
          targetCurrency,
          rate
        };
      }
      return null;
    },
    enabled: !!api && !!invoice && showCurrencyConverter && invoice.currency !== targetCurrency,
  });

  const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'ILS', 'SAR', 'AED'];

  const { data: imageData, isLoading: imageLoading } = useQuery({
    queryKey: ['invoice-image', id],
    queryFn: async () => {
      if (!api || !id) throw new Error('API not initialized or ID missing');
      try {
        const response = await api.get<{ image: string; mimeType: string; size: number }>(`/invoices/${id}/image`);
        return response;
      } catch (error) {
        setImageError(true);
        throw error;
      }
    },
    enabled: !!api && !!id && showImage,
    retry: false,
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'sent':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'pending':
      case 'sent':
        return <ClockIcon className="h-5 w-5" />;
      case 'overdue':
        return <ExclamationCircleIcon className="h-5 w-5" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading invoice...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading invoice</h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Failed to load invoice'}
        </p>
        <Link
          to="/invoices"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The invoice you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          to="/invoices"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Invoices
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
            to="/invoices"
            className="mr-4 p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Invoice {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {getStatusIcon(invoice.status)}
                <span className="ml-1.5 capitalize">{invoice.status}</span>
              </span>
              <span className="text-sm text-gray-600">
                Created {new Date(invoice.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {/* Image Toggle Button */}
          <button
            onClick={() => setShowImage(!showImage)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {showImage ? (
              <>
                <EyeSlashIcon className="h-4 w-4 mr-2" />
                Hide Image
              </>
            ) : (
              <>
                <PhotoIcon className="h-4 w-4 mr-2" />
                Show Image
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invoice Image */}
        {showImage && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Original Invoice
                </h3>
              </div>
              <div className="p-6">
                {imageLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading image...</span>
                  </div>
                ) : imageError || !imageData ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <PhotoIcon className="h-12 w-12 mb-2" />
                    <p className="text-sm text-center">
                      {imageError ? 'Failed to load image' : 'No image available'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <img
                      src={`data:${imageData.mimeType};base64,${imageData.image}`}
                      alt={`Invoice ${invoice.invoiceNumber}`}
                      className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                      onError={() => setImageError(true)}
                    />
                    {invoice.extractionMetadata && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Confidence: {Math.round(invoice.extractionMetadata.confidence * 100)}%</div>
                        <div>Processing time: {invoice.extractionMetadata.processingTime}ms</div>
                        <div>Language: {invoice.extractionMetadata.language}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details */}
        <div className={showImage ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Invoice Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Invoice Number
                      </label>
                      <p className="text-sm text-gray-900 font-mono">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Invoice Date
                      </label>
                      <div className="flex items-center text-sm text-gray-900">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                    </div>
                    {invoice.dueDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Due Date
                        </label>
                        <div className="flex items-center text-sm text-gray-900">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Currency
                      </label>
                      <p className="text-sm text-gray-900">{invoice.currency}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Total Amount
                      </label>
                      <div className="flex items-center text-lg font-semibold text-gray-900">
                        <CurrencyDollarIcon className="h-5 w-5 mr-1 text-gray-400" />
                        {invoice.currency} {invoice.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                {invoice.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Notes
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-md p-3">
                      {invoice.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Vendor Information */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Vendor Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Vendor Name
                      </label>
                      <p className="text-sm text-gray-900 font-medium">{invoice.vendor.name}</p>
                    </div>
                    {invoice.vendor.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email
                        </label>
                        <p className="text-sm text-gray-900">{invoice.vendor.email}</p>
                      </div>
                    )}
                    {invoice.vendor.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Phone
                        </label>
                        <p className="text-sm text-gray-900">{invoice.vendor.phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {invoice.vendor.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Address
                        </label>
                        <p className="text-sm text-gray-900 whitespace-pre-line">{invoice.vendor.address}</p>
                      </div>
                    )}
                    {invoice.vendor.taxId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Tax ID
                        </label>
                        <p className="text-sm text-gray-900 font-mono">{invoice.vendor.taxId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            {invoice.customer && invoice.customer.name && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Customer Information
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Customer Name
                        </label>
                        <p className="text-sm text-gray-900 font-medium">{invoice.customer.name}</p>
                      </div>
                      {invoice.customer.email && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Email
                          </label>
                          <p className="text-sm text-gray-900">{invoice.customer.email}</p>
                        </div>
                      )}
                      {invoice.customer.phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Phone
                          </label>
                          <p className="text-sm text-gray-900">{invoice.customer.phone}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {invoice.customer.address && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Address
                          </label>
                          <p className="text-sm text-gray-900 whitespace-pre-line">{invoice.customer.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            {invoice.items && invoice.items.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Items ({invoice.items.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tax Rate
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{item.description}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">
                            {invoice.currency} {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.taxRate ? `${item.taxRate}%` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono font-medium">
                            {invoice.currency} {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                          Subtotal:
                        </td>
                        <td className="px-6 py-3 text-sm font-mono font-medium text-gray-900 text-right">
                          {invoice.currency} {invoice.subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                          Tax:
                        </td>
                        <td className="px-6 py-3 text-sm font-mono font-medium text-gray-900 text-right">
                          {invoice.currency} {invoice.tax.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={4} className="px-6 py-3 text-base font-bold text-gray-900 text-right">
                          Total:
                        </td>
                        <td className="px-6 py-3 text-base font-mono font-bold text-gray-900 text-right">
                          {invoice.currency} {invoice.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Payment History */}
            {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Payment History ({invoice.paymentHistory.length})
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {invoice.paymentHistory.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.currency} {payment.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.method} • {new Date(payment.date).toLocaleDateString()}
                          </div>
                        </div>
                        {payment.reference && (
                          <div className="text-xs text-gray-500 font-mono">
                            {payment.reference}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Attachments */}
            {invoice.attachments && invoice.attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Attachments ({invoice.attachments.length})
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {invoice.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {attachment.filename}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Currency Conversion Section */}
          <div className="mt-8 card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
                  Currency Conversion
                </h3>
                <button
                  onClick={() => setShowCurrencyConverter(!showCurrencyConverter)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  {showCurrencyConverter ? 'Hide' : 'Show'} Converter
                </button>
              </div>
            </div>
            
            {showCurrencyConverter && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Convert to:
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={targetCurrency}
                      onChange={(e) => setTargetCurrency(e.target.value)}
                    >
                      {commonCurrencies
                        .filter(currency => currency !== invoice.currency)
                        .map(currency => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Original Amount</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {invoice.currency} {invoice.total.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Converted Amount</div>
                    {isConverting ? (
                      <div className="text-sm text-gray-500">Converting...</div>
                    ) : currencyConversion ? (
                      <div>
                        <div className="text-lg font-semibold text-blue-900">
                          {targetCurrency} {currencyConversion.convertedAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Rate: 1 {invoice.currency} = {currencyConversion.rate.toFixed(4)} {targetCurrency}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Select a currency to convert</div>
                    )}
                  </div>
                </div>

                {currencyConversion && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <ExclamationCircleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Exchange Rate Notice</p>
                        <p className="mt-1">
                          This conversion uses live exchange rates and is for reference only. 
                          Actual rates may vary depending on your payment processor or bank.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}