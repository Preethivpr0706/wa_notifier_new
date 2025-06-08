// src/components/Contacts/AddListModal.jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import './AddListModal.css';

const AddListModal = ({ onClose, onAdd, isLoading }) => {
  const [listName, setListName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      setError('List name is required');
      return;
    }

    try {
      await onAdd(listName);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create list');
    }
  };

  return (
    <div className="addList modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New List</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="listName">List Name</label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddListModal;
