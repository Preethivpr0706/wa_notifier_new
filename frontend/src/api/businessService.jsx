import axios from 'axios';

const API_URL =
    import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth interceptor as in your templateService
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const businessService = {
    getBusinessDetails: async () => {
        try {
          const response = await apiClient.get('/business');
          return response.data;
        } catch (error) {
          console.error('Error fetching business details:', error);
          // Return default business if API fails
          return {
            success: true,
            data: {
              name: 'Your Business',
              profile_image_url: null
            }
          };
        }
      },

    updateBusinessDetails: async(data) => {
        const response = await apiClient.put('/business', data);
        return response.data;
    },

    uploadProfileImage: async(formData) => {
        const response = await apiClient.post(
            '/business/upload-profile-image',
            formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data;
    }
};

export default businessService;