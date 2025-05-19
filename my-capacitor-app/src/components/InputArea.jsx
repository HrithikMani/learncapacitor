import React, { useRef, useEffect } from 'react';

const InputArea = ({ inputMessage, setInputMessage, onSendMessage }) => {
  const inputRef = useRef(null);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="input-area">
      <div className="input-container">
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onSendMessage();
            }
          }}
          ref={inputRef}
        />
        <button 
          className={`send-button ${inputMessage.trim() ? 'active' : ''}`}
          onClick={onSendMessage}
          disabled={!inputMessage.trim()}
        >
          <span className="send-icon">➤</span>
        </button>
      </div>
      
      <div className="input-info">
        <span className="input-hint">Press Enter to send</span>
        {/* "Powered by Default AI" text removed as requested */}
      </div>
    </div>
  );
};

export default InputArea;