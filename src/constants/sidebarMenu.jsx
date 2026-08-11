import {
  DashboardOutlined,
  FileTextOutlined,
  SolutionOutlined,
  BookOutlined,
  DollarOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  UserSwitchOutlined,
  FileDoneOutlined,
  TeamOutlined,
} from "@ant-design/icons";

// roles: undefined = visible to all; array = only those roles can see it
// role values (as resolved by the backend): "ADMIN", "SUPER_ADMIN", "SALES_USER", "PURCHASE_USER"
// SUPER_ADMIN is a user-management-only role — it sees the Users tab and nothing else.
// ADMIN is the full-access role — it sees every module, including Users.

export const ADMIN_ONLY    = ["ADMIN"];
export const ADMIN_SALES   = ["ADMIN", "SALES_USER"];
export const ADMIN_PURCHASE = ["ADMIN", "PURCHASE_USER"];
export const USERS_ACCESS  = ["ADMIN", "SUPER_ADMIN"];

export const SIDEBAR_MENU = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
    roles: ADMIN_ONLY,
  },
  {
    key: "/customers",
    icon: <BookOutlined />,
    label: "Customers",
    roles: ADMIN_SALES,
  },
  {
    key: "invoices",
    icon: <FileDoneOutlined />,
    label: "Invoices",
    children: [
      {
        key: "/sale-invoice",
        icon: <FileTextOutlined />,
        label: "Sale Invoice",
        roles: ADMIN_SALES,
      },
      {
        key: "/purchase-invoice",
        icon: <ShoppingCartOutlined />,
        label: "Purchase Invoice",
        roles: ADMIN_PURCHASE,
      },
    ],
  },
  {
    key: "/quotations",
    icon: <SolutionOutlined />,
    label: "Quotations",
    roles: ADMIN_SALES,
  },
  {
    key: "/vendor-ledger",
    icon: <ShopOutlined />,
    label: "Vendor Ledger",
    roles: ADMIN_PURCHASE,
  },
  {
    key: "cashflow",
    icon: <WalletOutlined />,
    label: "Cash Flow",
    children: [
      {
        key: "/daily-income",
        icon: <DollarOutlined />,
        label: "Daily Income",
        roles: ADMIN_SALES,
      },
      {
        key: "/daily-expense",
        icon: <WalletOutlined />,
        label: "Daily Expense",
        roles: ADMIN_PURCHASE,
      },
    ],
  },
  {
    key: "/employees",
    icon: <TeamOutlined />,
    label: "Employees",
    roles: ADMIN_ONLY,
  },
  {
    key: "/users",
    icon: <UserSwitchOutlined />,
    label: "Users",
    roles: USERS_ACCESS,
  },
];
