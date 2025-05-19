import React, { useState } from 'react';

const SettingsModal = ({ mcpList, activeMCPs = [], onClose, onToggleMCP, onDeleteMCP, onAddMCP }) => {
  const [newMCPName, setNewMCPName] = useState('');
  const [newMCPEndpoint, setNewMCPEndpoint] = useState('');
  const [newMCPType, setNewMCPType] = useState('general');
  const [filter, setFilter] = useState('all');

  // Group MCPs by type
  const mcpsByType = mcpList.reduce((groups, mcp) => {
    const type = mcp.type || 'general';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(mcp);
    return groups;
  }, {});

  // Get unique MCP types for filter
  const mcpTypes = ['all', ...new Set(mcpList.map(mcp => mcp.type || 'general'))];
  
  const handleAddMCP = () => {
    if (newMCPName.trim() && newMCPEndpoint.trim()) {
      onAddMCP({
        name: newMCPName,
        endpoint: newMCPEndpoint,
        type: newMCPType
      });
      setNewMCPName('');
      setNewMCPEndpoint('');
    }
  };

  // Check if an MCP is active - with null check for activeMCPs
  const isMCPActive = (mcpId) => {
    return Array.isArray(activeMCPs) && activeMCPs.includes(mcpId);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="modal-content">
          <h3>Model Connection Points</h3>
          
          {/* MCP Type Filter */}
          <div className="mcp-filter">
            <span>Filter by type:</span>
            <div className="filter-buttons">
              {mcpTypes.map(type => (
                <button 
                  key={type}
                  className={`filter-button ${filter === type ? 'active' : ''}`}
                  onClick={() => setFilter(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* MCP Lists by Type */}
          <div className="mcp-groups">
            {Object.entries(mcpsByType).map(([type, mcps]) => {
              // Skip if filtered out
              if (filter !== 'all' && filter !== type) return null;
              
              return (
                <div key={type} className="mcp-group">
                  <h4 className="mcp-type-header">{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                  
                  <div className="mcp-list">
                    {mcps.map((mcp) => (
                      <div key={mcp.id} className="mcp-item">
                        <div className="mcp-info">
                          <div className="mcp-icon" style={{ 
                            backgroundColor: isMCPActive(mcp.id) ? 'var(--success-light)' : 'var(--neutral-100)' 
                          }}>
                            {mcp.type ? mcp.type.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <div>
                            <div className="mcp-name">{mcp.name}</div>
                            <div className="mcp-endpoint">{mcp.endpoint}</div>
                          </div>
                        </div>
                        <div className="mcp-actions">
                          {/* Toggle Switch */}
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={isMCPActive(mcp.id)}
                              onChange={() => onToggleMCP(mcp.id)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          
                          {/* Delete Button (not for default MCPs) */}
                          {!mcp.isDefault && (
                            <button 
                              className="delete-button"
                              onClick={() => onDeleteMCP(mcp.id)}
                              title="Delete MCP"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Add New MCP Section */}
          <div className="add-mcp-section">
            <h4>Add New MCP</h4>
            <div className="mcp-input-group">
              <input
                type="text"
                className="mcp-input"
                placeholder="MCP Name"
                value={newMCPName}
                onChange={(e) => setNewMCPName(e.target.value)}
              />
              
              <input
                type="text"
                className="mcp-input"
                placeholder="API Endpoint URL"
                value={newMCPEndpoint}
                onChange={(e) => setNewMCPEndpoint(e.target.value)}
              />
              
              <div className="mcp-type-selector">
                <label>MCP Type:</label>
                <select 
                  value={newMCPType} 
                  onChange={(e) => setNewMCPType(e.target.value)}
                  className="mcp-select"
                >
                  <option value="general">General</option>
                  <option value="products">Products</option>
                  <option value="orders">Orders</option>
                  <option value="users">Users</option>
                  <option value="analytics">Analytics</option>
                </select>
              </div>
              
              <button 
                className={`add-mcp-button ${
                  newMCPName.trim() && newMCPEndpoint.trim() ? 'active' : 'disabled'
                }`}
                onClick={handleAddMCP}
                disabled={!newMCPName.trim() || !newMCPEndpoint.trim()}
              >
                <span className="button-icon">+</span>
                Add MCP
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="close-modal-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;