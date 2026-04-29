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

// These endpoints return 401 for wrong credentials / wrong code — not session expiry.
// A 401 from them must never trigger the global logout redirect.
const AUTH_ACTION_ENDPOINTS = [
  "/users/login",
  "/users/verify-code",
  "/users/resend-verification",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/set-password",
];

// Redirect to /login on 401 only when a session token exists AND the request
// was not to an auth-action endpoint (where 401 means "wrong credentials").
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasToken = !!localStorage.getItem("accessToken");
    const requestUrl: string = error.config?.url ?? "";
    const isAuthAction = AUTH_ACTION_ENDPOINTS.some((path) =>
      requestUrl.includes(path),
    );
    if (error.response?.status === 401 && hasToken && !isAuthAction) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
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