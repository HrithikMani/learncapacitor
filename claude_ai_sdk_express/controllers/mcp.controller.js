// controllers/mcp.controller.js
require('dotenv').config();

// Convert MCP_SERVICES to a mutable array with additional properties
let MCP_SERVICES = [
  {
    id: 'calc-001',
    url: "http://localhost:8081/sse",
    name: "Calculator service",
    type: "math",
    enabled: true,
    description: "Mathematical calculations and operations",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'note-001', 
    url: "http://localhost:8082/sse",
    name: "Notepad service",
    type: "text",
    enabled: true,
    description: "File management and text processing",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  }
];

// Helper function to generate unique IDs
const generateId = () => {
  return 'mcp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Helper function to validate MCP service data
const validateMCPService = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.url || data.url.trim() === '') {
    errors.push('URL is required');
  }
  
  // Basic URL validation
  try {
    new URL(data.url);
  } catch (e) {
    errors.push('Invalid URL format');
  }
  
  return errors;
};

// Get all MCP services
exports.getAllServices = async (req, res) => {
  try {
    const { enabled } = req.query;
    
    let services = MCP_SERVICES;
    
    // Filter by enabled status if specified
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      services = services.filter(service => service.enabled === isEnabled);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        services,
        total: services.length,
        enabled: services.filter(s => s.enabled).length,
        disabled: services.filter(s => !s.enabled).length
      }
    });
  } catch (error) {
    console.error('Error getting MCP services:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve MCP services',
      error: error.message
    });
  }
};

// Get single MCP service by ID
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = MCP_SERVICES.find(s => s.id === id);
    
    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'MCP service not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        service
      }
    });
  } catch (error) {
    console.error('Error getting MCP service:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve MCP service',
      error: error.message
    });
  }
};

// Add new MCP service
exports.addService = async (req, res) => {
  try {
    const { name, url, type = 'general', description = '', enabled = true } = req.body;
    
    // Validate input
    const errors = validateMCPService({ name, url });
    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    // Check if URL already exists
    const existingService = MCP_SERVICES.find(s => s.url === url.trim());
    if (existingService) {
      return res.status(409).json({
        status: 'error',
        message: 'A service with this URL already exists',
        existingService: {
          id: existingService.id,
          name: existingService.name
        }
      });
    }
    
    // Create new service
    const newService = {
      id: generateId(),
      name: name.trim(),
      url: url.trim(),
      type: type.trim(),
      description: description.trim(),
      enabled: Boolean(enabled),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Add to services array
    MCP_SERVICES.push(newService);
    
    console.log(`MCP Service added: ${newService.name} (${newService.id})`);
    
    res.status(201).json({
      status: 'success',
      message: 'MCP service added successfully',
      data: {
        service: newService
      }
    });
  } catch (error) {
    console.error('Error adding MCP service:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add MCP service',
      error: error.message
    });
  }
};

// Update existing MCP service
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type, description, enabled } = req.body;
    
    // Find service
    const serviceIndex = MCP_SERVICES.findIndex(s => s.id === id);
    if (serviceIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'MCP service not found'
      });
    }
    
    const currentService = MCP_SERVICES[serviceIndex];
    
    // Prepare updated data
    const updatedData = {
      name: name?.trim() || currentService.name,
      url: url?.trim() || currentService.url,
      type: type?.trim() || currentService.type,
      description: description?.trim() || currentService.description,
      enabled: enabled !== undefined ? Boolean(enabled) : currentService.enabled
    };
    
    // Validate updated data
    const errors = validateMCPService(updatedData);
    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    // Check if new URL conflicts with other services
    if (updatedData.url !== currentService.url) {
      const conflictingService = MCP_SERVICES.find(s => s.url === updatedData.url && s.id !== id);
      if (conflictingService) {
        return res.status(409).json({
          status: 'error',
          message: 'A service with this URL already exists',
          conflictingService: {
            id: conflictingService.id,
            name: conflictingService.name
          }
        });
      }
    }
    
    // Update service
    const updatedService = {
      ...currentService,
      ...updatedData,
      lastUpdated: new Date().toISOString()
    };
    
    MCP_SERVICES[serviceIndex] = updatedService;
    
    console.log(`MCP Service updated: ${updatedService.name} (${updatedService.id})`);
    
    res.status(200).json({
      status: 'success',
      message: 'MCP service updated successfully',
      data: {
        service: updatedService
      }
    });
  } catch (error) {
    console.error('Error updating MCP service:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update MCP service',
      error: error.message
    });
  }
};

