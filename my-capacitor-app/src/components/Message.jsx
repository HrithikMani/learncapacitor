import React from 'react';

const Message = ({ message, activeMCPName, formatTime, onCopyMessage }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'ai-message'}`}>
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
          </span>
        </div>
        <div className="message-text">{message.content}</div>
        {!isUser && (
          <div className="message-actions">
            <button 
              className="action-button copy-button" 
              title="Copy response"
              onClick={() => onCopyMessage(message.content)}
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