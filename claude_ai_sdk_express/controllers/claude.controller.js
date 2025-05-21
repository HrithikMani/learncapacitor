require('dotenv').config();

// Import dependencies
const { anthropic } = require('@ai-sdk/anthropic');
const { generateText, streamText, experimental_createMCPClient } = require('ai');
const conversationService = require('../services/conversation.service');

// Global constants
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_SYSTEM_PROMPT = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. You have access to various tools to help you. You need to take whatever response you get from the tool and give a human-like response to the user. if you don't find any specifi tool you are free to explore.";
const MAX_TOOL_STEPS = 10;

// Array of MCP service configurations
const MCP_SERVICES = [
  {
    url: "http://localhost:8081/sse",
    name: "Calculator service"
  },
  {
    url: "http://localhost:8082/sse",
    name: "Notepad service"
  }
  // Add more services as needed
];

/**
 * Initialize MCP clients and get available tools from all services
 * @returns {Promise<Object>} Combined available tools or empty object if all failed
 */
const initializeTools = async () => {
  let combinedTools = {};
  let successfulServices = 0;
  let failedServices = 0;
  
  // Process each service in parallel
  await Promise.all(MCP_SERVICES.map(async (service) => {
    try {
      console.log(`Initializing MCP client for ${service.name} at ${service.url}`);
      
      const mcpClient = await experimental_createMCPClient({
        transport: {
          type: "sse",
          url: service.url,
        },
        name: service.name,
      });
      
      const serviceTools = await mcpClient.tools();
      
      if (serviceTools && Object.keys(serviceTools).length > 0) {
        console.log(`Initialized ${Object.keys(serviceTools).length} tools from ${service.name}`);
        
        // Add a prefix to avoid tool name collisions between services
        // Or alternatively, merge tools directly if you prefer
        Object.entries(serviceTools).forEach(([toolName, toolObject]) => {
          // Option 1: Use service name as prefix to prevent collisions
          // const prefixedToolName = `${service.name.replace(/\s+/g, '_').toLowerCase()}.${toolName}`;
          // combinedTools[prefixedToolName] = toolObject;
          
          // Option 2: Direct merge (will overwrite tools with same names)
          combinedTools[toolName] = toolObject;
        });
        
        successfulServices++;
      } else {
        console.warn(`No tools found in service: ${service.name}`);
        failedServices++;
      }
    } catch (error) {
      console.error(`Failed to initialize tools from ${service.name}:`, error);
      failedServices++;
    }
  }));
  
  // Log summary of service connection results
  console.log(`MCP services summary: ${successfulServices} successful, ${failedServices} failed`);
  console.log(`Total tools available: ${Object.keys(combinedTools).length}`);
  
  return Object.keys(combinedTools).length > 0 ? combinedTools : null;
};

/**
 * Initialize conversation and retrieve message history
 * @param {string} providedSessionId - Optional session ID
 * @param {string} prompt - User message
 * @returns {Promise<Object>} Conversation data and messages
 */
const initializeConversation = async (providedSessionId, prompt) => {
  let sessionId = providedSessionId;
  let conversation;

  // If no sessionId provided, create a new conversation
  if (!sessionId) {
    const result = await conversationService.createConversation();
    sessionId = result.sessionId;
    conversation = result;
    console.log('Created new conversation with ID:', sessionId);
  } else {
    // Get conversation from storage
    conversation = await conversationService.getConversation(sessionId);
  }

  // Format messages for the AI SDK
  const messages = conversation.messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Add the current user message to the array
  messages.push({ role: 'user', content: prompt });

  // Store the user message in the conversation history
  await conversationService.addMessage(sessionId, {
    role: 'user',
    content: prompt
  });

  return { sessionId, conversation, messages };
};

/**
 * Set up SSE response headers
 * @param {Object} res - Express response object
 */
const setupSSEHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Allow CORS for streaming
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
};

