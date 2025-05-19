// Simple in-memory conversation service as fallback
// This will be used if MongoDB is not available

// In-memory storage for message history
const messageStorage = {};

// Get conversation by session ID
const getConversation = async (sessionId) => {
  try {
    // Create a new conversation if one doesn't exist
    if (!messageStorage[sessionId]) {
      messageStorage[sessionId] = [];
    }
    
    return {
      sessionId,
      messages: messageStorage[sessionId]
    };
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    throw error;
  }
};

// Add message to conversation
const addMessage = async (sessionId, message) => {
  try {
    // Initialize session if it doesn't exist
    if (!messageStorage[sessionId]) {
      messageStorage[sessionId] = [];
    }
    
    // Add the message to the conversation
    messageStorage[sessionId].push(message);
    
    return {
      sessionId,
      messages: messageStorage[sessionId]
    };
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
};

// Clear conversation history
const clearConversation = async (sessionId) => {
  try {
    // Clear messages for the session
    messageStorage[sessionId] = [];
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing conversation:', error);
    throw error;
  }
};

// Get all messages for a conversation
const getMessages = async (sessionId) => {
  try {
    // Initialize if it doesn't exist
    if (!messageStorage[sessionId]) {
      messageStorage[sessionId] = [];
    }
    
    return messageStorage[sessionId];
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

module.exports = {
  getConversation,
  addMessage,
  clearConversation,
  getMessages
};