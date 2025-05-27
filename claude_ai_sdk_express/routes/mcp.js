
const express = require('express');
const router = express.Router();
const mcpController = require('../controllers/mcp.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Get all MCP services
// GET /api/mcp/services?enabled=true
router.get('/services', mcpController.getAllServices);

// Get single MCP service by ID
// GET /api/mcp/services/:id
router.get('/services/:id', mcpController.getServiceById);

// Add new MCP service
// POST /api/mcp/services
// Body: { name, url, type?, description?, enabled? }
router.post('/services', mcpController.addService);

// Update existing MCP service
// PUT /api/mcp/services/:id
// Body: { name?, url?, type?, description?, enabled? }
router.put('/services/:id', mcpController.updateService);

// Delete MCP service
// DELETE /api/mcp/services/:id
router.delete('/services/:id', mcpController.deleteService);

// Enable/Disable single MCP service
// PATCH /api/mcp/services/:id/toggle
// Body: { enabled: boolean }
router.patch('/services/:id/toggle', mcpController.toggleService);

// Bulk enable/disable MCP services
// PATCH /api/mcp/services/bulk/toggle
// Body: { ids: string[], enabled: boolean }
router.patch('/services/bulk/toggle', mcpController.bulkToggle);

// Test MCP service connection
// GET /api/mcp/services/:id/test
router.get('/services/:id/test', mcpController.testService);

module.exports = router;