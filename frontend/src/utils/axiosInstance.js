import axios from "axios";
import { BASE_URL } from "./apiPaths";

// Allow overriding the API base URL from Vite env (useful for mobile testing)
const baseURL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : BASE_URL;

const axiosInstance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});


// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle common errors globally and improve logging for debugging (esp. mobile)
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          // Redirect to login page
          window.location.href = "/login";
        } else if (status === 500) {
          console.error("Server error (500). Please try again later.", error.response.data);
        } else {
          console.error("API error:", status, error.response.data);
        }
      } else if (error.code === "ECONNABORTED") {
        console.error("Request timeout. Please try again.");
      } else {
        // Network errors, CORS issues, DNS failures, etc.
        console.error("Network or CORS error:", error.message);
      }
      return Promise.reject(error);
    }
  );
  
  export default axiosInstance;
  