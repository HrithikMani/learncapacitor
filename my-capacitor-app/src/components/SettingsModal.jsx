import React, { useState, useEffect } from 'react';
import mcpService from '../services/mcpService'; // Adjust path as needed
import '../SettingsModal.css'; // Import the CSS file

const SettingsModal = ({ onClose }) => {
  // State management
  const [mcpList, setMcpList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // New MCP form state
  const [newMCPName, setNewMCPName] = useState('');
  const [newMCPUrl, setNewMCPUrl] = useState('');
  const [newMCPType, setNewMCPType] = useState('general');
  const [addingMCP, setAddingMCP] = useState(false);
  
  // Testing state
  const [testingServices, setTestingServices] = useState(new Set());

  // Load MCP services on component mount
  useEffect(() => {
    loadMCPServices();
  }, []);

  const loadMCPServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mcpService.getAllServices();
      setMcpList(response.data.services || []);
    } catch (err) {
      setError(err.message || 'Failed to load MCP services');
      console.error('Error loading MCP services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMCP = async () => {
    if (!newMCPName.trim() || !newMCPUrl.trim()) return;
    
    try {
      setAddingMCP(true);
      setError(null);
      
      const serviceData = {
        name: newMCPName.trim(),
        url: newMCPUrl.trim(),
        type: newMCPType,
        enabled: true
      };
      
      await mcpService.addService(serviceData);
      
      // Reset form
      setNewMCPName('');
      setNewMCPUrl('');
      setNewMCPType('general');
      
      // Reload services
      await loadMCPServices();
    } catch (err) {
      setError(err.message || 'Failed to add MCP service');
      console.error('Error adding MCP service:', err);
    } finally {
      setAddingMCP(false);
    }
  };

  const handleToggleMCP = async (serviceId) => {
    try {
      setError(null);
      const service = mcpList.find(s => s.id === serviceId);
      if (!service) return;
      
      // Optimistically update UI first
      setMcpList(prevList => 
        prevList.map(mcp => 
          mcp.id === serviceId 
            ? { ...mcp, enabled: !mcp.enabled }
            : mcp
        )
      );
      
      // Then make API call
      await mcpService.toggleService(serviceId, !service.enabled);
    } catch (err) {
      // Revert the optimistic update on error
      setMcpList(prevList => 
        prevList.map(mcp => 
          mcp.id === serviceId 
            ? { ...mcp, enabled: serviceId.enabled }
            : mcp
        )
      );
      setError(err.message || 'Failed to toggle MCP service');
      console.error('Error toggling MCP service:', err);
    }
  };

  const handleDeleteMCP = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this MCP service?')) return;
    
    const serviceToDelete = mcpList.find(s => s.id === serviceId);
    if (!serviceToDelete) return;
    
    try {
      setError(null);
      
      // Optimistically remove from UI
      setMcpList(prevList => prevList.filter(mcp => mcp.id !== serviceId));
      
      // Then make API call
      await mcpService.deleteService(serviceId);
    } catch (err) {
      // Revert the optimistic update on error
      setMcpList(prevList => [...prevList, serviceToDelete]);
      setError(err.message || 'Failed to delete MCP service');
      console.error('Error deleting MCP service:', err);
    }
  };

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

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Settings</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading MCP services...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {/* Error Display */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <h3 className="section-title">Model Connection Points</h3>
          
          {/* MCP Type Filter */}
          <div className="filter-section">
            <span className="filter-label">Filter by type:</span>
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
              if (filter !== 'all' && filter !== type) return null;
              
              return (
                <div key={type} className="mcp-group">
                  <h4 className="mcp-type-header">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </h4>
                  
                  <div className="mcp-list">
                    {mcps.map((mcp) => (
                      <div key={mcp.id} className="mcp-item">
                        <div className="mcp-info">
                          <div className="mcp-icon">
                            {mcp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="mcp-details">
                            <div className="mcp-name">{mcp.name}</div>
                            <div className="mcp-endpoint">{mcp.url}</div>
                          </div>
                        </div>
                        <div className="mcp-actions">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={mcp.enabled}
                              onChange={() => handleToggleMCP(mcp.id)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          
                          <button 
                            className="delete-button"
                            onClick={() => handleDeleteMCP(mcp.id)}
                            title="Delete MCP"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6"></polyline>
                              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            </svg>
                          </button>
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
            <h4 className="add-mcp-title">Add New MCP</h4>
            
            <div className="input-group">
              <input
                type="text"
                className="mcp-input"
                placeholder="MCP Name"
                value={newMCPName}
                onChange={(e) => setNewMCPName(e.target.value)}
              />
              
              <input
                type="url"
                className="mcp-input"
                placeholder="API Endpoint URL"
                value={newMCPUrl}
                onChange={(e) => setNewMCPUrl(e.target.value)}
              />
              
              <div className="select-wrapper">
                <label className="select-label">MCP Type:</label>
                <select 
                  value={newMCPType} 
                  onChange={(e) => setNewMCPType(e.target.value)}
                  className="mcp-select"
                >
                  <option value="general">General</option>
                  <option value="math">Math</option>
                  <option value="text">Text</option>
                  <option value="weather">Weather</option>
                  <option value="analytics">Analytics</option>
                  <option value="database">Database</option>
                </select>
              </div>
              
              <button 
                className={`add-mcp-button ${
                  (!newMCPName.trim() || !newMCPUrl.trim() || addingMCP) ? 'disabled' : ''
                }`}
                onClick={handleAddMCP}
                disabled={!newMCPName.trim() || !newMCPUrl.trim() || addingMCP}
              >
                {addingMCP ? 'Adding...' : '+ Add MCP'}
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