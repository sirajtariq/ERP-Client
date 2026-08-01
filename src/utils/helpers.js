import { CURRENCY } from "@/constants";

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getBalanceColor = (type) => {
  switch (type) {
    case "receive":
      return "#52c41a";
    case "pay":
      return "#ff4d4f";
    case "settled":
      return "#8c8c8c";
    default:
      return "#262626";
  }
};

export const getTransactionColor = (type) => {
  return type === "credit" ? "#52c41a" : "#ff4d4f";
};
