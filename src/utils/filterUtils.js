// Builds a query-param string from applied filters. NOT wired into any API call yet —
// backend doesn't support these params. Call this and log/inspect it until the backend is ready,
// then pass the string into the relevant service's api.get(...) call.
export const buildFilterQueryParams = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, value);
  });
  return params.toString();
};

export const countActiveFilters = (filters = {}) =>
  Object.values(filters || {}).filter((v) => v !== undefined && v !== null && v !== "").length;
