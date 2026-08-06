import api from "./api";

export const createPayment = async (payload) => {
  const response = await api.post("/sales/payments/", payload);
  return response.data;
};

export const updatePayment = async (id, payload) => {
  const response = await api.put(`/sales/payments/${id}/`, payload);
  return response.data;
};

export const deletePayment = async (id) => {
  await api.delete(`/sales/payments/${id}/`);
};

export const getAllPayments = async ({ page = 1, pageSize = 10, customer = "", from = "", to = "", ordering = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (customer) params.append("customer", customer);
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (ordering) params.append("ordering", ordering);
  const response = await api.get(`/sales/payments/?${params.toString()}`);
  return response.data;
};

export const getTrashedPayments = async ({ page = 1, pageSize = 10, search = "", startDate = "", endDate = "" } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (search)    params.append("customer", search);
  if (startDate) params.append("from", startDate);
  if (endDate)   params.append("to", endDate);
  const res = await api.get(`/sales/payments/trash/?${params}`);
  return res.data;
};
export const restorePayment = async (id) => {
  const res = await api.post(`/sales/payments/${id}/restore/`);
  return res.data;
};

export const normalizePayment = (p) => ({
  id: p.id,
  receiptNumber: p.receipt_number || "",
  date: p.date || "",
  customer: p.customer || null,
  customerName: p.customerName || "",
  invoice: p.invoice || null,
  invoiceNumber: p.invoiceNumber || "",
  amountReceived: parseFloat(p.amount_received) || 0,
  balanceAfter: parseFloat(p.balance_after) || 0,
  method: p.method || "",
  notes: p.notes || "",
  appliedToInvoice: parseFloat(p.applied_to_invoice) || 0,
  appliedToCredit: parseFloat(p.applied_to_credit) || 0,
  appliedToAdvance: parseFloat(p.applied_to_advance) || 0,
});
