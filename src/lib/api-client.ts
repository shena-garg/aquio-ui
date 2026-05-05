import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

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

// These endpoints return 401 for wrong credentials / wrong code — not session expiry.
// A 401 from them must never trigger silent refresh or the global logout redirect.
const AUTH_ACTION_ENDPOINTS = [
  "/users/login",
  "/users/verify-code",
  "/users/resend-verification",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/set-password",
];

// Silent token refresh — one in-flight refresh at a time; concurrent 401s queue up.
let isRefreshing = false;
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null) {
  for (const entry of refreshQueue) {
    if (error) entry.reject(error);
    else entry.resolve(token!);
  }
  refreshQueue = [];
}

function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl: string = error.config?.url ?? "";
    const isAuthAction = AUTH_ACTION_ENDPOINTS.some((path) =>
      requestUrl.includes(path),
    );

    if (error.response?.status !== 401 || isAuthAction) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (originalRequest._retry) {
      clearSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${baseURL}/auth/refresh`,
        { refreshToken },
      );
      const { accessToken, refreshToken: newRefreshToken } = res.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      processQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function uploadFile(
  file: File,
): Promise<{ id: string; name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<{ id: string; name: string }>(
    "/files/upload",
    formData,
    {
      transformRequest: (data, headers) => {
        if (headers) delete (headers as Record<string, string>)["Content-Type"];
        return data;
      },
    },
  );
  return res.data;
}

export default apiClient;