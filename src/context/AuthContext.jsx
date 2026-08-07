import { createContext, useContext, useState, useEffect } from "react";
import authService from "@/services/authService";
import { clearAllStorage, STORAGE_PREFIX } from "@/services/api";

const SESSION_KEY = `${STORAGE_PREFIX}session`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionActive = sessionStorage.getItem(SESSION_KEY);
    const hasStoredAuth = !!localStorage.getItem(`${STORAGE_PREFIX}tokens`);

    // Browser/tab was closed without logout — stale auth detected
    if (!sessionActive && hasStoredAuth) {
      clearAllStorage();
      setLoading(false);
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "1");

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
    sessionStorage.setItem(SESSION_KEY, "1");
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
