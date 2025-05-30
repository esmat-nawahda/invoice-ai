import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  XCircleIcon
} from '@heroicons/react/24/outline';
import { adminService, type Invoice } from '../services/adminService';

interface ExtendedInvoice extends Invoice {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  vendor: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    taxId?: string;
  };
  customer?: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
  extractionMetadata?: {
    ocrText: string;
    confidence: number;
    processingTime: number;
    language: string;
  };
  paymentHistory?: Array<{
    amount: number;
    date: string;
    method: string;
    reference?: string;
  }>;
}

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const [showImage, setShowImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['admin-invoice', id],
    queryFn: () => {
      if (!id) throw new Error('ID missing');
      return adminService.getInvoiceById(id);
    },
    enabled: !!id,
  });

  const { data: imageData, isLoading: imageLoading } = useQuery({
    queryKey: ['admin-invoice-image', id],
    queryFn: async () => {
      if (!id) throw new Error('ID missing');
      try {
        const response = await adminService.getInvoiceImage(id);
        return response;
      } catch (error) {
        setImageError(true);
        throw error;
      }
    },
    enabled: !!id && showImage,
    retry: false,
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'sent':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
      case 'failed':
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
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'pending':
      case 'sent':
      case 'processing':
        return <ClockIcon className="h-5 w-5" />;
      case 'overdue':
      case 'failed':
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
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
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  const fullInvoice = invoice as ExtendedInvoice;

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
              Invoice {fullInvoice.invoiceNumber}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(fullInvoice.status)}`}>
                {getStatusIcon(fullInvoice.status)}
                <span className="ml-1.5 capitalize">{fullInvoice.status}</span>
              </span>
              <span className="text-sm text-gray-600">
                Created {new Date(fullInvoice.createdAt).toLocaleDateString()}
              </span>
              <Link
                to={`/businesses/${fullInvoice.businessId}`}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
              >
                <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                {fullInvoice.businessName}
              </Link>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                      alt={`Invoice ${fullInvoice.invoiceNumber}`}
                      className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                      onError={() => setImageError(true)}
                    />
                    {fullInvoice.extractionMetadata && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Confidence: {Math.round(fullInvoice.extractionMetadata.confidence * 100)}%</div>
                        <div>Processing time: {fullInvoice.extractionMetadata.processingTime}ms</div>
                        <div>Language: {fullInvoice.extractionMetadata.language}</div>
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
                      <p className="text-sm text-gray-900 font-mono">{fullInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Invoice Date
                      </label>
                      <div className="flex items-center text-sm text-gray-900">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(fullInvoice.date).toLocaleDateString()}
                      </div>
                    </div>
                    {fullInvoice.dueDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Due Date
                        </label>
                        <div className="flex items-center text-sm text-gray-900">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(fullInvoice.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Type
                      </label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md capitalize ${
                        fullInvoice.type === 'received' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {fullInvoice.type}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Currency
                      </label>
                      <p className="text-sm text-gray-900">{fullInvoice.currency}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Total Amount
                      </label>
                      <div className="flex items-center text-lg font-semibold text-gray-900">
                        <CurrencyDollarIcon className="h-5 w-5 mr-1 text-gray-400" />
                        {fullInvoice.currency} {fullInvoice.total?.toFixed(2) || fullInvoice.amount?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                {fullInvoice.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Notes
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-md p-3">
                      {fullInvoice.notes}
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
                      <p className="text-sm text-gray-900 font-medium">{fullInvoice.vendor?.name || 'N/A'}</p>
                    </div>
                    {fullInvoice.vendor?.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email
                        </label>
                        <p className="text-sm text-gray-900">{fullInvoice.vendor.email}</p>
                      </div>
                    )}
                    {fullInvoice.vendor?.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Phone
                        </label>
                        <p className="text-sm text-gray-900">{fullInvoice.vendor.phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {fullInvoice.vendor?.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Address
                        </label>
                        <p className="text-sm text-gray-900 whitespace-pre-line">{fullInvoice.vendor.address}</p>
                      </div>
                    )}
                    {fullInvoice.vendor?.taxId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Tax ID
                        </label>
                        <p className="text-sm text-gray-900 font-mono">{fullInvoice.vendor.taxId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            {fullInvoice.customer && fullInvoice.customer.name && (
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
                        <p className="text-sm text-gray-900 font-medium">{fullInvoice.customer.name}</p>
                      </div>
                      {fullInvoice.customer.email && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Email
                          </label>
                          <p className="text-sm text-gray-900">{fullInvoice.customer.email}</p>
                        </div>
                      )}
                      {fullInvoice.customer.phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Phone
                          </label>
                          <p className="text-sm text-gray-900">{fullInvoice.customer.phone}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {fullInvoice.customer.address && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Address
                          </label>
                          <p className="text-sm text-gray-900 whitespace-pre-line">{fullInvoice.customer.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            {fullInvoice.items && fullInvoice.items.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Items ({fullInvoice.items.length})
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
                      {fullInvoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{item.description}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">
                            {fullInvoice.currency} {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.taxRate ? `${item.taxRate}%` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono font-medium">
                            {fullInvoice.currency} {item.total.toFixed(2)}
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
                          {fullInvoice.currency} {fullInvoice.subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                          Tax:
                        </td>
                        <td className="px-6 py-3 text-sm font-mono font-medium text-gray-900 text-right">
                          {fullInvoice.currency} {fullInvoice.tax.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={4} className="px-6 py-3 text-base font-bold text-gray-900 text-right">
                          Total:
                        </td>
                        <td className="px-6 py-3 text-base font-mono font-bold text-gray-900 text-right">
                          {fullInvoice.currency} {fullInvoice.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Payment History */}
            {fullInvoice.paymentHistory && fullInvoice.paymentHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Payment History ({fullInvoice.paymentHistory.length})
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {fullInvoice.paymentHistory.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {fullInvoice.currency} {payment.amount.toFixed(2)}
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
            {fullInvoice.attachments && fullInvoice.attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Attachments ({fullInvoice.attachments.length})
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {fullInvoice.attachments.map((attachment, index) => (
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
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
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
        </div>
      </div>
    </div>
  );
}