// services/mcp.service.js
const { experimental_createMCPClient } = require('ai');
const { Experimental_StdioMCPTransport } = require('ai/mcp-stdio');

// Initialize MCP client
const createMCPClient = async (options = {}) => {
  try {
    // Default to stdio transport if none provided
    const transport = options.transport || 
      new Experimental_StdioMCPTransport({
        command: options.command || 'npx @anthropic-ai/mcp',
        args: options.args || [],
      });

    // Create MCP client
    const mcpClient = await experimental_createMCPClient({
      transport,
    });

    return mcpClient;
  } catch (error) {
    console.error('Error creating MCP client:', error);
    throw error;
  }
};

// Get MCP tools
const getMCPTools = async (options = {}) => {
  let mcpClient = null;
  
  try {
    mcpClient = await createMCPClient(options);
    
    // Get tools from MCP server
    const tools = await mcpClient.tools();
    
    return tools;
  } catch (error) {
    console.error('Error getting MCP tools:', error);
    throw error;
  } finally {
    // Always close the client to release resources
    if (mcpClient) {
      await mcpClient.close();
    }
  }
};

module.exports = {
  createMCPClient,
  getMCPTools
};


// controllers/claude-tools.controller.js
const { anthropic } = require('@ai-sdk/anthropic');
const { generateText, streamText } = require('ai');
const mcpService = require('../services/mcp.service');
const conversationService = require('../services/conversation.service');

// Custom tools
const customTools = {
  // Example calculator tool
  calculator: {
    description: "Perform mathematical calculations",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The mathematical expression to evaluate"
        }
      },
      required: ["expression"]
    },
    execute: async ({ expression }) => {
      try {
        // Use a safe evaluate function or library in production
        const result = eval(expression);
        return { result };
      } catch (error) {
        return { error: error.message };
      }
    }
  },
  
  // Example weather tool
  getWeather: {
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location to get weather for (city, country)"
        }
      },
      required: ["location"]
    },
    execute: async ({ location }) => {
      // In a real app, you would call a weather API here
      return {
        location,
        temperature: Math.round(Math.random() * 30 + 5), // Random temp between 5-35°C
        condition: ["Sunny", "Cloudy", "Rainy", "Snowy"][Math.floor(Math.random() * 4)],
        humidity: Math.round(Math.random() * 50 + 30) // Random humidity between 30-80%
      };
    }
  }
};

// Chat with Claude using tools
exports.chatWithTools = async (req, res) => {
  try {
    const { 
      prompt, 
      sessionId, 
      model = 'claude-3-7-sonnet-20250219', 
      maxTokens = 1000,
      system = "You are Claude, an AI assistant created by Anthropic. You have access to various tools to help you.",
      temperature = 0.7,
      useMCPTools = false,
      maxSteps = 5 // Maximum number of tool-calling steps
    } = req.body;
    
    // Validate request parameters
    if (!prompt) {
      return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Session ID is required' });
    }

    // Get conversation history
    const previousMessages = await conversationService.getMessages(sessionId);
    
    // Format messages for AI SDK
    const messages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add current user message
    messages.push({ role: 'user', content: prompt });

    // Prepare tools
    let tools = { ...customTools };
    
    // Add MCP tools if requested
    if (useMCPTools) {
      try {
        const mcpTools = await mcpService.getMCPTools();
        // Merge MCP tools with custom tools
        tools = { ...tools, ...mcpTools };
      } catch (error) {
        console.error('Failed to get MCP tools:', error);
        // Continue with just the custom tools
      }
    }

    console.log(`Calling Claude with ${Object.keys(tools).length} tools...`);
    
    try {
      // Use generateText with tools
      const result = await generateText({
        model: anthropic(model),
        messages,
        system,
        max_tokens: maxTokens,
        temperature,
        tools,
        maxSteps // Enable multi-step tool calling
      });

      console.log('Claude response received');
      
      // Store conversation in MongoDB
      await conversationService.addMessage(sessionId, {
        role: 'user',
        content: prompt
      });
      
      await conversationService.addMessage(sessionId, {
        role: 'assistant',
        content: result.text
      });

      // Return the response
      res.status(200).json({
        status: 'success',
        data: {
          message: result.text,
          toolCalls: result.toolCalls || [],
          toolResults: result.toolResults || [],
          usage: result.usage || {},
          model,
          session_id: sessionId
        }
      });
    } catch (error) {
      console.error('Error calling Claude with tools:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to get response from Claude',
        error: error.message
      });
    }
  } catch (error) {
    console.error('General error in chatWithTools:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process request',
      error: error.message
    });
  }
};

// Stream chat with Claude using tools
exports.streamChatWithTools = async (req, res) => {
  try {
    const { 
      prompt, 
      sessionId, 
      model = 'claude-3-7-sonnet-20250219', 
      maxTokens = 1000,
      system = "You are Claude, an AI assistant created by Anthropic. You have access to various tools to help you.",
      temperature = 0.7,
      useMCPTools = false,
      maxSteps = 5
    } = req.body;
    
    if (!prompt || !sessionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Prompt and sessionId are required' 
      });
    }

    // Get conversation history
    const previousMessages = await conversationService.getMessages(sessionId);
    const messages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    messages.push({ role: 'user', content: prompt });

    // Store user message in MongoDB
    await conversationService.addMessage(sessionId, {
      role: 'user',
      content: prompt
    });

    // Prepare tools
    let tools = { ...customTools };
    
    if (useMCPTools) {
      try {
        const mcpTools = await mcpService.getMCPTools();
        tools = { ...tools, ...mcpTools };
      } catch (error) {
        console.error('Failed to get MCP tools:', error);
      }
    }

    // Set up response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    // Stream response from Claude
    const stream = await streamText({
      model: anthropic(model),
      messages,
      system,
      max_tokens: maxTokens,
      temperature,
      tools,
      maxSteps
    });

    // Process the stream
    for await (const chunk of stream) {
      // Send each chunk to the client
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
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
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in streamChatWithTools:', error);
    
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Streaming error',
        error: error.message
      });
    } else {
      // If headers have been sent, send error as SSE event
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};