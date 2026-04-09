import React from 'react';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';
import logo from '../../assets/logo.png';

const getPaymentMethodLabel = (method) => {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'card') return 'Credit/Debit Card';
  if (method === 'upi') return 'UPI';
  return method || 'N/A';
};

const getAddressText = (order) => {
  if (order?.addressId) {
    const address = order.addressId;
    return [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
  }

  if (order?.deliveryAddress) {
    const address = order.deliveryAddress;
    return [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
  }

  return 'N/A';
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getInvoiceRows = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((item) => {
    const name = item?.name || item?.menuItemId?.name || 'Item';
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.price || 0);
    const lineTotal = quantity * price;

    return {
      name,
      quantity,
      price,
      lineTotal,
    };
  });
};

const buildPrintableInvoice = ({ order, viewer }) => {
  const rows = getInvoiceRows(order);
  const invoiceId = (order?._id || '').slice(-8).toUpperCase();
  const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'N/A';
  const customerName = order?.userId?.name || order?.customerName || 'Customer';
  const customerPhone = order?.userId?.phone || 'N/A';
  const restaurantName = order?.restaurantId?.name || order?.restaurantName || 'Restaurant';
  const addressText = getAddressText(order);

  const rowHtml = rows.map((row, index) => (
    `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.quantity}</td>
      <td>${escapeHtml(formatCurrency(row.price))}</td>
      <td>${escapeHtml(formatCurrency(row.lineTotal))}</td>
    </tr>`
  )).join('');

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(invoiceId)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 16px; }
      .logoWrap { display: flex; align-items: center; gap: 12px; }
      .logo { width: 44px; height: 44px; object-fit: contain; }
      .brand { font-size: 20px; font-weight: 700; color: #ea580c; }
      .meta { text-align: right; font-size: 12px; color: #4b5563; }
      .copyTag { display: inline-block; font-size: 11px; background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; border-radius: 999px; padding: 4px 10px; margin-bottom: 10px; }
      .section { margin-bottom: 14px; }
      .section h4 { margin: 0 0 8px; font-size: 13px; color: #374151; }
      .section p { margin: 2px 0; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f9fafb; }
      .totals { margin-top: 14px; width: 320px; margin-left: auto; }
      .totalsRow { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
      .grandTotal { font-weight: 700; font-size: 15px; border-top: 1px solid #d1d5db; margin-top: 6px; padding-top: 8px; }
      .footer { margin-top: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
  </head>
  <body>
    <div class="copyTag">${viewer === 'restaurant' ? 'Restaurant Copy' : 'Customer Copy'}</div>
    <div class="header">
      <div class="logoWrap">
        <img class="logo" src="${escapeHtml(logo)}" alt="FlashBites" />
        <div class="brand">FlashBites Invoice</div>
      </div>
      <div class="meta">
        <div><strong>Invoice #${escapeHtml(invoiceId || 'N/A')}</strong></div>
        <div>Order Date: ${escapeHtml(createdAt)}</div>
        <div>Order Status: ${escapeHtml(order?.status || 'N/A')}</div>
      </div>
    </div>

    <div class="section">
      <h4>Billing Details</h4>
      <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
      <p><strong>Customer Phone:</strong> ${escapeHtml(customerPhone)}</p>
      <p><strong>Restaurant:</strong> ${escapeHtml(restaurantName)}</p>
      <p><strong>Delivery Address:</strong> ${escapeHtml(addressText)}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml || '<tr><td colspan="5">No items found</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="totalsRow"><span>Subtotal</span><strong>${escapeHtml(formatCurrency(order?.subtotal || 0))}</strong></div>
      <div class="totalsRow"><span>Delivery Fee</span><strong>${escapeHtml(formatCurrency(order?.deliveryFee || 0))}</strong></div>
      ${(Number(order?.platformFee || 0) > 0) ? `<div class="totalsRow"><span>Platform Fee</span><strong>${escapeHtml(formatCurrency(order?.platformFee || 0))}</strong></div>` : ''}
      ${(Number(order?.tax || 0) > 0) ? `<div class="totalsRow"><span>Tax</span><strong>${escapeHtml(formatCurrency(order?.tax || 0))}</strong></div>` : ''}
      ${(Number(order?.discount || 0) > 0) ? `<div class="totalsRow"><span>Discount</span><strong>- ${escapeHtml(formatCurrency(order?.discount || 0))}</strong></div>` : ''}
      <div class="totalsRow grandTotal"><span>Total</span><span>${escapeHtml(formatCurrency(order?.total || 0))}</span></div>
    </div>

    <div class="footer">
      <div><strong>Payment Method:</strong> ${escapeHtml(getPaymentMethodLabel(order?.paymentMethod))}</div>
      <div><strong>Payment Status:</strong> ${escapeHtml(order?.paymentStatus || 'N/A')}</div>
      <div style="margin-top: 8px;">This is a system-generated invoice from FlashBites.</div>
    </div>

    <script>
      window.onload = function() { window.print(); };
    </script>
  </body>
</html>`;
};

export default function OrderInvoiceModal({ isOpen, onClose, order, viewer = 'customer' }) {
  if (!isOpen || !order) return null;

  const rows = getInvoiceRows(order);
  const invoiceId = (order?._id || '').slice(-8).toUpperCase();
  const customerName = order?.userId?.name || order?.customerName || 'Customer';
  const customerPhone = order?.userId?.phone || 'N/A';
  const restaurantName = order?.restaurantId?.name || order?.restaurantName || 'Restaurant';

  const handlePrint = () => {
    const popup = window.open('', '_blank', 'width=980,height=720');
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintableInvoice({ order, viewer }));
    popup.document.close();
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/60 p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-gray-200">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-primary-700">
              {viewer === 'restaurant' ? 'Restaurant Copy' : 'Customer Copy'}
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Invoice #{invoiceId || 'N/A'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              aria-label="Close invoice modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="FlashBites logo" className="h-12 w-12 object-contain" />
              <div>
                <h4 className="text-xl font-bold text-primary-700">FlashBites Invoice</h4>
                <p className="text-sm text-gray-600">Order ID: {order._id?.slice(-8).toUpperCase() || 'N/A'}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">Order Date:</span> {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'N/A'}</p>
              <p><span className="font-semibold text-gray-800">Order Status:</span> {order.status || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Customer</p>
              <p className="font-semibold text-gray-900">{customerName}</p>
              <p className="text-gray-700">Phone: {customerPhone}</p>
              <p className="text-gray-700 mt-2">Address: {getAddressText(order)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Restaurant</p>
              <p className="font-semibold text-gray-900">{restaurantName}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-left px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Price</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">No items available</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={`${row.name}-${index}`} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(row.price)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full sm:w-80 rounded-lg border border-gray-200 p-4 bg-white text-sm">
            <div className="flex justify-between py-1"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(order.subtotal || 0)}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-600">Delivery Fee</span><span className="font-medium">{formatCurrency(order.deliveryFee || 0)}</span></div>
            {Number(order.platformFee || 0) > 0 && (
              <div className="flex justify-between py-1"><span className="text-gray-600">Platform Fee</span><span className="font-medium">{formatCurrency(order.platformFee || 0)}</span></div>
            )}
            {Number(order.tax || 0) > 0 && (
              <div className="flex justify-between py-1"><span className="text-gray-600">Tax</span><span className="font-medium">{formatCurrency(order.tax || 0)}</span></div>
            )}
            {Number(order.discount || 0) > 0 && (
              <div className="flex justify-between py-1 text-green-700"><span>Discount</span><span className="font-medium">- {formatCurrency(order.discount || 0)}</span></div>
            )}
            <div className="flex justify-between py-2 mt-2 border-t border-gray-200 text-base font-bold">
              <span>Total</span>
              <span className="text-primary-700">{formatCurrency(order.total || 0)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p><span className="font-semibold">Payment Method:</span> {getPaymentMethodLabel(order.paymentMethod)}</p>
            <p><span className="font-semibold">Payment Status:</span> {order.paymentStatus || 'N/A'}</p>
            <p className="mt-1 text-xs text-gray-500">This is a system-generated invoice from FlashBites.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
