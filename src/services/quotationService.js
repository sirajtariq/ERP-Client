import api from "./api";

// GET /sales/quotations/
export const getAllQuotations = async ({ page = 1, pageSize = 10, customerName = "", quotationNumber = "", status = "", startDate = "", endDate = "", ordering = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (customerName) params.append("customer_name", customerName);
  if (quotationNumber) params.append("quotation_number", quotationNumber);
  if (status) params.append("status", status);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  if (ordering) params.append("ordering", ordering);

  const response = await api.get(`/sales/quotations/?${params.toString()}`);
  return response.data;
};

// GET /sales/quotations/{id}/
export const getQuotationById = async (id) => {
  const response = await api.get(`/sales/quotations/${id}/`);
  return response.data;
};

// POST /sales/quotations/
export const createQuotation = async (payload) => {
  const response = await api.post("/sales/quotations/", payload);
  return response.data;
};

// PUT /sales/quotations/{id}/
export const updateQuotation = async (id, payload) => {
  const response = await api.put(`/sales/quotations/${id}/`, payload);
  return response.data;
};

// DELETE /sales/quotations/{id}/
export const deleteQuotation = async (id) => {
  await api.delete(`/sales/quotations/${id}/`);
};

// POST /sales/quotations/{id}/convert/
export const convertQuotationToInvoice = async (id, payload) => {
  const response = await api.post(`/sales/quotations/${id}/convert/`, payload);
  return response.data;
};

// customer_data is freeform on the backend ("stored exactly as received") —
// this app always writes/reads it with these snake_case keys.
const normalizeCustomerData = (cd = {}) => ({
  customerId:   cd.customer_id   || null,
  name:         cd.customer_name || "",
  phone:        cd.phone         || "",
  customerType: cd.customer_type || "",
});

export const buildCustomerDataPayload = ({ customerId, name, phone, customerType }) => ({
  customer_id:   customerId || null,
  customer_name: name       || "",
  phone:         phone      || "",
  customer_type: customerType || "",
});

// Used for list view (QuotationList — most fields readOnly there)
export const normalizeQuotation = (q) => ({
  id:              q.id,
  quotationNo:     q.quotation_number || "",
  customer:        normalizeCustomerData(q.customer_data),
  customerName:    normalizeCustomerData(q.customer_data).name,
  total:           parseFloat(q.total) || 0,
  validDays:       q.valid_days ?? null,
  validityDisplay: q.validity_display || "",
  status:          q.status || "",
  effectiveStatus: q.effective_status || "",
  date:            q.date || "",
});

// Used for view/edit — full QuotationDetail response
export const normalizeQuotationDetail = (q) => ({
  id:                 q.id,
  quotationNo:        q.quotation_number || "",
  customer:           normalizeCustomerData(q.customer_data),
  date:               q.date || "",
  validDays:          q.valid_days ?? null,
  validUntil:         q.valid_until || "",
  paymentTerm:        q.payment_term || "cash",
  discountPercentage: parseFloat(q.discount_percentage) || 0,
  vatPercentage:      parseFloat(q.vat_percentage) || 0,
  subtotal:           parseFloat(q.subtotal) || 0,
  discountAmount:     parseFloat(q.discount_amount) || 0,
  vatAmount:          parseFloat(q.vat_amount) || 0,
  total:              parseFloat(q.total) || 0,
  status:             q.status || "draft",
  effectiveStatus:    q.effective_status || "",
  validityDisplay:    q.validity_display || "",
  convertedInvoice:   q.converted_invoice || null,
  items: (q.items || []).map((item) => ({
    id:             item.id,
    inventoryItemId: item.itemId   || null,
    code:           item.itemCode  || "",
    name:           item.name      || item.item_name || "",
    unit:           item.units     || item.unit      || "",
    qty:            parseFloat(item.quantity  ?? item.qty)       || 0,
    rate:           parseFloat(item.unitPrice ?? item.rate)      || 0,
    discount:       parseFloat(item.discount) || 0,
    total:          parseFloat(item.total     ?? item.line_total) || 0,
  })),
});
