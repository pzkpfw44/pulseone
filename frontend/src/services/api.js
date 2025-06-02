import axios from 'axios';

// Read the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create main axios instance for general API calls
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token from local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Specialized API services for Pulse One
const settingsApi = {
  getAiConfiguration: () => api.get('/settings/ai-configuration'),
  updateAiConfiguration: (data) => api.put('/settings/ai-configuration', data)
};

// Export all API services
export { settingsApi };

// Default export for backward compatibility
export default api;