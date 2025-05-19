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
  
  // Keep MCP states for the UI - in a real app this might be replaced
  const [mcpList, setMcpList] = useState([
    { id: 'default', name: 'Claude AI', endpoint: '/api/claude', type: 'general', isDefault: true },
  ]);
  const [activeMCPs, setActiveMCPs] = useState(['default']);
  
  const messagesEndRef = useRef(null);
  
  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Load conversation when sessionId changes
  useEffect(() => {
    if (currentSessionId) {
      fetchConversationHistory(currentSessionId);
    } else {
      // If no session, start with empty messages
      setMessages([]);
    }
  }, [currentSessionId]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
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
      const response = await claudeApiService.getHistory(sessionId);
      if (response.status === 'success') {
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
      
      // Create and display user message immediately
      const userMessage = {
        id: Date.now(),
        sender: 'user',
        content: inputMessage,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      const currentInput = inputMessage;
      setInputMessage('');
      
      // Show typing indicator
      setIsTyping(true);
      
      let sessionId = currentSessionId;
      
      try {
        // If no current session, a new one will be created automatically by the API
        const response = await claudeApiService.sendMessage(sessionId, currentInput);
        
        if (response.status === 'success') {
          // If this was a new conversation, update the sessionId
          if (!sessionId) {
            setCurrentSessionId(response.data.session_id);
            setCurrentTitle(response.data.title);
            
            // Refresh conversations list
            fetchConversations();
          }
          
          // Add AI response
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            sender: 'ai',
            content: response.data.message,
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Add error message to the chat
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'system',
          content: 'Sorry, there was an error sending your message. Please try again.',
          timestamp: new Date().toISOString()
        }]);
        showToast('Failed to send message', 'error');
      } finally {
        setIsTyping(false);
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
      setCurrentSessionId(conversationId);
      setShowChats(false);
    },
    
    // Start a new chat
    startNewChat: async () => {
      setCurrentSessionId(null);
      setCurrentTitle('New Chat');
      setMessages([]);
      setShowChats(false);
    },
    
    // Delete conversation
    deleteConversation: async (conversationId) => {
      try {
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