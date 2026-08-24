import api from "./api";

const BASE = "/inventory/items/";

export const getItems = ({ page = 1, pageSize = 10, search = "", category = "", status = "", itemType = "" } = {}) => {
  const params = { page, page_size: pageSize };
  if (search)   params.search     = search;
  if (category) params.category   = category;
  if (status)   params.status     = status;
  if (itemType) params.itemType   = itemType;
  return api.get(BASE, { params }).then((r) => r.data);
};

export const createItem = (payload) =>
  api.post(BASE, payload).then((r) => r.data);

export const getItemById = (id) =>
  api.get(`${BASE}${id}/`).then((r) => r.data);

export const updateItem = (id, payload) =>
  api.put(`${BASE}${id}/`, payload).then((r) => r.data);

export const deleteItem = (id) =>
  api.delete(`${BASE}${id}/`);

export const adjustStock = (id, payload) =>
  api.post(`${BASE}${id}/adjust/`, payload).then((r) => r.data);

export const getItemHistory = (id, { page = 1, pageSize = 10, startDate = "", endDate = "" } = {}) => {
  const params = { page, page_size: pageSize };
  if (startDate) params.start_date = startDate;
  if (endDate)   params.end_date   = endDate;
  return api.get(`${BASE}${id}/history/`, { params }).then((r) => r.data);
};
