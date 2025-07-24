import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  console.log(config);
  return config;
});

// Add response interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      authService.logout();
    }
    return Promise.reject(error);
  }
);

export const conversationService = {
  listConversations: async (status = null, page = 1) => {
    try {
      const params = { page };
      if (status && status !== 'all') {
        params.status = status;
      }
      
      const response = await apiClient.get('/conversations', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch conversations');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  getConversation: async (conversationId) => {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  getConversationMessages: async (conversationId, businessId) => {
  try {
    const response = await apiClient.get(
      `/conversations/${conversationId}/messages`,
      { params: { businessId } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
},

  sendMessage: async (conversationId, messageData) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/messages`,
        messageData
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send message');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data);
      throw error.response?.data || error;
    }
  },

 closeConversation: async (conversationId) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/close`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to close conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error closing conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  archiveConversation: async (conversationId) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/archive`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to archive conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error archiving conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  reopenConversation: async (conversationId) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/reopen`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to reopen conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error reopening conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  getConversationStats: async () => {
    try {
      const response = await apiClient.get('/conversations/stats/overview');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch conversation stats');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation stats:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  uploadFile: async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to upload file');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error uploading file:', error.response?.data);
    throw error.response?.data || error;
  }
},

sendFileMessage: async (conversationId, fileId, caption = '') => {
  try {
    const response = await apiClient.post(
      `/files/conversations/${conversationId}/send-file`,
      { fileId, caption }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to send file message');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error sending file message:', error.response?.data);
    throw error.response?.data || error;
  }
}

};

export default conversationService;