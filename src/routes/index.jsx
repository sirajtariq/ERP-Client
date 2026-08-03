import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_ONLY, ADMIN_SALES, ADMIN_PURCHASE, USERS_ACCESS } from "@/constants/sidebarMenu.jsx";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Placeholder from "@/pages/Placeholder";
import CustomerKhata from "@/pages/CustomerKhata";
import { SaleInvoice, PurchaseInvoice } from "@/pages/Invoice";
import Quotation from "@/pages/Quotation";
import DailyExpense from "@/pages/CashFlow/DailyExpense";
import SupplierLedger from "@/pages/Supplier/SupplierLedger";
import DailyReceive from "@/pages/CashFlow/DailyReceive";

// Where to send a user who hits a route their role can't see. Must never point to a
// route that itself is role-restricted against them, or it loops (e.g. "/" is admin-only,
// so Sales/Purchase/Super Admin can't bounce there). Anything unrecognized falls back to
// "/settings", which has no role restriction, so the redirect always terminates.
const getDefaultRoute = (userRole) => {
  if (userRole === "SALES_USER") return "/sale-invoice";
  if (userRole === "PURCHASE_USER") return "/purchase-invoice";
  if (userRole === "SUPER_ADMIN") return "/users";
  if (userRole === "ADMIN") return "/";
  return "/settings";
};

const ProtectedRoute = ({ children, roles }) => {
  const { user, userRole } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(userRole)) return <Navigate to={getDefaultRoute(userRole)} replace />;

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<ProtectedRoute roles={ADMIN_ONLY}><Dashboard /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/sale-invoice" element={<ProtectedRoute roles={ADMIN_SALES}><SaleInvoice /></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute roles={ADMIN_SALES}><Quotation /></ProtectedRoute>} />
      <Route path="/customer-khata" element={<ProtectedRoute roles={ADMIN_SALES}><CustomerKhata /></ProtectedRoute>} />
      <Route path="/daily-income" element={<ProtectedRoute roles={ADMIN_SALES}><DailyReceive /></ProtectedRoute>} />
      <Route path="/supplier-ledger" element={<ProtectedRoute roles={ADMIN_PURCHASE}><SupplierLedger /></ProtectedRoute>} />
      <Route path="/purchase-invoice" element={<ProtectedRoute roles={ADMIN_PURCHASE}><PurchaseInvoice /></ProtectedRoute>} />
      <Route path="/supplier-payment" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/daily-expense" element={<ProtectedRoute roles={ADMIN_PURCHASE}><DailyExpense /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/salary" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={USERS_ACCESS}><Users /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
