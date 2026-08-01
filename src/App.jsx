import { Spin } from "antd";
import MainLayout from "./components/layout/MainLayout";
import AppRoutes from "./routes";
import { useAuth } from "./context/AuthContext";

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <AppRoutes />;
  }

  return (
    <MainLayout>
      <AppRoutes />
    </MainLayout>
  );
};

export default App;
