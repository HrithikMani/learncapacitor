import React from 'react';

const TypingIndicator = ({ activeMCPName }) => {
  return (
    <div className="message ai-message">
      <div className="avatar">
        🤖
      </div>
      <div className="message-content typing-indicator">
        <div className="message-header">
          <span className="message-sender">
            {activeMCPName}
          </span>
          <span className="message-typing">typing...</span>
        </div>
        <div className="dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;