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
      sessionId: providedSessionId, 
      model = 'claude-3-7-sonnet-20250219', 
      maxTokens = 1000,
      system = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
      temperature = 0.7
    } = req.body;
    
    // Validate request parameters
    if (!prompt) {
      return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    }

    let sessionId = providedSessionId;
    let conversation;

    // If no sessionId provided, create a new conversation
    if (!sessionId) {
      const result = await conversationService.createConversation();
      sessionId = result.sessionId;
      conversation = result;
      console.log('Created new conversation with ID:', sessionId);
    } else {
      // Get previous messages from storage
      conversation = await conversationService.getConversation(sessionId);
    }

    // Log the parameters for debugging
    console.log('Request parameters:', {
      promptLength: prompt.length,
      sessionId,
      model,
      maxTokens,
      temperature
    });

    // Convert previous messages to the format expected by AI SDK
    const messages = conversation.messages.map(msg => ({
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

      // Get updated conversation to include title
      const updatedConversation = await conversationService.getConversation(sessionId);

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
          session_id: sessionId,
          title: updatedConversation.title
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
    const conversation = await conversationService.getConversation(sessionId);
    const messages = conversation.messages;
    
    res.status(200).json({
      status: 'success',
      data: {
        session_id: sessionId,
        title: conversation.title || 'Conversation',
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
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Conversation not found'
      });
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to clear conversation history',
      error: error.message
    });
  }
};

// Get all conversations controller
exports.getAllConversations = async (req, res) => {
  try {
    const conversations = await conversationService.getAllConversations();
    
    res.status(200).json({
      status: 'success',
      data: {
        conversations: conversations
      }
    });
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve conversations',
      error: error.message
    });
  }
};

// Update conversation title controller
exports.updateTitle = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Session ID is required' });
    }

    if (!title) {
      return res.status(400).json({ status: 'error', message: 'Title is required' });
    }

    const conversation = await conversationService.updateTitle(sessionId, title);
    
    res.status(200).json({
      status: 'success',
      data: {
        session_id: sessionId,
        title: conversation.title
      }
    });
  } catch (error) {
    console.error('Error updating title:', error);
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Conversation not found'
      });
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update title',
      error: error.message
    });
  }
};

// Delete conversation controller
exports.deleteConversation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Session ID is required' });
    }

    await conversationService.deleteConversation(sessionId);
    
    res.status(200).json({
      status: 'success',
      message: 'Conversation deleted successfully',
      session_id: sessionId
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Conversation not found'
      });
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

// Create new empty conversation controller
exports.createConversation = async (req, res) => {
  try {
    const { title } = req.body;
    
    const conversation = await conversationService.createConversation(title);
    
    res.status(201).json({
      status: 'success',
      data: {
        session_id: conversation.sessionId,
        title: conversation.title,
        message_count: 0
      }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to create conversation',
      error: error.message
    });
  }
};

// Stream chat with Claude
exports.streamChat = async (req, res) => {
  try {
    const { 
      prompt, 
      sessionId: providedSessionId, 
      model = 'claude-3-7-sonnet-20250219', 
      maxTokens = 1000,
      system = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
      temperature = 0.7
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Prompt is required' 
      });
    }

    let sessionId = providedSessionId;
    let conversation;

    // If no sessionId provided, create a new conversation
    if (!sessionId) {
      const result = await conversationService.createConversation();
      sessionId = result.sessionId;
      conversation = result;
    } else {
      // Get conversation
      conversation = await conversationService.getConversation(sessionId);
    }

    // Get previous messages
    const messages = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add current user message
    messages.push({ role: 'user', content: prompt });

    // Store user message
    await conversationService.addMessage(sessionId, {
      role: 'user',
      content: prompt
    });

    // Set up response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    try {
      // Import the streamText function
      const { streamText } = require('ai');
      
      // Stream response from Claude
      const stream = await streamText({
        model: anthropic(model),
        messages,
        system,
        max_tokens: maxTokens,
        temperature
      });

      // Send session info in the first chunk
      res.write(`data: ${JSON.stringify({
        type: 'session',
        sessionId: sessionId,
        title: conversation.title
      })}\n\n`);

      // Process the stream
      for await (const chunk of stream) {
        // Send each chunk to the client
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          text: chunk.text || ''
        })}\n\n`);
        
        // Accumulate the full response
        if (chunk.text) {
          fullResponse += chunk.text;
        }
      }

      // Store assistant message after streaming completes
      await conversationService.addMessage(sessionId, {
        role: 'assistant',
        content: fullResponse
      });

      // End the response
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error in streamChat:', error);
      
      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({ 
          status: 'error', 
          message: 'Streaming error',
          error: error.message
        });
      } else {
        // If headers have been sent, send error as SSE event
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error.message 
        })}\n\n`);
        res.end();
      }
    }
  } catch (error) {
    console.error('General error in streamChat:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to process request',
        error: error.message
      });
    }
  }
};