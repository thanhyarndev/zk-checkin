import axios from "axios";

// Configure axios base URL to point to your Flask backend
const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// API endpoints
export const attendanceAPI = {
  getAll: () => api.get("/api/attendance"),
  getToday: () => api.get("/api/attendance/today"),
  clearToday: () => api.post("/api/attendance/clear_today"),
};

export const employeesAPI = {
  getAll: () => api.get("/api/employees"),
  getById: (id: number) => api.get(`/api/employees/${id}`),
  create: (data: any) => api.post("/api/employees", data),
  update: (id: number, data: any) => api.put(`/api/employees/${id}`, data),
  delete: (id: number) => api.delete(`/api/employees/${id}`),
};

export const tagsAPI = {
  getAll: () => api.get("/api/tags"),
  getById: (id: number) => api.get(`/api/tags/${id}`),
  create: (data: any) => api.post("/api/tags", data),
  update: (id: number, data: any) => api.put(`/api/tags/${id}`, data),
  delete: (id: number) => api.delete(`/api/tags/${id}`),
};

export const logsAPI = {
  getAll: () => api.get("/api/logs"),
  getRecent: (limit: number = 100) => api.get(`/api/logs?limit=${limit}`),
  clear: () => api.delete("/api/logs"),
  export: () => api.get("/api/logs/export"),
};

export const configAPI = {
  get: () => api.get("/api/config"),
  update: (data: any) => api.post("/api/config", data),
};

// Reader Control APIs
export const readerAPI = {
  getStatus: () => axios.get(`${API_BASE_URL}/api/reader/status`),
  start: () => axios.post(`${API_BASE_URL}/api/reader/start`),
  stop: () => axios.post(`${API_BASE_URL}/api/reader/stop`),
};

export default api;
