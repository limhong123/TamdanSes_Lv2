import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_URL?.trim();

if (!apiBaseUrl) {
  console.error(
    "VITE_API_URL is missing. Requests will use the local fallback.",
  );
}

const api = axios.create({
  baseURL:
    apiBaseUrl ||
    "http://127.0.0.1:8000",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    const fullUrl =
      `${config.baseURL ?? ""}` +
      `${config.url ?? ""}`;

    console.log(
      `[API ${config.method?.toUpperCase()}]`,
      fullUrl,
      config.params ?? config.data ?? "",
    );

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "API RESPONSE ERROR:",
      {
        url:
          `${error.config?.baseURL ?? ""}` +
          `${error.config?.url ?? ""}`,
        method:
          error.config?.method,
        status:
          error.response?.status,
        data:
          error.response?.data,
      },
    );

    return Promise.reject(error);
  },
);

export default api;