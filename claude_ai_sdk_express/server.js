// Load environment variables at the very beginning
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Try to import the database connector, but don't fail if it's not available
let connectDB = null;
try {
  connectDB = require('./config/database');
} catch (err) {
  console.warn('MongoDB connection module not available, using in-memory storage');
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Check for critical environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is not defined in environment variables');
}

if (!process.env.API_KEY) {
  console.error('ERROR: API_KEY is not defined in environment variables');
}

// Attempt to connect to MongoDB if available
if (connectDB) {
  connectDB()
    .then((connection) => {
      if (connection) {
        console.log('MongoDB connection established');
      } else {
        console.log('No MongoDB connection established, using in-memory storage');
      }
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      console.log('Continuing with in-memory storage');
    });
} else {
  console.log('MongoDB connection not configured, using in-memory storage');
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON requests

// Routes
app.use('/api/claude', require('./routes/claude'));
app.use('/api/mcp', require('./routes/mcp')); // Add MCP management routes

// Basic health check endpoint
app.get('/health', (req, res) => {
  const mcpController = require('./controllers/mcp.controller');
  const enabledServices = mcpController.getEnabledMCPServices();
  const allServices = mcpController.getMCPServices();
  
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      // Don't log actual API keys
      anthropic_api_key_set: !!process.env.ANTHROPIC_API_KEY,
      api_key_set: !!process.env.API_KEY,
      mongodb_uri_set: !!process.env.MONGODB_URI,
      mongodb_connected: !!connectDB
    },
    mcpServices: {
      total: allServices.length,
      enabled: enabledServices.length,
      disabled: allServices.length - enabledServices.length,
      services: allServices.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        enabled: s.enabled,
        url: s.url
      }))
    }
  });
});

// Add a dedicated MCP status endpoint
app.get('/mcp-status', (req, res) => {
  const mcpController = require('./controllers/mcp.controller');
  const enabledServices = mcpController.getEnabledMCPServices();
  const allServices = mcpController.getMCPServices();
  
  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        total: allServices.length,
        enabled: enabledServices.length,
        disabled: allServices.length - enabledServices.length
      },
      services: allServices.map(service => ({
        id: service.id,
        name: service.name,
        type: service.type,
        enabled: service.enabled,
        url: service.url,
        description: service.description,
        createdAt: service.createdAt,
        lastUpdated: service.lastUpdated
      }))
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/health`);
  console.log(`MCP status available at: http://localhost:${port}/mcp-status`);
  console.log(`MCP management API available at: http://localhost:${port}/api/mcp`);
  
  // Log initial MCP services status
  const mcpController = require('./controllers/mcp.controller');
  const enabledServices = mcpController.getEnabledMCPServices();
  const allServices = mcpController.getMCPServices();
  
  console.log(`\nMCP Services Status:`);
  console.log(`  Total: ${allServices.length}`);
  console.log(`  Enabled: ${enabledServices.length}`);
  console.log(`  Disabled: ${allServices.length - enabledServices.length}`);
  
  if (enabledServices.length > 0) {
    console.log(`\nEnabled Services:`);
    enabledServices.forEach(service => {
      console.log(`  - ${service.name} (${service.type}) - ${service.url}`);
    });
  }
});