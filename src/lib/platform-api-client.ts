import axios from "axios";

// Separate axios instance for platform admin API calls.
// Uses platformAccessToken stored in localStorage (separate from B2B accessToken).
const platformApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

platformApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("platformAccessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

platformApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("platformAccessToken");
      localStorage.removeItem("platformRefreshToken");
      window.location.href = "/platform/login";
    }
    return Promise.reject(error);
  },
);

export default platformApiClient;