// Delete MCP service
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const serviceIndex = MCP_SERVICES.findIndex(s => s.id === id);
    if (serviceIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'MCP service not found'
      });
    }
    
    const deletedService = MCP_SERVICES[serviceIndex];
    
    // Remove from array
    MCP_SERVICES.splice(serviceIndex, 1);
    
    console.log(`MCP Service deleted: ${deletedService.name} (${deletedService.id})`);
    
    res.status(200).json({
      status: 'success',
      message: 'MCP service deleted successfully',
      data: {
        deletedService: {
          id: deletedService.id,
          name: deletedService.name
        }
      }
    });
  } catch (error) {
    console.error('Error deleting MCP service:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete MCP service',
      error: error.message
    });
  }
};

// Enable/Disable MCP service
exports.toggleService = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'enabled field is required'
      });
    }
    
    const serviceIndex = MCP_SERVICES.findIndex(s => s.id === id);
    if (serviceIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'MCP service not found'
      });
    }
    
    // Update enabled status
    MCP_SERVICES[serviceIndex] = {
      ...MCP_SERVICES[serviceIndex],
      enabled: Boolean(enabled),
      lastUpdated: new Date().toISOString()
    };
    
    const action = Boolean(enabled) ? 'enabled' : 'disabled';
    console.log(`MCP Service ${action}: ${MCP_SERVICES[serviceIndex].name} (${id})`);
    
    res.status(200).json({
      status: 'success',
      message: `MCP service ${action} successfully`,
      data: {
        service: MCP_SERVICES[serviceIndex]
      }
    });
  } catch (error) {
    console.error('Error toggling MCP service:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle MCP service',
      error: error.message
    });
  }
};

// Bulk operations
exports.bulkToggle = async (req, res) => {
  try {
    const { ids, enabled } = req.body;
    
    if (!Array.isArray(ids) || enabled === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'ids array and enabled field are required'
      });
    }
    
    const updatedServices = [];
    const notFoundIds = [];
    
    for (const id of ids) {
      const serviceIndex = MCP_SERVICES.findIndex(s => s.id === id);
      if (serviceIndex === -1) {
        notFoundIds.push(id);
        continue;
      }
      
      MCP_SERVICES[serviceIndex] = {
        ...MCP_SERVICES[serviceIndex],
        enabled: Boolean(enabled),
        lastUpdated: new Date().toISOString()
      };
      
      updatedServices.push(MCP_SERVICES[serviceIndex]);
    }
    
    const action = Boolean(enabled) ? 'enabled' : 'disabled';
    console.log(`Bulk ${action} ${updatedServices.length} MCP services`);
    
    res.status(200).json({
      status: 'success',
      message: `${updatedServices.length} MCP services ${action} successfully`,
      data: {
        updatedServices,
        notFoundIds
      }
    });
  } catch (error) {
    console.error('Error bulk toggling MCP services:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to bulk toggle MCP services',
      error: error.message
    });
  }
};

// Test MCP service connection
exports.testService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = MCP_SERVICES.find(s => s.id === id);
    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'MCP service not found'
      });
    }
    
    // Simple connectivity test
    const testStartTime = Date.now();
    
    try {
      const testResponse = await fetch(service.url, {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const responseTime = Date.now() - testStartTime;
      const isReachable = testResponse.ok || testResponse.status < 500;
      
      res.status(200).json({
        status: 'success',
        data: {
          service: {
            id: service.id,
            name: service.name,
            url: service.url
          },
          test: {
            reachable: isReachable,
            responseTime: responseTime,
            httpStatus: testResponse.status,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (testError) {
      const responseTime = Date.now() - testStartTime;
      
      res.status(200).json({
        status: 'success',
        data: {
          service: {
            id: service.id,
            name: service.name,
            url: service.url
          },
          test: {
            reachable: false,
            responseTime: responseTime,
            error: testError.message,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  } catch (error) {
    console.error('Error testing MCP service:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test MCP service',
      error: error.message
    });
  }
};

// Export the services array for use in other controllers
exports.getMCPServices = () => MCP_SERVICES;
exports.getEnabledMCPServices = () => MCP_SERVICES.filter(service => service.enabled);