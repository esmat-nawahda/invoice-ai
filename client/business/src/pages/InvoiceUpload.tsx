import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface ExtractedData {
  invoiceNumber: string;
  date: string;
  vendor: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  customer: {
    name: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export default function InvoiceUpload() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const { api } = useAuth();
  const navigate = useNavigate();

  const extractMutation = useMutation({
    mutationFn: async (imageData: string) => {
      if (!api) throw new Error('API not initialized');
      
      return api.post<{ data: ExtractedData }>('/invoices/extract', {
        image: imageData,
        saveToDatabase,
        extractOptions: {
          language: 'eng+ara',
          fields: ['all']
        }
      });
    },
    onSuccess: (data) => {
      setExtractedData(data.data);
    },
    onError: (error) => {
      console.error('Extraction failed:', error);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        
        // Auto-extract when file is uploaded
        extractMutation.mutate(result);
      };
      reader.readAsDataURL(file);
    }
  }, [extractMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearFile = () => {
    setUploadedFile(null);
    setPreview(null);
    setExtractedData(null);
  };

  const handleSave = () => {
    if (extractedData && saveToDatabase) {
      navigate('/invoices');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Upload Invoice
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload an invoice image to extract structured data using AI
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Image</h3>
            
            {!uploadedFile ? (
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the invoice here' : 'Upload invoice image'}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Drag and drop an image, or click to select
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                {preview && (
                  <div className="mt-4">
                    <img
                      src={preview}
                      alt="Invoice preview"
                      className="max-w-full h-auto rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Options</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="save-to-database"
                  type="checkbox"
                  checked={saveToDatabase}
                  onChange={(e) => setSaveToDatabase(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="save-to-database" className="ml-2 text-sm text-gray-900">
                  Save extracted data to database
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Extraction Results</h3>
            
            {extractMutation.isPending ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500">Extracting data...</p>
                </div>
              </div>
            ) : extractMutation.isError ? (
              <div className="text-center py-12">
                <XMarkIcon className="mx-auto h-12 w-12 text-red-400" />
                <p className="mt-4 text-sm text-red-600">
                  Failed to extract data. Please try again.
                </p>
              </div>
            ) : extractedData ? (
              <div className="space-y-4">
                <div className="flex items-center text-green-600 mb-4">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Data extracted successfully</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Invoice Number
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{extractedData.invoiceNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{extractedData.date}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Vendor
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{extractedData.vendor.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Total Amount
                    </label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {extractedData.currency} {extractedData.total.toFixed(2)}
                    </p>
                  </div>
                  
                  {extractedData.items.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Items ({extractedData.items.length})
                      </label>
                      <div className="space-y-2">
                        {extractedData.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="text-sm text-gray-700">
                            {item.description} - {item.quantity} × {extractedData.currency}{item.unitPrice}
                          </div>
                        ))}
                        {extractedData.items.length > 3 && (
                          <p className="text-sm text-gray-500">
                            +{extractedData.items.length - 3} more items
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {saveToDatabase && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSave}
                      className="btn btn-primary w-full"
                    >
                      View in Invoice List
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-sm text-gray-500">
                  Upload an invoice to see extracted data here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}