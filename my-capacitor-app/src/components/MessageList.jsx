import React from 'react';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, isTyping, activeMCPs, mcpList, onCopyMessage, messagesEndRef }) => {
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get MCP name by id
  const getMCPName = (id) => {
    const mcp = mcpList.find(m => m.id === id);
    return mcp ? mcp.name : "Unknown AI";
  };

  // Get active MCP details
  const getActiveMCPDetails = () => {
    if (!Array.isArray(activeMCPs) || activeMCPs.length === 0) return "No AI Selected";
    if (activeMCPs.length === 1) {
      return getMCPName(activeMCPs[0]);
    }
    return `Multiple AIs (${activeMCPs.length})`;
  };

  return (
    <div className="messages-container">
      <div className="date-divider">Today</div>
      
      {messages.map(message => (
        <Message 
          key={message.id}
          message={message}
          activeMCPName={getActiveMCPDetails()}
          formatTime={formatTime}
          onCopyMessage={onCopyMessage}
        />
      ))}
      
      {isTyping && <TypingIndicator activeMCPName={getActiveMCPDetails()} />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;