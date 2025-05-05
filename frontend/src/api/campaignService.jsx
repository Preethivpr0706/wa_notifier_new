// src/api/campaignService.js
export const campaignService = {
    getCampaigns: async () => {
      try {
        const response = await apiClient.get('/campaigns');
        return response.data;
      } catch (error) {
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
    }
  };