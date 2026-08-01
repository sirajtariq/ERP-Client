import { theme as antdTheme } from "antd";

const sharedToken = {
  colorPrimary: "#7c5cfc",
  colorSuccess: "#22c55e",
  colorWarning: "#f59e0b",
  colorError: "#ef4444",
  colorInfo: "#3b82f6",
  borderRadius: 10,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
};

const sharedComponents = {
  Menu: {
    itemBorderRadius: 10,
    itemMarginInline: 8,
    itemHeight: 42,
    itemSelectedBg: "#f0ecff",
    itemSelectedColor: "#7c5cfc",
    itemHoverBg: "#f7f5ff",
    itemColor: "#64748b",
    activeBarBorderWidth: 0,
  },
  Button: {
    borderRadius: 10,
    controlHeight: 38,
    primaryShadow: "0 2px 8px rgba(124, 92, 252, 0.25)",
  },
  Input: {
    borderRadius: 10,
    controlHeight: 40,
    activeBorderColor: "#7c5cfc",
    hoverBorderColor: "#b4a5fd",
    activeShadow: "0 0 0 3px rgba(124, 92, 252, 0.08)",
  },
  Select: {
    borderRadius: 10,
    controlHeight: 40,
  },
  Card: {
    borderRadiusLG: 14,
  },
  Modal: {
    borderRadiusLG: 16,
  },
  Tag: {
    borderRadiusSM: 6,
  },
};

export const getThemeConfig = (isDark) => ({
  algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: isDark
    ? sharedToken
    : {
        ...sharedToken,
        colorText: "#1e293b",
        colorTextSecondary: "#64748b",
        colorBgContainer: "#ffffff",
        colorBgLayout: "#f4f6fb",
        colorBorder: "#e9ecf2",
        colorBorderSecondary: "#f1f3f8",
      },
  components: {
    ...sharedComponents,
    Layout: isDark
      ? {}
      : { bodyBg: "#f4f6fb", siderBg: "#ffffff", headerBg: "#ffffff" },
    Table: isDark
      ? {}
      : { headerBg: "#fafbfd", headerColor: "#475569", rowHoverBg: "#f8f7ff", borderColor: "#f1f3f8" },
  },
});
