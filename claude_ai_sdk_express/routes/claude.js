const express = require('express');
const router = express.Router();
const claudeController = require('../controllers/claude.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Basic Claude chat endpoints
router.post('/chat', claudeController.chatCompletion);
router.get('/history/:sessionId', claudeController.getHistory);
router.delete('/history/:sessionId', claudeController.clearHistory);

module.exports = router;