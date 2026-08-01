import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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

const ProtectedRoute = ({ children, roles }) => {
  const { user, userRole } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(userRole)) return <Navigate to="/" replace />;

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
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/sale-invoice" element={<ProtectedRoute><SaleInvoice /></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute><Quotation /></ProtectedRoute>} />
      <Route path="/customer-khata" element={<ProtectedRoute><CustomerKhata /></ProtectedRoute>} />
      <Route path="/daily-income" element={<ProtectedRoute><DailyReceive /></ProtectedRoute>} />
      <Route path="/supplier-ledger" element={<ProtectedRoute><SupplierLedger /></ProtectedRoute>} />
      <Route path="/purchase-invoice" element={<ProtectedRoute><PurchaseInvoice /></ProtectedRoute>} />
      <Route path="/supplier-payment" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/daily-expense" element={<ProtectedRoute><DailyExpense /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/salary" element={<ProtectedRoute><Placeholder /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
