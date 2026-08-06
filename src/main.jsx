import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SearchProvider } from "./context/SearchContext";
import { DashboardFilterProvider } from "./context/DashboardFilterContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { getThemeConfig } from "./config/theme";
import "./assets/styles/global.css";

const AntdThemeBridge = ({ children }) => {
  const { isDark } = useTheme();
  return <ConfigProvider theme={getThemeConfig(isDark)}>{children}</ConfigProvider>;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AntdThemeBridge>
        <BrowserRouter>
          <AuthProvider>
            <SearchProvider>
              <DashboardFilterProvider>
                <App />
              </DashboardFilterProvider>
            </SearchProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntdThemeBridge>
    </ThemeProvider>
  </React.StrictMode>
);
