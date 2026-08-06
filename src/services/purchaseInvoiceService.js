import api from "./api";

// POST /purchase/invoices/
export const createPurchaseInvoice = async (payload) => {
  const response = await api.post("/purchase/invoices/", payload);
  return response.data;
};

// GET /purchase/invoices/
export const getAllPurchaseInvoices = async ({ page = 1, pageSize = 10, invoiceNumber = "", billNumber = "", status = "", paymentTerm = "", ordering = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (invoiceNumber) params.append("invoice_number", invoiceNumber);
  if (billNumber) params.append("bill_number", billNumber);
  if (status) params.append("status", status);
  if (paymentTerm) params.append("payment_term", paymentTerm);
  if (ordering) params.append("ordering", ordering);

  const response = await api.get(`/purchase/invoices/?${params.toString()}`);
  return response.data;
};

export const getPurchaseInvoice = async (id) => {
  const response = await api.get(`/purchase/invoices/${id}/`);
  return response.data;
};

export const updatePurchaseInvoice = async (id, payload) => {
  const response = await api.put(`/purchase/invoices/${id}/`, payload);
  return response.data;
};

// DELETE /purchase/invoices/{id}/
export const deletePurchaseInvoice = async (id) => {
  const response = await api.delete(`/purchase/invoices/${id}/`);
  return response.data;
};

// PATCH /purchase/invoices/{id}/ — status change only (Draft -> Saved)
export const updatePurchaseInvoiceStatus = async (id, status) => {
  const response = await api.patch(`/purchase/invoices/${id}/`, { status });
  return response.data;
};

export const getTrashedPurchaseInvoices = async ({ page = 1, pageSize = 10, search = "", startDate = "", endDate = "" } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (search)    params.append("invoice_number", search);
  if (startDate) params.append("start_date", startDate);
  if (endDate)   params.append("end_date", endDate);
  const res = await api.get(`/purchase/invoices/trash/?${params}`);
  return res.data;
};
export const restorePurchaseInvoice = async (id) => {
  const res = await api.post(`/purchase/invoices/${id}/restore/`);
  return res.data;
};
export const permanentDeletePurchaseInvoice = async (id) => {
  await api.delete(`/purchase/invoices/${id}/permanent-delete/`);
};

export const normalizePurchaseInvoice = (inv) => {
  const total   = parseFloat(inv.netTotal)   || 0;
  const pending = parseFloat(inv.balanceDue) || 0;
  return {
    id:           inv.id,
    invoiceNo:    inv.invoiceNumber              || "",
    billNumber:   inv.billNumber                 || "",
    customerName: inv.vendor?.vendorName         || "",
    total,
    paid:         Math.max(0, total - pending),
    pending,
    status:       inv.paymentStatus              || inv.invoiceStatus || "",
    invoiceStatus: inv.invoiceStatus             || "",
    paymentTerm:  inv.paymentTerm                || "",
    date:         inv.date                       || "",
    vendor:       inv.vendor                     || null,
  };
};
