import api from "./api";

// GET /purchase/expenses/
export const getAllExpenses = async ({ page = 1, pageSize = 10, category = "", dateFrom = "", dateTo = "", ordering = "" } = {}) => {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (category) params.append("category", category);
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  if (ordering) params.append("ordering", ordering);

  const response = await api.get(`/purchase/expenses/?${params.toString()}`);
  return response.data;
};

// GET /purchase/expenses/{id}/
export const getExpenseById = async (id) => {
  const response = await api.get(`/purchase/expenses/${id}/`);
  return response.data;
};

// POST /purchase/expenses/
export const createExpense = async (payload) => {
  const response = await api.post("/purchase/expenses/", payload);
  return response.data;
};

// PUT /purchase/expenses/{id}/
export const updateExpense = async (id, payload) => {
  const response = await api.put(`/purchase/expenses/${id}/`, payload);
  return response.data;
};

// DELETE /purchase/expenses/{id}/
export const deleteExpense = async (id) => {
  await api.delete(`/purchase/expenses/${id}/`);
};

export const getTrashedExpenses = async ({ page = 1, pageSize = 10, search = "", startDate = "", endDate = "" } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (search)    params.append("expense_number", search);
  if (startDate) params.append("date_from", startDate);
  if (endDate)   params.append("date_to", endDate);
  const res = await api.get(`/purchase/expenses/trash/?${params}`);
  return res.data;
};
export const restoreExpense = async (id) => {
  const res = await api.post(`/purchase/expenses/${id}/restore/`);
  return res.data;
};
export const permanentDeleteExpense = async (id) => {
  await api.delete(`/purchase/expenses/${id}/permanent-delete/`);
};

export const normalizeExpense = (e) => ({
  id:            e.id,
  voucher:       e.expenseNumber   || "",
  category:      e.category        || "",
  amount:        parseFloat(e.amount) || 0,
  supplier:      e.personSupplier  || "",
  paidBy:        e.paidBy          || "",
  paymentMethod: e.paymentMethod   || "",
  notes:         e.notes           || "",
  date:          e.date            || "",
  items: (e.items || []).map((item) => ({
    id:     item.id,
    detail: item.itemName            || "",
    qty:    parseFloat(item.quantity) || 0,
    amount: parseFloat(item.amount)   || 0,
  })),
});
