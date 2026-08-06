import api from "./api";

// POST /sales/returns/
export const createSalesReturn = async (payload) => {
  const response = await api.post("/sales/returns/", payload);
  return response.data;
};

// GET /sales/returns/?invoice_number=... (partial match — invoice numbers are unique
// enough in practice that this behaves as an exact filter)
export const getReturnsByInvoiceNumber = async (invoiceNumber) => {
  const response = await api.get(`/sales/returns/?invoice_number=${encodeURIComponent(invoiceNumber)}`);
  return response.data;
};

// GET /sales/returns/{id}/
export const getSalesReturnById = async (id) => {
  const response = await api.get(`/sales/returns/${id}/`);
  return response.data;
};

// Sums previously-returned quantity per original sale item (sales_item id), across all
// existing returns for an invoice — used to cap how much of each line can be returned again.
export const getReturnedQuantitiesForInvoice = async (invoiceNumber) => {
  const list = await getReturnsByInvoiceNumber(invoiceNumber);
  const details = await Promise.all((list.results || []).map((r) => getSalesReturnById(r.id)));
  const totals = {};
  details.forEach((ret) => {
    (ret.items || []).forEach((it) => {
      if (it.sales_item) {
        totals[it.sales_item] = (totals[it.sales_item] || 0) + (parseFloat(it.quantity) || 0);
      }
    });
  });
  return totals;
};

export const getTrashedSalesReturns = async ({ page = 1, pageSize = 10 } = {}) => {
  const res = await api.get(`/sales/returns/trash/?page=${page}&page_size=${pageSize}`);
  return res.data;
};
export const restoreSalesReturn = async (id) => {
  const res = await api.post(`/sales/returns/${id}/restore/`);
  return res.data;
};
export const permanentDeleteSalesReturn = async (id) => {
  await api.delete(`/sales/returns/${id}/permanent-delete/`);
};
