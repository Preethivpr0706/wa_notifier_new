// src/api/authService.js
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Define auth service first
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
            
            // Dispatch custom event to notify components
            window.dispatchEvent(new CustomEvent('auth:logout'));
            
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear storage even if request fails
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            
            // Dispatch event even on error
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        // Optional: Check if token is expired client-side
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            if (payload.exp < currentTime) {
                // Token is expired, clean up
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.clear();
                return false;
            }
            return true;
        } catch (error) {
            // Invalid token format
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            return false;
        }
    },

    // Method to handle automatic logout
    handleAuthError: () => {
        authService.logout();
        // Force navigation to login
        window.location.href = '/login';
    }
};

// Set up interceptor AFTER authService is defined
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('401 error detected, handling auth error');
            // Use the method instead of calling logout directly
            authService.handleAuthError();
        }
        return Promise.reject(error);
    }
);

export { apiClient };