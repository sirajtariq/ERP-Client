import api from "./api";

// GET /sales/invoices/
export const getAllSaleInvoices = async ({ page = 1, pageSize = 10, name = "", invoiceNumber = "", ordering = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (name) params.append("name", name);
  if (invoiceNumber) params.append("invoice_number", invoiceNumber);
  if (ordering) params.append("ordering", ordering);

  const response = await api.get(`/sales/invoices/?${params.toString()}`);
  return response.data;
  // Response: { count, next, previous, results: [...] }
};

// GET /sales/invoices/{id}/
export const getSaleInvoiceById = async (id) => {
  const response = await api.get(`/sales/invoices/${id}/`);
  return response.data;
};

// POST /sales/invoices/
export const createSaleInvoice = async (payload) => {
  const response = await api.post("/sales/invoices/", payload);
  return response.data;
};

// PUT /sales/invoices/{id}/
export const updateSaleInvoice = async (id, payload) => {
  const response = await api.put(`/sales/invoices/${id}/`, payload);
  return response.data;
};

// DELETE /sales/invoices/{id}/
export const deleteSaleInvoice = async (id) => {
  await api.delete(`/sales/invoices/${id}/`);
};

// PATCH /sales/invoices/{id}/ — status change only
export const updateSaleInvoiceStatus = async (id, invoiceStatus) => {
  const response = await api.patch(`/sales/invoices/${id}/`, { invoiceStatus });
  return response.data;
};

// Used for list view — new API returns flat camelCase fields
export const normalizeSaleInvoice = (inv) => ({
  id:            inv.id,
  invoiceNo:     inv.invoiceNumber   || inv.invoice_number || "",
  customerName:  inv.customerName    || "",
  total:         parseFloat(inv.total)   || 0,
  paid:          parseFloat(inv.paid)    || 0,
  pending:       parseFloat(inv.pending) || 0,
  paymentStatus: inv.paymentStatus   || "",
  invoiceStatus: inv.invoiceStatus   || "",
  date:          inv.date            || "",
});

// Used for edit/view — full detail response
export const normalizeSaleInvoiceDetail = (inv) => {
  const cd = inv.customer_data || {};
  return {
    id:             inv.id,
    invoiceNo:      inv.invoice_number          || "",
    date:           inv.date                    || "",
    customerName:   cd.customerName             || "",
    customerId:     cd.customerId               || null,
    customerData: {
      id:            cd.id,
      customerId:    cd.customerId,
      name:          cd.customerName            || "",
      phone:         cd.Phone                   || "",
      customerType:  cd.customerType            || "",
      creditBalance: parseFloat(cd.creditBalance)  || 0,
      advanceBalance: parseFloat(cd.advanceBalance) || 0,
      totalDue:      parseFloat(cd.totalDue)    || 0,
    },
    paymentMethod:   inv.payment_method         || "",
    paymentTerm:     inv.payment_term           || "",
    paid:            parseFloat(inv.paid_amount)      || 0,
    pending:         parseFloat(inv.balance_due)      || 0,
    total:           parseFloat(inv.net_total)        || 0,
    subtotal:        parseFloat(inv.subtotal)         || 0,
    vatPercentage:   parseFloat(inv.vat_percentage)   || 0,
    invoiceDiscount: parseFloat(inv.invoice_discount) || 0,
    taxAmount:       parseFloat(inv.tax_amount)       || 0,
    advanceApplied:  parseFloat(inv.advance_applied)  || 0,
    paymentReference: inv.payment_reference           || "",
    notes:           inv.notes                        || "",
    invoiceStatus:   inv.invoiceStatus                || "",
    paymentStatus:   inv.paymentStatus                || "",
    items: (inv.items || []).map((item) => ({
      id:       item.id,
      name:     item.item_name            || "",
      unit:     item.units                || "",
      qty:      parseFloat(item.quantity) || 0,
      rate:     parseFloat(item.rate)     || 0,
      discount: parseFloat(item.discount) || 0,
      total:    parseFloat(item.total)    || 0,
    })),
  };
};
