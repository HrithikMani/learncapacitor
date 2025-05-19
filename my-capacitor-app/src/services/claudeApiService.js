// src/services/claudeApiService.js

const API_BASE_URL = 'http://localhost:3000/api/claude'; // Change this to your API URL
const API_KEY = 'HrithikApiKey'; // Move to .env file in a real app

// API headers
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

const claudeApiService = {
  // Chat with Claude
  sendMessage: async (sessionId, prompt, model = 'claude-3-7-sonnet-20250219') => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          prompt,
          model,
          maxTokens: 1000,
          temperature: 0.7
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Get conversation history
  getHistory: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Clear conversation history
  clearHistory: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Get all conversations
  getAllConversations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get conversations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Update conversation title
  updateTitle: async (sessionId, title) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/title`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update title');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Delete conversation
  deleteConversation: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete conversation');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Create a new conversation (without sending a message)
  createConversation: async (title) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

export default claudeApiService;