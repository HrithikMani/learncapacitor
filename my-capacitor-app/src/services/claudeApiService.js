// src/services/claudeApiService.js

const API_BASE_URL = 'http://localhost:3000/api/claude'; // Change this to your API URL
const API_KEY = 'HrithikApiKey'; // Move to .env file in a real app

// API headers
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

const claudeApiService = {
  // Chat with Claude (original method)
  sendMessage: async (sessionId, prompt, model = 'claude-3-7-sonnet-20250219') => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          prompt,
          model,
          maxTokens: 1000,
          temperature: 0.7
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Stream chat with Claude - improved direct streaming
  streamMessage: (sessionId, prompt, model = 'claude-3-7-sonnet-20250219', callbacks) => {
    console.log('Starting streaming request');
    
    // Create an AbortController to allow canceling the fetch
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Make a POST request with proper headers for streaming
    fetch(`${API_BASE_URL}/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        prompt,
        model,
        maxTokens: 1000,
        temperature: 0.7,
        system: "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest."
      }),
      signal: signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser');
      }
      
      console.log('Stream response received, processing chunks');
      
      // Get a reader from the response body stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      // Function to process stream chunks
      function processStream() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            console.log('Stream complete');
            
            // Check if there's any remaining data in the buffer
            if (buffer.trim().length > 0) {
              processBuffer(buffer);
            }
            
            callbacks.onComplete();
            return;
          }
          
          // Decode the chunk and add it to the buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete SSE messages
          const lines = buffer.split('\n\n');
          
          // Keep the last line in buffer if it's incomplete
          buffer = lines.pop() || '';
          
          // Process each complete line
          for (const line of lines) {
            if (line.trim() === '') continue; // Skip empty lines
            if (line.trim().startsWith(':')) continue; // Skip comments/heartbeats
            
            processLine(line);
          }
          
          // Continue reading
          return processStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          callbacks.onError(error);
        });
      }
      
      // Helper function to process a single SSE message line
      function processLine(line) {
        // Extract the data part
        const dataMatch = line.match(/data: (.*)/);
        if (!dataMatch) {
          console.log('Non-data line:', line);
          return;
        }
        
        try {
          const data = JSON.parse(dataMatch[1]);
          
          if (data.type === 'session') {
            console.log('Session data:', data);
            callbacks.onSession(data);
          } else if (data.type === 'chunk') {
            // Only log if there's actual content
            if (data.text && data.text.length > 0) {
              console.log(`Received chunk (${data.text.length} chars)`);
            }
            callbacks.onChunk(data.text);
          } else if (data.type === 'done') {
            console.log('Stream marked as done');
            // We'll call onComplete when the stream is actually done
          } else if (data.type === 'error') {
            console.error('Stream error:', data.error);
            callbacks.onError(new Error(data.error));
            reader.cancel();
          }
        } catch (jsonError) {
          console.error('Error parsing JSON from stream:', jsonError);
          console.log('Raw data:', dataMatch[1]);
        }
      }
      
      // Helper function to process any remaining buffer content
      function processBuffer(buffer) {
        const lines = buffer.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim().startsWith(':')) continue;
          
          // Extract and process data
          const dataMatch = line.match(/data: (.*)/);
          if (dataMatch) {
            try {
              const data = JSON.parse(dataMatch[1]);
              
              if (data.type === 'chunk') {
                callbacks.onChunk(data.text);
              }
            } catch (error) {
              console.error('Error processing buffer remainder:', error);
            }
          }
        }
      }
      
      // Start processing the stream
      return processStream();
    })
    .catch(error => {
      console.error('Stream fetch error:', error);
      callbacks.onError(error);
    });
    
    // Return a function to abort the fetch if needed
    return {
      cancel: () => {
        console.log('Manually cancelling stream');
        controller.abort();
      }
    };
  },
  
  // Get conversation history
  getHistory: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Clear conversation history
  clearHistory: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Get all conversations
  getAllConversations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get conversations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Update conversation title
  updateTitle: async (sessionId, title) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/title`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update title');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Delete conversation
  deleteConversation: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete conversation');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Create a new conversation (without sending a message)
  createConversation: async (title) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

export default claudeApiService;