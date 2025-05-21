import React from 'react';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, streamingResponse, isTyping, activeMCPs, mcpList, onCopyMessage, messagesEndRef }) => {
  // Debug log for render
  console.log('MessageList rendering with:', {
    messageCount: messages.length,
    streamingResponse: streamingResponse ? 'present' : 'none',
    isTyping
  });
  
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
      
      {/* Regular messages */}
      {messages.map(message => (
        <Message 
          key={message.id}
          message={message}
          activeMCPName={getActiveMCPDetails()}
          formatTime={formatTime}
          onCopyMessage={onCopyMessage}
        />
      ))}
      
      {/* Streaming response if active */}
      {streamingResponse && (
        <Message 
          key={`streaming-${streamingResponse.id}`}
          message={streamingResponse}
          activeMCPName={getActiveMCPDetails()}
          formatTime={formatTime}
          onCopyMessage={onCopyMessage}
          isStreaming={true}
        />
      )}
      
      {/* Show typing indicator only when no streaming is happening */}
      {isTyping && !streamingResponse && <TypingIndicator activeMCPName={getActiveMCPDetails()} />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;