
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

// Streaming endpoint
router.post('/stream', claudeController.streamChat);

// New conversation management endpoints
router.post('/conversations', claudeController.createConversation);
router.get('/conversations', claudeController.getAllConversations);
router.put('/conversations/:sessionId/title', claudeController.updateTitle);
router.delete('/conversations/:sessionId', claudeController.deleteConversation);

module.exports = router;