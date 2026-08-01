import api, { setTokens, clearAllStorage, getTokens, STORAGE_PREFIX } from "./api";
import { saveCompanyInfo } from "@/utils/companyInfoStore";
import { normalizeBusinessSettings } from "./settingsService";

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const authService = {
  login: async (username, password) => {
    const response = await api.post("/auth/login/", { username, password });
    const { access, refresh, role, username: uname, user: profile, company } = response.data;

    setTokens({ access, refresh });

    const userRole = profile?.role || role || "";
    const user = {
      ...profile,
      username: profile?.username || uname,
      name: profile?.fullname || profile?.username || uname,
      role: userRole,
      roles: userRole ? [userRole] : [],
    };

    localStorage.setItem(`${STORAGE_PREFIX}user`, JSON.stringify(user));

    if (company) {
      saveCompanyInfo(normalizeBusinessSettings(company));
    }

    return { user, tokens: { access, refresh } };
  },

  logout: async () => {
    const tokens = getTokens();
    try {
      if (tokens?.refresh) {
        await api.post("/auth/logout/", { refresh: tokens.refresh });
      }
    } catch {
      // silent — don't block logout if API fails
    } finally {
      clearAllStorage();
    }
  },

  refreshToken: async () => {
    const tokens = getTokens();
    if (!tokens?.refresh) throw new Error("No refresh token");

    const response = await api.post("/auth/login/refresh/", {
      refresh: tokens.refresh,
    });

    const newTokens = {
      access: response.data.access,
      refresh: response.data.refresh || tokens.refresh,
    };

    setTokens(newTokens);
    return newTokens;
  },

  getCurrentUser: () => {
    const user = localStorage.getItem(`${STORAGE_PREFIX}user`);
    return user ? JSON.parse(user) : null;
  },

  getTokens,

  isAuthenticated: () => {
    const tokens = getTokens();
    if (!tokens?.access) return false;

    const decoded = decodeToken(tokens.access);
    if (!decoded?.exp) return false;

    return decoded.exp * 1000 > Date.now();
  },

  hasRole: (role) => {
    const user = authService.getCurrentUser();
    return user?.roles?.includes(role) || false;
  },

  isSuperAdmin: () => {
    return authService.hasRole("Superuser");
  },
};

export default authService;
