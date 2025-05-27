// examples/mcp-api-examples.js
// Example usage of the MCP Management API

const API_BASE_URL = 'http://localhost:3000/api/mcp';
const API_KEY = 'HrithikApiKey'; // Your API key

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

// Example functions for each MCP API endpoint

async function getAllMCPServices() {
  console.log('\n=== Getting All MCP Services ===');
  try {
    const response = await fetch(`${API_BASE_URL}/services`, { headers });
    const data = await response.json();
    console.log('All services:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function getEnabledMCPServices() {
  console.log('\n=== Getting Enabled MCP Services ===');
  try {
    const response = await fetch(`${API_BASE_URL}/services?enabled=true`, { headers });
    const data = await response.json();
    console.log('Enabled services:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function addNewMCPService() {
  console.log('\n=== Adding New MCP Service ===');
  try {
    const newService = {
      name: "Weather Service",
      url: "http://localhost:8083/sse",
      type: "weather",
      description: "Provides weather information and forecasts",
      enabled: true
    };
    
    const response = await fetch(`${API_BASE_URL}/services`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newService)
    });
    
    const data = await response.json();
    console.log('Added service:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function updateMCPService(serviceId) {
  console.log('\n=== Updating MCP Service ===');
  try {
    const updates = {
      description: "Updated weather service with enhanced features",
      enabled: false
    };
    
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    console.log('Updated service:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function toggleMCPService(serviceId, enabled) {
  console.log(`\n=== ${enabled ? 'Enabling' : 'Disabling'} MCP Service ===`);
  try {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/toggle`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ enabled })
    });
    
    const data = await response.json();
    console.log(`Service ${enabled ? 'enabled' : 'disabled'}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function bulkToggleMCPServices(serviceIds, enabled) {
  console.log(`\n=== Bulk ${enabled ? 'Enabling' : 'Disabling'} MCP Services ===`);
  try {
    const response = await fetch(`${API_BASE_URL}/services/bulk/toggle`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ids: serviceIds, enabled })
    });
    
    const data = await response.json();
    console.log(`Bulk ${enabled ? 'enabled' : 'disabled'}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testMCPService(serviceId) {
  console.log('\n=== Testing MCP Service Connection ===');
  try {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/test`, { headers });
    const data = await response.json();
    console.log('Test result:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function deleteMCPService(serviceId) {
  console.log('\n=== Deleting MCP Service ===');
  try {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
      method: 'DELETE',
      headers
    });
    
    const data = await response.json();
    console.log('Deleted service:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testChatWithMCPTools() {
  console.log('\n=== Testing Chat with MCP Tools ===');
  try {
    const response = await fetch('http://localhost:3000/api/claude/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: "Calculate 15 * 24 and then create a note with the result",
        useTools: true,
        maxTokens: 1000
      })
    });
    
    const data = await response.json();
    console.log('Chat response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Main demonstration function
async function demonstrateMCPAPI() {
  console.log('🚀 MCP Management API Demonstration\n');
  
  try {
    // 1. Get all services initially
    const allServices = await getAllMCPServices();
    
    // 2. Get only enabled services
    await getEnabledMCPServices();
    
    // 3. Add a new service
    const newService = await addNewMCPService();
    const newServiceId = newService?.data?.service?.id;
    
    if (newServiceId) {
      // 4. Test the new service connection
      await testMCPService(newServiceId);
      
      // 5. Update the service
      await updateMCPService(newServiceId);
      
      // 6. Toggle service off
      await toggleMCPService(newServiceId, false);
      
      // 7. Toggle service back on
      await toggleMCPService(newServiceId, true);
      
      // 8. Test bulk operations (disable multiple services)
      const existingServiceIds = allServices?.data?.services?.map(s => s.id) || [];
      if (existingServiceIds.length > 0) {
        await bulkToggleMCPServices([...existingServiceIds, newServiceId], false);
        await bulkToggleMCPServices([...existingServiceIds, newServiceId], true);
      }
      
      // 9. Test chat with tools
      await testChatWithMCPTools();
      
      // 10. Clean up - delete the test service
      await deleteMCPService(newServiceId);
    }
    
    console.log('\n✅ MCP API demonstration completed!');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// CURL command examples for testing
function printCurlExamples() {
  console.log('\n=== CURL Examples ===\n');
  
  console.log('1. Get all MCP services:');
  console.log(`curl -X GET "${API_BASE_URL}/services" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}"\n`);
  
  console.log('2. Add new MCP service:');
  console.log(`curl -X POST "${API_BASE_URL}/services" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}" \\
  -d '{
    "name": "Test Service",
    "url": "http://localhost:8084/sse",
    "type": "test",
    "description": "A test service",
    "enabled": true
  }'\n`);
  
  console.log('3. Toggle service (replace SERVICE_ID):');
  console.log(`curl -X PATCH "${API_BASE_URL}/services/SERVICE_ID/toggle" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}" \\
  -d '{"enabled": false}'\n`);
  
  console.log('4. Test service connection:');
  console.log(`curl -X GET "${API_BASE_URL}/services/SERVICE_ID/test" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}"\n`);
  
  console.log('5. Delete service:');
  console.log(`curl -X DELETE "${API_BASE_URL}/services/SERVICE_ID" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}"\n`);
}

// Export functions for use in other scripts
module.exports = {
  getAllMCPServices,
  getEnabledMCPServices,
  addNewMCPService,
  updateMCPService,
  toggleMCPService,
  bulkToggleMCPServices,
  testMCPService,
  deleteMCPService,
  testChatWithMCPTools,
  demonstrateMCPAPI,
  printCurlExamples
};

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateMCPAPI();
}