import { Typography } from "antd";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/common";

const { Text } = Typography;

const pageTitles = {
  "/stock": "Stock",
  "/sale-invoice": "Sale Invoice",
  "/quotations": "Quotations",
  "/customers": "Customers",
  "/daily-income": "Daily Income",
  "/vendor-ledger": "Vendor Ledger",
  "/purchase-invoice": "Purchase Invoice",
  "/supplier-payment": "Vendor Payment",
  "/daily-expense": "Daily Expense",
  "/employees": "Employees",
  "/salary": "Salary",
};

const Placeholder = () => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Page";

  return (
    <div>
      <PageHeader title={title} subtitle="Coming soon" />
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Text style={{ color: "#94a3b8", fontSize: 16 }}>
          This module is under development.
        </Text>
      </div>
    </div>
  );
};

export default Placeholder;
