import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import ChatsModal from './components/ChatsModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import claudeApiService from './services/claudeApiService'; // Import from your service file

function App() {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentTitle, setCurrentTitle] = useState('Chat Session');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [streamingResponse, setStreamingResponse] = useState(null);
  const [streamConnection, setStreamConnection] = useState(null);
  
  // Keep MCP states for the UI - in a real app this might be replaced
  const [mcpList, setMcpList] = useState([
    { id: 'default', name: 'Claude AI', endpoint: '/api/claude', type: 'general', isDefault: true },
  ]);
  const [activeMCPs, setActiveMCPs] = useState(['default']);
  
  const messagesEndRef = useRef(null);
  
  // Load conversations on mount
  useEffect(() => {
    console.log('App mounted, fetching conversations');
    fetchConversations();
  }, []);
  
  // Load conversation when sessionId changes
  useEffect(() => {
    if (currentSessionId) {
      console.log(`Session ID changed to ${currentSessionId}, fetching history`);
      fetchConversationHistory(currentSessionId);
    } else {
      // If no session, start with empty messages
      console.log('No session ID, clearing messages');
      setMessages([]);
    }
  }, [currentSessionId]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      console.log('Scrolling to bottom of messages');
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingResponse]);
  
  // Cleanup streaming connection on unmount
  useEffect(() => {
    return () => {
      if (streamConnection && streamConnection.cancel) {
        console.log('Cleaning up stream connection');
        streamConnection.cancel();
      }
    };
  }, [streamConnection]);
  
  // Show a toast notification
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3000);
  };
  
  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      console.log('Fetching all conversations');
      const response = await claudeApiService.getAllConversations();
      if (response.status === 'success') {
        // Format the conversations for the UI
        const formattedConversations = response.data.conversations.map(conv => ({
          id: conv.sessionId,
          title: conv.title,
          date: formatDate(conv.lastUpdated),
          preview: `${conv.messageCount} messages`,
          messageCount: conv.messageCount
        }));
        console.log(`Retrieved ${formattedConversations.length} conversations`);
        setConversations(formattedConversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      showToast('Failed to load conversations', 'error');
    }
  };
  
  // Format relative date (e.g., "2 hours ago")
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };
  
  // Fetch conversation history
  const fetchConversationHistory = async (sessionId) => {
    try {
      console.log(`Fetching history for session ${sessionId}`);
      const response = await claudeApiService.getHistory(sessionId);
      if (response.status === 'success') {
        console.log(`Retrieved ${response.data.messages.length} messages`);
        setMessages(response.data.messages.map((msg, index) => ({
          id: index,
          sender: msg.role,
          content: msg.content,
          timestamp: msg.createdAt || new Date().toISOString()
        })));
        setCurrentTitle(response.data.title);
      }
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
      showToast('Failed to load conversation history', 'error');
    }
  };
  
  // Message handling functions
  const messageHandlers = {
    // Send a new message
    sendMessage: async () => {
      if (inputMessage.trim() === '') return;
      
      // Cancel any existing stream
      if (streamConnection && streamConnection.cancel) {
        console.log('Cancelling existing stream');
        streamConnection.cancel();
        setStreamConnection(null);
      }
      
      // Create and display user message immediately
      const userMessage = {
        id: Date.now(),
        sender: 'user',
        content: inputMessage,
        timestamp: new Date().toISOString()
      };
      
      console.log('Adding user message to chat');
      setMessages(prev => [...prev, userMessage]);
      const currentInput = inputMessage;
      setInputMessage('');
      
      // Show typing indicator
      setIsTyping(true);
      
      // Create AI response placeholder that will be updated as it streams
      console.log('Creating streaming response placeholder');
      const aiMessageId = Date.now() + 1;
      setStreamingResponse({
        id: aiMessageId,
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });
      
      let sessionId = currentSessionId;
      
      try {
        console.log(`Starting stream with${sessionId ? '' : 'out'} session ID`);
        // Use streaming API
        const connection = claudeApiService.streamMessage(
          sessionId,
          currentInput,
          'claude-3-7-sonnet-20250219',
          {
            onSession: (data) => {
              console.log('Session data received:', data);
              // If this was a new conversation, update the sessionId
              if (!sessionId) {
                console.log(`New session created: ${data.sessionId}`);
                setCurrentSessionId(data.sessionId);
                setCurrentTitle(data.title);
                sessionId = data.sessionId;
                
                // Refresh conversations list
                fetchConversations();
              }
            },
            onChunk: (chunk) => {
              console.log('Received chunk:', chunk ? chunk.length : 0, 'chars');
              // Update the streaming response with each new chunk
              setStreamingResponse(prev => {
                if (!prev) {
                  console.warn('No streaming response object to update');
                  return {
                    id: Date.now(),
                    sender: 'ai',
                    content: chunk || '',
                    timestamp: new Date().toISOString(),
                    isStreaming: true
                  };
                }
                
                // Basic string content
                return {
                  ...prev,
                  content: prev.content + (chunk || '')
                };
              });
            },
            onComplete: () => {
              console.log('Stream completed');
              setStreamingResponse(prev => {
                if (!prev) {
                  console.warn('No streaming response to finalize');
                  return null;
                }
                
                console.log('Finalizing message with content length:', 
                  typeof prev.content === 'string' ? prev.content.length : 'complex structure');
                
                // Add completed message to messages
                setMessages(messages => [...messages, {
                  id: prev.id,
                  sender: 'ai',
                  content: prev.content,
                  timestamp: prev.timestamp
                }]);
                return null; // Clear streaming state
              });
              setIsTyping(false);
              setStreamConnection(null);
              
              // Refresh conversations list to update message count
              fetchConversations();
            },
            onError: (error) => {
              console.error('Error streaming message:', error);
              // Add error message to the chat
              setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'system',
                content: 'Sorry, there was an error sending your message. Please try again.',
                timestamp: new Date().toISOString()
              }]);
              setStreamingResponse(null);
              setIsTyping(false);
              setStreamConnection(null);
              showToast('Failed to send message', 'error');
            }
          }
        );
        
        // Store the connection to allow cancellation
        setStreamConnection(connection);
      } catch (error) {
        console.error('Error setting up streaming:', error);
        setStreamingResponse(null);
        setIsTyping(false);
        // Add error message to the chat
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'system',
          content: 'Sorry, there was an error sending your message. Please try again.',
          timestamp: new Date().toISOString()
        }]);
        showToast('Failed to send message', 'error');
      }
    },
    
    // Copy message to clipboard
    copyMessage: (content) => {
      navigator.clipboard.writeText(content);
      showToast('Message copied to clipboard', 'success');
    }
  };

  // Conversations service
  const conversationsService = {
    // Select a conversation
    selectConversation: (conversationId) => {
      console.log(`Selecting conversation: ${conversationId}`);
      setCurrentSessionId(conversationId);
      setShowChats(false);
    },
    
    // Start a new chat
    startNewChat: async () => {
      console.log('Starting new chat');
      setCurrentSessionId(null);
      setCurrentTitle('New Chat');
      setMessages([]);
      setShowChats(false);
    },
    
    // Delete conversation
    deleteConversation: async (conversationId) => {
      try {
        console.log(`Deleting conversation: ${conversationId}`);
        await claudeApiService.deleteConversation(conversationId);
        showToast('Conversation deleted', 'success');
        
        // Refresh the conversations list
        fetchConversations();
        
        // If the deleted conversation was the current one, start a new chat
        if (currentSessionId === conversationId) {
          conversationsService.startNewChat();
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        showToast('Failed to delete conversation', 'error');
      }
    }
  };
  
  // MCP service functions (mostly UI-related in this integration)
  const mcpService = {
    toggleMCP: (mcpId) => {
      setActiveMCPs(prev => {
        if (prev.includes(mcpId)) {
          if (mcpId === 'default' || prev.length === 1) {
            return prev; // Keep at least one MCP active
          }
          return prev.filter(id => id !== mcpId);
        } 
        return [...prev, mcpId];
      });
    },
    
    addMCP: (mcpData) => {
      const newMCP = {
        id: `mcp-${Date.now()}`,
        name: mcpData.name,
        endpoint: mcpData.endpoint,
        type: mcpData.type || 'general',
        isDefault: false
      };
      
      setMcpList(prev => [...prev, newMCP]);
      showToast(`${mcpData.name} added successfully`, 'success');
      return true;
    },
    
    deleteMCP: (id) => {
      if (activeMCPs.includes(id)) {
        setActiveMCPs(prev => prev.filter(mcpId => mcpId !== id));
      }
      
      const mcpName = mcpList.find(mcp => mcp.id === id)?.name || 'MCP';
      setMcpList(prev => prev.filter(mcp => mcp.id !== id));
      showToast(`${mcpName} removed`, 'info');
      return true;
    }
  };

  // Get primary active MCP for header display
  const getPrimaryMCP = () => {
    if (activeMCPs.length === 0) return "No AI Selected";
    if (activeMCPs.length === 1) {
      const mcp = mcpList.find(m => m.id === activeMCPs[0]);
      return mcp ? mcp.name : "Unknown AI";
    }
    return `${activeMCPs.length} AIs Active`;
  };

  return (
    <div className="app-container">
      <Header 
        primaryMCP={getPrimaryMCP()}
        title={currentTitle}
        onChatsClick={() => setShowChats(true)}
        onSettingsClick={() => setShowSettings(true)}
      />

      <MessageList 
        messages={messages}
        streamingResponse={streamingResponse}
        isTyping={isTyping}
        activeMCPs={activeMCPs}
        mcpList={mcpList}
        onCopyMessage={messageHandlers.copyMessage}
        messagesEndRef={messagesEndRef}
      />
      
      <InputArea 
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        onSendMessage={messageHandlers.sendMessage}
        isFirstMessage={messages.length === 0}
      />
      
      {showChats && (
        <ChatsModal 
          conversations={conversations}
          onClose={() => setShowChats(false)}
          onSelectConversation={conversationsService.selectConversation}
          onNewChat={conversationsService.startNewChat}
          onDeleteConversation={conversationsService.deleteConversation}
        />
      )}
      
      {showSettings && (
        <SettingsModal 
          mcpList={mcpList}
          activeMCPs={activeMCPs}
          onClose={() => setShowSettings(false)}
          onToggleMCP={mcpService.toggleMCP}
          onDeleteMCP={mcpService.deleteMCP}
          onAddMCP={mcpService.addMCP}
        />
      )}
      
      {toast.show && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'info' })}
        />
      )}
    </div>
  );
}

export default App;