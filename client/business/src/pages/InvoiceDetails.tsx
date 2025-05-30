import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { Invoice } from '../utils/api';

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => {
      if (!api || !id) throw new Error('API not initialized or ID missing');
      return api.get<{ data: Invoice }>(`/invoices/${id}`);
    },
    enabled: !!api && !!id,
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!invoice?.data) {
    return <div className="text-center py-8">Invoice not found</div>;
  }

  const invoiceData = invoice.data;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Invoice {invoiceData.invoiceNumber}
      </h1>
      
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor</h3>
            <p className="text-gray-900">{invoiceData.vendor.name}</p>
            <p className="text-gray-600">{invoiceData.vendor.email}</p>
            <p className="text-gray-600">{invoiceData.vendor.address}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
            <p className="text-gray-600">Date: {new Date(invoiceData.date).toLocaleDateString()}</p>
            <p className="text-gray-600">Status: {invoiceData.status}</p>
            <p className="text-gray-600">Total: {invoiceData.currency} {invoiceData.total.toFixed(2)}</p>
          </div>
        </div>
        
        {invoiceData.items.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{invoiceData.currency} {item.unitPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{invoiceData.currency} {item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}