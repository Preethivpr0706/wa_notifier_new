// src/api/templateService.js
import axios from 'axios';

const API_URL =  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with authorization header
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization token to requests
apiClient.interceptors.request.use(
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

// Template API services
export const templateService = {
   // Create upload session for media files
   // In templateService.js
createUploadSession: async (fileInfo) => {
  try {
      console.log('Creating upload session with info:', fileInfo);
      const response = await apiClient.post('/templates/media/create-session', fileInfo);
      console.log('Upload session response:', response);
      
      // Verify the response structure
      if (!response?.data?.data?.id) {
          console.error('Invalid response structure:', response);
          throw new Error('Invalid response from upload session creation');
      }
      
      return response;
  } catch (error) {
      console.error('Upload session creation error:', error.response || error);
      throw new Error(error.response?.data?.message || 'Failed to create upload session');
  }
},

  
 // api/templateService.js
uploadFileToSession: async (sessionId, formData, onUploadProgress) => {
  try {
      const response = await apiClient.post(
          `/templates/media/upload/${encodeURIComponent(sessionId)}`, 
          formData,
          {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
              onUploadProgress
          }
      );
      
      if (!response.data.success) {
          throw new Error(response.data.message || 'Upload failed');
      }
      
      return response;
  } catch (error) {
      console.error('Upload error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to upload file');
  }
},
  // Get all templates
  getTemplates: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);
      
      const response = await apiClient.get(`/templates?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch templates');
    }
  },
  
  // Get template by ID
  getTemplateById: async (id) => {
    try {
      const response = await apiClient.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch template');
    }
  },
  
  // Create new template and submit for approval
  createTemplate: async (templateData) => {
    try {
      const response = await apiClient.post('/templates', templateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create template');
    }
  },
  
  // Save template as draft
 // Update saveAsDraft to handle document headers
saveAsDraft: async (templateData) => {
  try {
    const response = await apiClient.post('/templates/draft', {
      ...templateData,
      header_type: templateData.headerType,
      header_content: templateData.headerContent,
      body_text: templateData.bodyText,
      footer_text: templateData.footerText,
      variables: templateData.variableSamples
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to save draft');
  }
},
  
  // Update existing template

updateTemplate: async (id, templateData) => {
  try {
    // Ensure we're sending the correct data structure
    const payload = {
      name: templateData.name,
      category: templateData.category,
      language: templateData.language,
      headerType: templateData.headerType,
      headerContent: templateData.headerContent,
      headerText: templateData.headerText,
      bodyText: templateData.bodyText,
      footerText: templateData.footerText,
      buttons: templateData.buttons,
      variableSamples: templateData.variableSamples,
      status: templateData.status
    };

    const response = await apiClient.put(`/templates/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('Update template error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to update template');
  }
},
  
  // Delete template
  deleteTemplate: async (id) => {
    try {
      const response = await apiClient.delete(`/templates/${id}`);
      return {
        success: true,
        message: response.data?.message || 'Template deleted successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete template',
        error: error
      };
    }
  },
  
  // Submit template for approval
  submitForApproval: async (id) => {
    try {
      const response = await apiClient.post(`/templates/${id}/submit`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit template for approval');
    }
  },
  // Add this to templateService
submitDraftTemplate: async (templateId) => {
  try {
    const response = await apiClient.post(`/templates/${templateId}/submit-draft`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to submit draft template');
  }
},
// Add this method
// Update updateDraftTemplate
updateDraftTemplate: async (templateId, templateData) => {
  try {
    const response = await apiClient.put(`/templates/draft/${templateId}`, {
      ...templateData,
      header_type: templateData.headerType,
      header_content: templateData.headerContent,
      body_text: templateData.bodyText,
      footer_text: templateData.footerText,
      variables: templateData.variableSamples
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update draft template');
  }
},
// In templateService.js
checkTemplateStatus: async (templateId) => {
  try {
    const response = await apiClient.get(`/templates/${templateId}/check-status`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to check template status');
  }
},
sendMessages: async (payload) => {
  try {
    const response = await apiClient.post('/templates/send-messages', payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send messages');
  }
},
 // Add this new method for WhatsApp media upload
 uploadMediaToWhatsApp: async (file, templateId, headerType) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', templateId);
    formData.append('headerType', headerType);

    const response = await apiClient.post(
      '/templates/upload-media', 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Media upload error:', error.response?.data || error);
    throw new Error(
      error.response?.data?.message || 
      'Failed to upload media to WhatsApp'
    );
  }
},

};

export default templateService;