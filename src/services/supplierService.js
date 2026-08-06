import api from "./api";

// ── Real API ──────────────────────────────────────────────────────────────────

export const getAllVendors = async ({ page = 1, pageSize = 10, name = "", ordering = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (name) params.append("name", name);
  if (ordering) params.append("ordering", ordering);
  const response = await api.get(`/purchase/vendors/?${params.toString()}`);
  return response.data;
};

export const createVendor = async (payload) => {
  const response = await api.post("/purchase/vendors/", payload);
  return response.data;
};

export const updateVendor = async (vendorId, payload) => {
  const response = await api.put(`/purchase/vendors/${vendorId}/`, payload);
  return response.data;
};

export const deleteVendor = async (vendorId) => {
  await api.delete(`/purchase/vendors/${vendorId}/`);
};

// PATCH /purchase/vendors/{vendor_id}/
export const patchVendor = async (vendorId, payload) => {
  const response = await api.patch(`/purchase/vendors/${vendorId}/`, payload);
  return response.data;
};

// GET /purchase/vendors/{vendor_id}/ledger/
export const getVendorLedger = async (vendorId, { from = "", to = "" } = {}) => {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const qs = params.toString();
  const response = await api.get(`/purchase/vendors/${vendorId}/ledger/${qs ? `?${qs}` : ""}`);
  return response.data;
};

export const normalizeVendorLedger = (data) => {
  const summary = data?.summary || {};
  return {
    openingPayable:   parseFloat(summary.openingPayable)   || 0,
    creditPurchases:  parseFloat(summary.creditPurchases)  || 0,
    cashPurchases:    parseFloat(summary.cashPurchases)    || 0,
    advanceApplied:   parseFloat(summary.advanceApplied)   || 0,
    totalPaid:        parseFloat(summary.totalPaid)        || 0,
    remainingBalance: parseFloat(summary.remainingBalance) || 0,
    totalInvoices:    parseInt(summary.totalInvoices, 10)  || 0,
    availableAdvance: parseFloat(summary.availableAdvance) || 0,
    closingBalance:   parseFloat(summary.closingBalance)   || 0,
    totalDebit:       (parseFloat(summary.creditPurchases) || 0) + (parseFloat(summary.cashPurchases) || 0),
    totalCredit:      parseFloat(summary.totalPaid) || 0,
    currentBalance:   parseFloat(summary.closingBalance) || 0,
    transactions: (data?.ledger || []).map((t) => {
      const debit  = parseFloat(t.debit)  || 0;
      const credit = parseFloat(t.credit) || 0;
      return {
        date:        t.date || "",
        voucher:     t.voucher || "",
        description: t.description || "",
        debit:       debit  || null,
        credit:      credit || null,
        balance:     Math.abs(parseFloat(t.balance)) || 0,
        type:        credit > 0 ? "Cr" : "Dr",
      };
    }),
    invoices: (data?.invoices || []).map((inv) => ({
      id:            inv.id,
      invoiceNumber: inv.invoice_number || inv.invoiceNumber || inv.invoiceNo || "",
    })),
  };
};

export const normalizeVendor = (v) => ({
  id:             v.id,
  vendorId:       v.vendorId,
  code:           `V-${String(v.vendorId || v.id).padStart(4, "0")}`,
  name:           v.vendorName || "",
  phone:          v.phone || "",
  email:          v.email || "",
  address:        v.address || "",
  taxNumber:      v.taxNumber || "",
  openingPayable: parseFloat(v.openingPayable) || 0,
  openingNote:    v.openingNote || "",
  payableBalance: parseFloat(v.payableBalance) || 0,
  advanceBalance: parseFloat(v.advanceBalance) || 0,
  totalPaid:      parseFloat(v.totalPaid) || 0,
  createdAt:      v.createdAt || "",
  invoices:       v.invoices || [],
});

export const getTrashedVendors = async ({ page = 1, pageSize = 10, search = "" } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (search) params.append("name", search);
  const res = await api.get(`/purchase/vendors/trash/?${params}`);
  return res.data;
};
export const restoreVendor = async (id) => {
  const res = await api.post(`/purchase/vendors/${id}/restore/`);
  return res.data;
};
export const permanentDeleteVendor = async (id) => {
  await api.delete(`/purchase/vendors/${id}/permanent-delete/`);
};

export const getTrashedVendorPayments = async ({ page = 1, pageSize = 10 } = {}) => {
  const res = await api.get(`/purchase/vendor-payments/trash/?page=${page}&page_size=${pageSize}`);
  return res.data;
};
export const restoreVendorPayment = async (id) => {
  const res = await api.post(`/purchase/vendor-payments/${id}/restore/`);
  return res.data;
};
export const permanentDeleteVendorPayment = async (id) => {
  await api.delete(`/purchase/vendor-payments/${id}/permanent-delete/`);
};

// POST /purchase/vendor-payments/
export const createVendorPayment = async (payload) => {
  const response = await api.post("/purchase/vendor-payments/", payload);
  return response.data;
};
