import { createContext, useContext, useState, useEffect } from "react";
import authService from "@/services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = authService.getCurrentUser();
    if (savedUser && authService.isAuthenticated()) {
      setUser(savedUser);
    } else if (savedUser && !authService.isAuthenticated()) {
      authService.refreshToken()
        .then(() => setUser(savedUser))
        .catch(() => {
          authService.logout();
          setUser(null);
        });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const result = await authService.login(username, password);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const rawRole = user?.role || user?.roles?.[0] || "";
  const userRole = rawRole.toUpperCase().replace(/-/g, "_");

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
