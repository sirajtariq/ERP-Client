import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const STORAGE_PREFIX = "lenden_";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const getTokens = () => {
  const tokens = localStorage.getItem(`${STORAGE_PREFIX}tokens`);
  return tokens ? JSON.parse(tokens) : null;
};

const setTokens = (tokens) => {
  localStorage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify(tokens));
};

const clearAllStorage = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));

  Object.keys(sessionStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => sessionStorage.removeItem(key));
};

api.interceptors.request.use(
  (config) => {
    const tokens = getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const tokens = getTokens();

      if (!tokens?.refresh) {
        clearAllStorage();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/login/refresh/`, {
          refresh: tokens.refresh,
        });

        const newTokens = {
          access: response.data.access,
          refresh: response.data.refresh || tokens.refresh,
        };

        setTokens(newTokens);
        processQueue(null, newTokens.access);

        originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAllStorage();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { getTokens, setTokens, clearAllStorage, STORAGE_PREFIX };
export default api;
