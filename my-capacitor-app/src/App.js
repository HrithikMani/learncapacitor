import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import ChatsModal from './components/ChatsModal';
import SettingsModal from './components/SettingsModal';

function App() {
  // State management
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', content: 'Hello! How can I assist you today?', timestamp: new Date().toISOString() },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showChats, setShowChats] = useState(false);
  
  // New MCP management with multiple active MCPs
  const [mcpList, setMcpList] = useState([
    { id: 'default', name: 'Default AI', endpoint: 'https://api.default-ai.com', type: 'general', isDefault: true },
    { id: 'mcp2', name: 'Product Catalog', endpoint: 'https://api.products.com', type: 'products' },
    { id: 'mcp3', name: 'Order Management', endpoint: 'https://api.orders.com', type: 'orders' },
    { id: 'mcp4', name: 'Customer Support', endpoint: 'https://api.support.com', type: 'users' },
    { id: 'mcp5', name: 'Analytics Engine', endpoint: 'https://api.analytics.com', type: 'analytics' },
  ]);
  
  // Store active MCPs as an array of IDs
  const [activeMCPs, setActiveMCPs] = useState(['default']);
  
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([
    { id: 'conv1', title: 'Project Planning', date: '2 hours ago', preview: 'Let\'s discuss the timeline for...' },
    { id: 'conv2', title: 'Research Assistant', date: 'Yesterday', preview: 'I need help finding sources on...' },
    { id: 'conv3', title: 'Code Review Help', date: 'May 2', preview: 'Can you check this function for...' },
  ]);
  
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // API service functions
  const aiService = {
    // Simulate AI response with active MCPs
    getResponse: (userMessage) => {
      setIsTyping(true);
      
      // Get active MCP names for response
      const activeMCPNames = activeMCPs.map(id => {
        const mcp = mcpList.find(m => m.id === id);
        return mcp ? mcp.name : null;
      }).filter(Boolean);
      
      // Simulate AI thinking time
      return new Promise((resolve) => {
        setTimeout(() => {
          if (activeMCPNames.length > 1) {
            // If multiple MCPs are active
            resolve(`I'm using multiple tools to answer (${activeMCPNames.join(', ')}). Based on the available information, I can help with that request.`);
          } else {
            // If only one MCP is active
            const responses = [
              "I understand what you're asking about. Let me elaborate on that...",
              "That's an interesting question! Here's what I know about it...",
              "I'll help you with that. Based on my knowledge...",
              "Great question! Here's my analysis...",
              "I can assist with that. Here's some information that might help...",
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            resolve(randomResponse);
          }
          
          setIsTyping(false);
        }, 1500);
      });
    }
  };
  
  // Conversations service
  const conversationsService = {
    // Select a conversation
    selectConversation: (conversationId) => {
      // In a real app, you'd load the conversation messages here
      setShowChats(false);
    },
    
    // Start a new chat
    startNewChat: () => {
      setMessages([{ id: 1, sender: 'ai', content: 'Hello! How can I assist you today?', timestamp: new Date().toISOString() }]);
      setShowChats(false);
    }
  };
  
  // MCP service functions
  const mcpService = {
    // Toggle MCP active status
    toggleMCP: (mcpId) => {
      setActiveMCPs(prev => {
        // If MCP is already active, remove it (except for default MCP which must stay active)
        if (prev.includes(mcpId)) {
          if (mcpId === 'default' || prev.length === 1) {
            return prev; // Keep at least one MCP active
          }
          return prev.filter(id => id !== mcpId);
        } 
        // Otherwise add it to active MCPs
        return [...prev, mcpId];
      });
    },
    
    // Add a new MCP
    addMCP: (mcpData) => {
      const newMCP = {
        id: `mcp-${Date.now()}`,
        name: mcpData.name,
        endpoint: mcpData.endpoint,
        type: mcpData.type || 'general',
        isDefault: false
      };
      
      setMcpList(prev => [...prev, newMCP]);
      return true;
    },
    
    // Delete an MCP
    deleteMCP: (id) => {
      // Remove from active MCPs if it's active
      if (activeMCPs.includes(id)) {
        setActiveMCPs(prev => prev.filter(mcpId => mcpId !== id));
      }
      
      // Remove from MCP list
      setMcpList(prev => prev.filter(mcp => mcp.id !== id));
      return true;
    }
  };
  
  // Message handling functions
  const messageHandlers = {
    // Send a new message
    sendMessage: async () => {
      if (inputMessage.trim() === '') return;
      
      const newMessage = {
        id: Date.now(),
        sender: 'user',
        content: inputMessage,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      const currentInput = inputMessage;
      setInputMessage('');
      
      // Get AI response
      try {
        const response = await aiService.getResponse(currentInput);
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'ai',
          content: response,
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        console.error('Error getting AI response:', error);
      }
    },
    
    // Copy message to clipboard
    copyMessage: (content) => {
      navigator.clipboard.writeText(content);
      // Would show a toast notification in a real app
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
      />
      
      {showChats && (
        <ChatsModal 
          conversations={conversations}
          onClose={() => setShowChats(false)}
          onSelectConversation={conversationsService.selectConversation}
          onNewChat={conversationsService.startNewChat}
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
    </div>
  );
}

export default App;