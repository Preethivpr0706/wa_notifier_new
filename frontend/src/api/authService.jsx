// src/api/authService.js
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      authService.logout();
      window.location.href = '/login'; // Force full page reload to clear state
    }
    return Promise.reject(error);
  }
);

export const authService = {
    login: async (credentials) => {
        try {
            const response = await apiClient.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
 logout: async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // First clear the storage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.clear();

                // Then make the logout request
                await apiClient.post('/auth/logout', {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear storage even if request fails
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
        }
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};
