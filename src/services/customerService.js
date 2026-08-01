import api from "./api";

// GET /sales/customers/?page=1&page_size=10&name=&ordering=
export const getAllCustomers = async ({ page = 1, pageSize = 10, name = "", ordering = "", type = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (name) params.append("name", name);
  if (ordering) params.append("ordering", ordering);
  // type can be a string ("permanent") or array (["permanent", "walkin"])
  if (Array.isArray(type)) {
    type.forEach((t) => { if (t) params.append("type", t); });
  } else if (type) {
    params.append("type", type);
  }

  const response = await api.get(`/sales/customers/?${params.toString()}`);
  return response.data;
  // Response: { count, total_pages, page, page_size, next, previous, results: [...] }
};

export const searchCustomers = async (query, page = 1, pageSize = 10) => {
  const response = await api.get(`/sales/customers/?name=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`);
  return response.data;
};

export const getCustomerById = async (id) => {
  const response = await api.get(`/sales/customers/${id}/`);
  return response.data;
};

export const createCustomer = async (payload) => {
  const response = await api.post("/sales/customers/", payload);
  return response.data;
};

export const updateCustomer = async (customerId, payload) => {
  const response = await api.put(`/sales/customers/${customerId}/`, payload);
  return response.data;
};

// PATCH /sales/customers/{customer_id}/
export const patchCustomer = async (customerId, payload) => {
  const response = await api.patch(`/sales/customers/${customerId}/`, payload);
  return response.data;
};

export const deleteCustomer = async (customerId) => {
  const response = await api.delete(`/sales/customers/${customerId}/`);
  return response.data;
};

// POST /sales/payments/
export const receiveCustomerPayment = async (payload) => {
  const response = await api.post(`/sales/payments/`, payload);
  return response.data;
};

export const getCustomerLedger = async (customerId) => {
  const response = await api.get(`/sales/customers/${customerId}/ledger/`);
  return response.data;
  // Response: { summary, ledger: [...], finalPaymentDetails }
};

export const normalizeCustomer = (apiCustomer) => ({
  id:            apiCustomer.id,
  customerId:    apiCustomer.customerId || apiCustomer.id,
  invoiceNo:     `C-${String(apiCustomer.customerId || apiCustomer.id).padStart(4, "0")}`,
  name:          apiCustomer.customerName || "",
  customerType:  apiCustomer.customerType || "",
  phone:         apiCustomer.Phone || "",
  email:         apiCustomer.email || "",
  address:       apiCustomer.Address || "",
  taxNumber:     apiCustomer.taxNumber || "",
  openingCredit: apiCustomer.openingCredit || "",
  openingNote:   apiCustomer.openingNote || "",
  creditBalance: parseFloat(apiCustomer.creditBalance) || 0,
  advanceBalance: parseFloat(apiCustomer.advanceBalance) || 0,
  totalPaid: parseFloat(apiCustomer.totalPaid) || 0,
  totalDue: parseFloat(apiCustomer.totalDue) || 0,
  invoices: (apiCustomer.invoices || []).map((inv) => ({
    id:        inv.id,
    invoiceNo: inv.invoice_number || "",
  })),
  summary: {
    creditSales: 0,
    cashReturns: parseFloat(apiCustomer.totalPaid) || 0,
    advanceApplied: 0,
    totalCollected: parseFloat(apiCustomer.totalPaid) || 0,
    cashReceived: parseFloat(apiCustomer.totalPaid) || 0,
    advanceAppliedBreakdown: 0,
    remainingBalance: parseFloat(apiCustomer.totalDue) || 0,
    totalInvoices: 0,
    availableAdvance: parseFloat(apiCustomer.advanceBalance) || 0,
    closingBalance: parseFloat(apiCustomer.totalDue) || 0,
    openingAdvance: 0,
    advanceDeposits: 0,
    closingAvailableAdvance: parseFloat(apiCustomer.advanceBalance) || 0,
  },
  transactions: [],
});
