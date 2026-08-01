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
} from "@ant-design/icons";

// roles: undefined = visible to all; array = only those roles can see it
// role values (normalized uppercase): "ADMIN", "SUPER_ADMIN", "SALES", "PURCHASE"

const ADMIN_SALES    = ["ADMIN", "SALE_PERSON"];
const ADMIN_PURCHASE = ["ADMIN", "PURCHASE_PERSON"];
const USERS_ACCESS   = ["ADMIN", "SUPER_ADMIN"];

export const SIDEBAR_MENU = [
  {
    key: "/",
    icon: <DashboardOutlined />,
    label: "Dashboard",
    roles: ["ADMIN", "SALE_PERSON", "PURCHASE_PERSON"],
  },
  {
    key: "/customer-khata",
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
    key: "/supplier-ledger",
    icon: <ShopOutlined />,
    label: "Supplier Ledger",
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
    key: "/users",
    icon: <UserSwitchOutlined />,
    label: "Users",
    roles: USERS_ACCESS,
  },
];
