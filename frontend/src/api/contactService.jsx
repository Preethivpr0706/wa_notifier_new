// src/api/contactService.js
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with authorization header
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add authorization token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const contactService = {
    createContact: async (contactData) => {
        try {
            const response = await apiClient.post('/contacts', contactData);
            return response.data;
        } catch (error) {
            console.error('API Error - createContact:', error.response?.data || error.message);
            throw error;
        }
    },

    createList: async (listData) => {
        try {
            const response = await apiClient.post('/contacts/lists', listData);
            return response.data;
        } catch (error) {
            console.error('API Error - createList:', error.response?.data || error.message);
            throw error;
        }
    },

    getLists: async () => {
        try {
            const response = await apiClient.get('/contacts/lists');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getListsForSending: async () => {
        try {
            const response = await apiClient.get('/contacts/sendLists');
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || error.message;
        }
    },

    importContacts: async (formData) => {
        try {
            const response = await apiClient.post('/contacts/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data.message || 
                              error.response.data.error || 
                              'Import failed with status ' + error.response.status);
            } else if (error.request) {
                throw new Error('No response received from server');
            } else {
                throw new Error('Error setting up request: ' + error.message);
            }
        }
    },

    getContacts: async (listId) => {
        try {
            const params = listId ? { listId } : {};
            const response = await apiClient.get('/contacts', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateContact: async (id, contactData) => {
        try {
            const response = await apiClient.put(`/contacts/${id}`, contactData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteContact: async (id) => {
        try {
            const response = await apiClient.delete(`/contacts/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
    checkListNameAvailability: async (listName) => {
           try {
        const response = await apiClient.get(`/contacts/check-list-name?listName=${encodeURIComponent(listName)}`);
        return response.data;
          } catch (error) {
            throw error.response?.data || error.message;
        }
    },
};

export default contactService;
