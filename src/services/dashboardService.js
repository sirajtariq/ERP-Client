import api from "./api";

export const getDashboardCards = async ({ fromDate = "", toDate = "" } = {}) => {
  const params = new URLSearchParams();
  if (fromDate) params.append("from_date", fromDate);
  if (toDate)   params.append("to_date",   toDate);
  const response = await api.get(`/dashboard/cards/?${params.toString()}`);
  return response.data;
};

export const getDashboardCharts = async ({ fromDate = "", toDate = "" } = {}) => {
  const params = new URLSearchParams();
  if (fromDate) params.append("from_date", fromDate);
  if (toDate)   params.append("to_date",   toDate);
  const response = await api.get(`/dashboard/charts/?${params.toString()}`);
  return response.data;
};
