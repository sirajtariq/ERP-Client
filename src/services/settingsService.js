import api from "./api";

// GET /settings/business/
export const getBusinessSettings = async () => {
  const response = await api.get("/settings/business/");
  return response.data;
};

// PUT /settings/business/ — payload may be a plain object or FormData (multipart, for logo upload)
export const updateBusinessSettings = async (payload) => {
  const isFormData = payload instanceof FormData;
  const response = await api.put(
    "/settings/business/",
    payload,
    isFormData ? { headers: { "Content-Type": undefined } } : undefined
  );
  return response.data;
};

export const normalizeBusinessSettings = (s) => ({
  logo:     s.logo          || null,
  name:     s.business_name || "",
  contact:  s.contact       || "",
  whatsapp: s.whatsapp      || "",
  email:    s.email         || "",
  address:  s.address       || "",
});
