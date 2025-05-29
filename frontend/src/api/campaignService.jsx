// src/api/campaignService.js
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
export const campaignService = {
   getCampaigns: async (filters = {}) => {
      try {
        console.log('Fetching campaigns with filters:', filters);
        const response = await apiClient.get('/campaigns', {
          params: filters
        });
        console.log('Campaigns response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error in campaignService.getCampaigns:', error);
        throw new Error(error.response?.data?.message || 'Failed to fetch campaigns');
      }
    },
    
    getCampaignById: async (id) => {
      try {
        const response = await apiClient.get(`/campaigns/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch campaign');
      }
    },
    
    deleteCampaign: async (id) => {
      try {
        const response = await apiClient.delete(`/campaigns/${id}`);
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to delete campaign');
      }
    },
     updateCampaign: async (id, data) => {
        try {
            const response = await apiClient.put(`/campaigns/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to update campaign');
        }
    },
    // Add this method to campaignService
getCampaignWithStats: async (id) => {
    try {
        const response = await apiClient.get(`/campaigns/${id}/stats`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch campaign with stats');
    }
},
getCampaignRecipients: async (id, filters = {}) => {
    try {
        const response = await apiClient.get(`/campaigns/${id}/recipients`, {
            params: filters
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch campaign recipients');
    }
},
  };