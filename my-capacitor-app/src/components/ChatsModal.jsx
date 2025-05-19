import React from 'react';

const ChatsModal = ({ conversations, onClose, onSelectConversation, onNewChat, onDeleteConversation }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <h2>Your Conversations</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="sidebar-content">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className="conversation-item"
            >
              <div 
                className="conversation-info"
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-title">{conv.title}</div>
                <div className="conversation-preview">{conv.preview}</div>
                <div className="conversation-date">{conv.date}</div>
              </div>
              <button 
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this conversation?')) {
                    onDeleteConversation(conv.id);
                  }
                }}
                title="Delete conversation"
              >
                🗑️
              </button>
            </div>
          ))}
          
          {conversations.length === 0 && (
            <div className="no-conversations">
              <p>No conversations yet</p>
              <p>Start a new chat to begin</p>
            </div>
          )}
        </div>
        
        <div className="sidebar-footer">
          <button 
            className="new-chat-button"
            onClick={onNewChat}
          >
            <span className="button-icon">+</span>
            New Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatsModal;