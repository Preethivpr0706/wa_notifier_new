import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL  || 'http://localhost:5000/api';

export const createContact = async (contactData) => {
    try {
      const response = await axios.post(`${API_URL}/contacts`, contactData);
      return response.data;
    } catch (error) {
      console.error('API Error - createContact:', error.response?.data || error.message);
      throw error;
    }
  };
  
  export const createList = async (listData) => {
    try {
      const response = await axios.post(`${API_URL}/contacts/lists`, listData);
      return response.data;
    } catch (error) {
      console.error('API Error - createList:', error.response?.data || error.message);
      throw error;
    }
  };
export const getLists = async () => {
    try {
        const response = await axios.get(`${API_URL}/contacts/lists`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getListsForSending = async () => {
  try {
    const response = await axios.get(`${API_URL}/contacts/sendLists`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};


export const importContacts = async (formData) => {
    try {
        const response = await axios.post(`${API_URL}/contacts/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        // Enhanced error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            throw new Error(error.response.data.message || 
                          error.response.data.error || 
                          'Import failed with status ' + error.response.status);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response received from server');
        } else {
            // Something happened in setting up the request
            throw new Error('Error setting up request: ' + error.message);
        }
    }
};

export const getContacts = async (listId) => {
    try {
        const params = listId ? { listId } : {};
        const response = await axios.get(`${API_URL}/contacts`, { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const updateContact = async (id, contactData) => {
    try {
        const response = await axios.put(`${API_URL}/contacts/${id}`, contactData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const deleteContact = async (id) => {
    try {
        const response = await axios.delete(`${API_URL}/contacts/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};