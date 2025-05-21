import React from 'react';

const Message = ({ message, activeMCPName, formatTime, onCopyMessage, isStreaming }) => {
  const isUser = message.sender === 'user';
  
  // Debug render
  console.log(`Rendering message from ${message.sender}:`, {
    contentType: typeof message.content,
    isArray: Array.isArray(message.content),
    isStreaming
  });
  
  // Helper function to render content, whether it's a string or structured format
  const renderContent = (content) => {
    // If content is empty, null or undefined
    if (content === null || content === undefined || content === '') {
      return '';
    }
    
    // If content is a string, render it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // If content is an array (structured content from Claude)
    if (Array.isArray(content)) {
      return content.map((item, index) => {
        if (typeof item === 'string') {
          return <span key={index}>{item}</span>;
        }
        
        // Handle content object with type/text structure
        if (item && item.type === 'text') {
          return <span key={index}>{item.text}</span>;
        }
        
        // For tool calls or other structured content, show a simple representation
        if (item && item.type === 'tool-call') {
          return (
            <div key={index} className="tool-call">
              <div className="tool-call-header">Using tool: {item.toolName}</div>
              <div className="tool-call-args">
                {JSON.stringify(item.args, null, 2)}
              </div>
            </div>
          );
        }
        
        // For tool results
        if (item && item.type === 'tool-result') {
          return (
            <div key={index} className="tool-result">
              <div className="tool-result-header">Tool result from: {item.toolName}</div>
              <div className="tool-result-content">
                {item.result && item.result.content ? 
                  renderContent(item.result.content) : 
                  JSON.stringify(item.result, null, 2)}
              </div>
            </div>
          );
        }
        
        // Fallback for unknown content types
        return <span key={index}>[Complex content]</span>;
      });
    }
    
    // Fallback for any other type of content
    return JSON.stringify(content);
  };
  
  // Helper to get copyable text from structured content
  const getTextForCopy = (content) => {
    if (!content) return '';
    
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content.map(item => {
        if (typeof item === 'string') return item;
        if (item && item.type === 'text') return item.text;
        if (item && item.type === 'tool-call') 
          return `[Tool Call: ${item.toolName}]\n${JSON.stringify(item.args, null, 2)}`;
        if (item && item.type === 'tool-result') 
          return `[Tool Result: ${item.toolName}]\n${JSON.stringify(item.result, null, 2)}`;
        return JSON.stringify(item, null, 2);
      }).join('\n');
    }
    
    return JSON.stringify(content, null, 2);
  };
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'ai-message'} ${isStreaming ? 'streaming' : ''}`}>
      <div className="avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {isUser ? 'You' : activeMCPName}
          </span>
          <span className="message-time">
            {formatTime(message.timestamp)}
            {isStreaming && ' (typing...)'}
          </span>
        </div>
        <div className="message-text">
          {renderContent(message.content)}
          {isStreaming && <span className="cursor">|</span>}
        </div>
        {!isUser && !isStreaming && (
          <div className="message-actions">
            <button 
              className="action-button copy-button" 
              title="Copy response"
              onClick={() => onCopyMessage(getTextForCopy(message.content))}
            >
              <span className="action-icon">📋</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;