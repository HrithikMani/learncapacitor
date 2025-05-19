// Load environment variables
require('dotenv').config();

// Import Anthropic from the AI SDK
const { anthropic } = require('@ai-sdk/anthropic');
const { generateText } = require('ai');

// Import conversation service
const conversationService = require('../services/conversation.service');

// Text completion endpoint controller
exports.chatCompletion = async (req, res) => {
  try {
    console.log('Entering chatCompletion function');
    
    const { 
      prompt, 
      sessionId, 
      model = 'claude-3-7-sonnet-20250219', 
      maxTokens = 1000,
      system = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
      temperature = 0.7
    } = req.body;
    
    // Validate request parameters
    if (!prompt) {
      return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Session ID is required' });
    }

    // Log the parameters for debugging
    console.log('Request parameters:', {
      promptLength: prompt.length,
      sessionId,
      model,
      maxTokens,
      temperature
    });

    // Get previous messages from storage
    const previousMessages = await conversationService.getMessages(sessionId);
    
    // Convert previous messages to the format expected by AI SDK
    const messages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the current user message
    messages.push({ role: 'user', content: prompt });

    console.log('Calling Claude API using AI SDK...');
    
    try {
      // Use the AI SDK to generate text
      const result = await generateText({
        model: anthropic(model),
        messages: messages,
        system: system,
        max_tokens: maxTokens,
        temperature: temperature
      });

      console.log('Claude API response received');
      
      // Add messages to conversation storage
      await conversationService.addMessage(sessionId, {
        role: 'user',
        content: prompt
      });
      
      await conversationService.addMessage(sessionId, {
        role: 'assistant',
        content: result.text
      });

      // Return response
      res.status(200).json({
        status: 'success',
        data: {
          message: result.text,
          usage: {
            input_tokens: result.usage?.input_tokens || 0,
            output_tokens: result.usage?.output_tokens || 0
          },
          model: model,
          session_id: sessionId
        }
      });
    } catch (apiError) {
      console.error('Claude API specific error:', apiError);
      
      // Return a more detailed error for API-specific issues
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to get response from Claude API',
        error: apiError.message,
        details: apiError.response || 'No additional details'
      });
    }
  } catch (error) {
    console.error('General error in chatCompletion:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get response from Claude',
      error: error.message
    });
  }
};

// Get conversation history controller
exports.getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Session ID is required' });
    }

    // Get conversation history from storage
    const messages = await conversationService.getMessages(sessionId);
    
    res.status(200).json({
      status: 'success',
      data: {
        session_id: sessionId,
        messages: messages,
        message_count: messages.length
      }
    });
  } catch (error) {
    console.error('Error retrieving history:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve conversation history',
      error: error.message
    });
  }
};

// Clear conversation history controller
exports.clearHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Session ID is required' });
    }

    // Clear conversation history
    await conversationService.clearConversation(sessionId);
    
    res.status(200).json({
      status: 'success',
      message: 'Conversation history cleared successfully',
      session_id: sessionId
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to clear conversation history',
      error: error.message
    });
  }
};