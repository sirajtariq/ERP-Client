import { createContext, useContext, useState } from "react";

const DashboardFilterContext = createContext(null);

export const DashboardFilterProvider = ({ children }) => {
  const [dateRange, setDateRange] = useState([null, null]);
  return (
    <DashboardFilterContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DashboardFilterContext.Provider>
  );
};

export const useDashboardFilter = () => useContext(DashboardFilterContext);
