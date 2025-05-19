import React from 'react';

const Header = ({ primaryMCP, onChatsClick, onSettingsClick }) => {
  return (
    <div className="app-header">
      <button className="header-button chats-button" onClick={onChatsClick}>
        <span className="button-icon">💬</span>
        <span>Chats</span>
      </button>
      <div className="header-title">
        <h1>Chat Session</h1>
        <div className="model-badge">{primaryMCP}</div>
      </div>
      <button className="header-button settings-button" onClick={onSettingsClick}>
        <span className="button-icon">⚙️</span>
      </button>
    </div>
  );
};

export default Header;