/**
 * Handle errors in SSE responses
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
const handleSSEError = (res, error) => {
  console.error('Streaming error:', error);
  
  if (!res.headersSent) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Streaming error',
      error: error.message
    });
  } else {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`);
    res.end();
  }
};

// Text completion endpoint controller
exports.chatCompletion = async (req, res) => {
  try {
    console.log('Entering chatCompletion function');
    
    const { 
      prompt, 
      sessionId: providedSessionId, 
      model = DEFAULT_MODEL, 
      maxTokens = DEFAULT_MAX_TOKENS,
      system = DEFAULT_SYSTEM_PROMPT,
      temperature = DEFAULT_TEMPERATURE,
      useTools = false  // Parameter to toggle tool usage
    } = req.body;
    
    // Validate request parameters
    if (!prompt) {
      return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    }

    // Initialize conversation and get messages
    const { sessionId, conversation, messages } = await initializeConversation(providedSessionId, prompt);

    // Log the parameters for debugging
    console.log('Request parameters:', {
      promptLength: prompt.length,
      sessionId,
      model,
      maxTokens,
      temperature,
      useTools
    });

    console.log('Calling Claude API using AI SDK...');
    
    try {
      let result;
      let tools = null;
      
      // Get tools from all services if requested
      if (useTools) {
        tools = await initializeTools();
        console.log(`Using ${tools ? Object.keys(tools).length : 0} tools from all services`);
      }

      // Generate text with or without tools
      const generateOptions = {
        model: anthropic(model),
        messages,
        system,
        max_tokens: maxTokens,
        temperature
      };

      if (tools && Object.keys(tools).length > 0) {
        // Add tool-specific options
        generateOptions.tools = tools;
        generateOptions.maxSteps = MAX_TOOL_STEPS;
        
        result = await generateText(generateOptions);
        
        // Store all messages from the tool interaction
        if (result.response && result.response.messages && result.response.messages.length > 0) {
          // Store each message from the tool interaction
          for (const msg of result.response.messages) {
            await conversationService.addMessage(sessionId, {
              role: msg.role,
              content: msg.content,
              id: msg.id
            });
          }
        }
      } else {
        // Standard text generation without tools
        result = await generateText(generateOptions);
        
        // Store assistant's response (we already stored user's message earlier)
        await conversationService.addMessage(sessionId, {
          role: 'assistant',
          content: result.text
        });
      }

      console.log('Claude API response received');

      // Get updated conversation to include any title changes
      const updatedConversation = await conversationService.getConversation(sessionId);

      // Prepare response object
      const responseData = {
        message: result.text,
        usage: {
          input_tokens: result.usage?.input_tokens || 0,
          output_tokens: result.usage?.output_tokens || 0
        },
        model,
        session_id: sessionId,
        title: updatedConversation.title
      };
      
      // Add tool-specific fields if tools were used
      if (tools && Object.keys(tools).length > 0) {
        responseData.toolCalls = result.toolCalls || [];
        responseData.toolResults = result.toolResults || [];
      }

      // Return response
      res.status(200).json({
        status: 'success',
        data: responseData
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

// Stream chat with Claude
exports.streamChat = async (req, res) => {
  // Create a heartbeat interval to keep the connection alive
  let heartbeatInterval = null;
  
  try {
    const { 
      prompt, 
      sessionId: providedSessionId, 
      model = DEFAULT_MODEL, 
      maxTokens = DEFAULT_MAX_TOKENS,
      system = DEFAULT_SYSTEM_PROMPT,
      temperature = DEFAULT_TEMPERATURE
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Prompt is required' 
      });
    }

    console.log('Stream request received with prompt:', prompt.substring(0, 30) + '...');

    // Initialize conversation and get formatted messages
    const { sessionId, conversation, messages } = await initializeConversation(providedSessionId, prompt);
    console.log(`Using session ID: ${sessionId}`);

    // Initialize tools from all services
    const tools = await initializeTools();
    console.log(`Tools initialized from all services: ${tools ? Object.keys(tools).length : 'none'}`);

    // Set up streaming response headers
    setupSSEHeaders(res);
    console.log('SSE headers set up');

    // Set up a heartbeat to keep the connection alive
    heartbeatInterval = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    // Send session info in the first chunk
    res.write(`data: ${JSON.stringify({
      type: 'session',
      sessionId: sessionId,
      title: conversation.title
    })}\n\n`);
    console.log('Session info sent');

    let fullTextResponse = '';

    try {
      console.log('Starting stream with Claude API...');
      // Stream response from Claude with tools
      const response = await streamText({
        model: anthropic(model),
        messages,
        system,
        max_tokens: maxTokens,
        temperature,
        tools,
        maxSteps: MAX_TOOL_STEPS,
        onFinish({ text, finishReason, usage, response }) {
          console.log('Stream finished, final message length:', text.length);
          console.log('Response messages structure:', 
            response.messages ? `${response.messages.length} messages` : 'No messages');
          
          // Store all messages from the response array in MongoDB
          if (response && response.messages && response.messages.length > 0) {
            console.log(`Storing ${response.messages.length} messages in database`);
            // Process and store each message regardless of role
            response.messages.forEach(async (msg) => {
              // Store the complete message with its structure intact
              await conversationService.addMessage(sessionId, {
                role: msg.role,
                content: msg.content,
                id: msg.id
              });
            });
          }
        }
      });

      console.log('Processing text stream...');
      // Process the text stream
      for await (const chunk of response.textStream) {
        // Log chunks but only print a short preview
        if (chunk && chunk.length > 0) {
          console.log(`Sending chunk: ${chunk.length} chars`);
        }
        
        // Send each chunk as an SSE event
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          text: chunk || ''
        })}\n\n`);
        
        // Accumulate the full response
        if (chunk) {
          fullTextResponse += chunk;
        }
      }

      console.log('Stream complete, sending done event');
      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      
      // Clear the heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      res.end();
    } catch (streamError) {
      console.error('Error during streaming:', streamError);
      
      // Clear the heartbeat interval if it exists
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // Send error event if headers have been sent
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: streamError.message 
        })}\n\n`);
        res.end();
      } else {
        // Otherwise send a JSON error response
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to stream response',
          error: streamError.message
        });
      }
    }
  } catch (error) {
    console.error('General error in streamChat:', error);
    
    // Clear the heartbeat interval if it exists
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    handleSSEError(res, error);
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