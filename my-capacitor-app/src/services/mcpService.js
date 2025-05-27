

const API_BASE_URL = 'http://localhost:3000/api/mcp';
const API_KEY = 'HrithikApiKey'; // Move to .env file in a real app

// API headers
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

const mcpService = {
  // Get all MCP services
  getAllServices: async (enabledOnly = false) => {
    try {
      const url = enabledOnly 
        ? `${API_BASE_URL}/services?enabled=true`
        : `${API_BASE_URL}/services`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch MCP services');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - getAllServices:', error);
      throw error;
    }
  },

  // Get single MCP service by ID
  getServiceById: async (serviceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch MCP service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - getServiceById:', error);
      throw error;
    }
  },

  // Add new MCP service
  addService: async (serviceData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers,
        body: JSON.stringify(serviceData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add MCP service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - addService:', error);
      throw error;
    }
  },

  // Update existing MCP service
  updateService: async (serviceId, updateData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update MCP service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - updateService:', error);
      throw error;
    }
  },

  // Toggle MCP service (enable/disable)
  toggleService: async (serviceId, enabled) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/toggle`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle MCP service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - toggleService:', error);
      throw error;
    }
  },

  // Bulk toggle services
  bulkToggle: async (serviceIds, enabled) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/bulk/toggle`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ ids: serviceIds, enabled }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to bulk toggle MCP services');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - bulkToggle:', error);
      throw error;
    }
  },

  // Delete MCP service
  deleteService: async (serviceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete MCP service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - deleteService:', error);
      throw error;
    }
  },

  // Test MCP service connection
  testService: async (serviceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/test`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to test MCP service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - testService:', error);
      throw error;
    }
  },

  // Get MCP system status
  getSystemStatus: async () => {
    try {
      const response = await fetch('http://localhost:3000/mcp-status', {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get MCP system status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('MCP Service Error - getSystemStatus:', error);
      throw error;
    }
  }
};

export default mcpService;