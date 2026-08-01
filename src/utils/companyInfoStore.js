import { STORAGE_PREFIX } from "@/services/api";

const STORAGE_KEY = `${STORAGE_PREFIX}company`;

const defaultCompanyInfo = {
  name: "",
  contact: "",
  whatsapp: "",
  email: "",
  address: "",
  logo: null,
};

export const getCompanyInfo = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultCompanyInfo, ...JSON.parse(saved) } : defaultCompanyInfo;
  } catch {
    return defaultCompanyInfo;
  }
};

export const saveCompanyInfo = (partial) => {
  const next = { ...getCompanyInfo(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};
