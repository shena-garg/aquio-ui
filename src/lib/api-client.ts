import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token to every request automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling — only redirect to /login on 401 when a session token
// exists (expired/invalid session). Public auth endpoints (forgot password,
// set password, verify code) return 401 for wrong credentials and should
// show an inline error, not redirect.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasToken = !!localStorage.getItem("accessToken");
    if (error.response?.status === 401 && hasToken) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;