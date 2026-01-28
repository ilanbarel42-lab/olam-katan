import React, { useState } from 'react'
import { getChildren } from '../utils/storage'

function SettingsTab({ ageGroups, onAgeGroupsChange }) {
  const [newName, setNewName] = useState('')
  const [newMinAge, setNewMinAge] = useState('')
  const [newMaxAge, setNewMaxAge] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('')
  const [newRatio, setNewRatio] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMinAge, setEditMinAge] = useState('')
  const [editMaxAge, setEditMaxAge] = useState('')
  const [editMaxCapacity, setEditMaxCapacity] = useState('')
  const [editRatio, setEditRatio] = useState('')

  const handleAddGroup = () => {
    const minAge = parseInt(newMinAge, 10)
    const maxAge = parseInt(newMaxAge, 10)
    const maxCapacity = parseInt(newMaxCapacity, 10)
    const ratio = parseFloat(newRatio)
    
    if (!newName.trim()) {
      alert('Please enter a group name')
      return
    }
    
    if (isNaN(minAge) || isNaN(maxAge) || minAge < 0 || maxAge < minAge) {
      alert('Please enter valid age range (min age must be less than or equal to max age)')
      return
    }
    
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      alert('Please enter a valid max capacity (must be at least 1)')
      return
    }
    
    if (isNaN(ratio) || ratio <= 0) {
      alert('Please enter a valid regulation ratio (children per employee, must be > 0)')
      return
    }
    
    const newGroup = {
      id: Date.now().toString(),
      name: newName.trim(),
      minAge,
      maxAge,
      label: `${minAge}-${maxAge} months`,
      maxCapacity,
      ratio
    }
    
    const updatedGroups = [...ageGroups, newGroup].sort((a, b) => a.minAge - b.minAge)
    onAgeGroupsChange(updatedGroups)
    
    setNewName('')
    setNewMinAge('')
    setNewMaxAge('')
    setNewMaxCapacity('')
    setNewRatio('')
  }

  const handleDeleteGroup = (groupId) => {
    const children = getChildren()
    const childrenInGroup = children.filter(child => child.group === groupId)
    
    if (childrenInGroup.length > 0) {
      alert(`Cannot delete this age group. There are ${childrenInGroup.length} children assigned to it.`)
      return
    }
    
    if (window.confirm('Are you sure you want to delete this age group?')) {
      const updatedGroups = ageGroups.filter(group => group.id !== groupId)
      onAgeGroupsChange(updatedGroups)
    }
  }

  const handleStartEdit = (group) => {
    setEditingId(group.id)
    setEditName(group.name || '')
    setEditMinAge(group.minAge.toString())
    setEditMaxAge(group.maxAge.toString())
    setEditMaxCapacity((group.maxCapacity || 10).toString())
    setEditRatio(
      group.ratio !== undefined && group.ratio !== null
        ? group.ratio.toString()
        : ''
    )
  }

  const handleSaveEdit = (groupId) => {
    const minAge = parseInt(editMinAge, 10)
    const maxAge = parseInt(editMaxAge, 10)
    const maxCapacity = parseInt(editMaxCapacity, 10)
    const ratio = parseFloat(editRatio)
    
    if (!editName.trim()) {
      alert('Please enter a group name')
      return
    }
    
    if (isNaN(minAge) || isNaN(maxAge) || minAge < 0 || maxAge < minAge) {
      alert('Please enter valid age range (min age must be less than or equal to max age)')
      return
    }
    
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      alert('Please enter a valid max capacity (must be at least 1)')
      return
    }
    
    if (isNaN(ratio) || ratio <= 0) {
      alert('Please enter a valid regulation ratio (children per employee, must be > 0)')
      return
    }
    
    const updatedGroups = ageGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          name: editName.trim(),
          minAge,
          maxAge,
          label: `${minAge}-${maxAge} months`,
          maxCapacity,
          ratio
        }
      }
      return group
    }).sort((a, b) => a.minAge - b.minAge)
    
    onAgeGroupsChange(updatedGroups)
    setEditingId(null)
    setEditName('')
    setEditMinAge('')
    setEditMaxAge('')
    setEditMaxCapacity('')
    setEditRatio('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditMinAge('')
    setEditMaxAge('')
    setEditMaxCapacity('')
    setEditRatio('')
  }

  const handleMaxCapacityChange = (groupId, newMaxCapacity) => {
    const maxCapacity = parseInt(newMaxCapacity, 10)
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      return
    }
    
    const updatedGroups = ageGroups.map(group => {
      if (group.id === groupId) {
        return { ...group, maxCapacity }
      }
      return group
    })
    
    onAgeGroupsChange(updatedGroups)
  }

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h2>Age Group Configuration</h2>
        <p style={{ marginBottom: '20px', color: '#666', fontFamily: 'Assistant, sans-serif' }}>
          Configure the age group categories used for organizing children. These groups will appear in the Children tab.
        </p>
        
        <ul className="age-group-list">
          {ageGroups.map(group => (
            <li key={group.id} className="age-group-list-item">
              {editingId === group.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Group name (e.g., Infants)"
                      style={{ flex: 1, padding: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={editMinAge}
                      onChange={(e) => setEditMinAge(e.target.value)}
                      placeholder="Min"
                      style={{ width: '80px', padding: '8px' }}
                      min="0"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      value={editMaxAge}
                      onChange={(e) => setEditMaxAge(e.target.value)}
                      placeholder="Max"
                      style={{ width: '80px', padding: '8px' }}
                      min="0"
                    />
                    <span>months</span>
                    <span style={{ marginRight: '20px' }}>Max Capacity:</span>
                    <input
                      type="number"
                      value={editMaxCapacity}
                      onChange={(e) => setEditMaxCapacity(e.target.value)}
                      placeholder="Max"
                      style={{ width: '80px', padding: '8px' }}
                      min="1"
                    />
                    <span style={{ marginRight: '20px' }}>Ratio (children / employee):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editRatio}
                      onChange={(e) => setEditRatio(e.target.value)}
                      placeholder="e.g., 6"
                      style={{ width: '80px', padding: '8px' }}
                      min="0.1"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSaveEdit(group.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '16px' }}>
                      {group.name || 'Unnamed Group'}
                    </div>
                    <div className="range" style={{ color: '#666', marginBottom: '5px', fontFamily: 'Assistant, sans-serif' }}>
                      {group.label} • Max Capacity: {group.maxCapacity || 'Not set'} • Ratio: {group.ratio || 'Not set'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={group.maxCapacity || ''}
                      onChange={(e) => handleMaxCapacityChange(group.id, e.target.value)}
                      placeholder="Max"
                      style={{ width: '80px', padding: '8px', textAlign: 'center' }}
                      min="1"
                      title="Edit max capacity"
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleStartEdit(group)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Add New Age Group</h3>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>Group Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Infants, Toddlers"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Minimum Age (months)</label>
              <input
                type="number"
                value={newMinAge}
                onChange={(e) => setNewMinAge(e.target.value)}
                placeholder="e.g., 5"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Maximum Age (months)</label>
              <input
                type="number"
                value={newMaxAge}
                onChange={(e) => setNewMaxAge(e.target.value)}
                placeholder="e.g., 10"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Max Capacity</label>
              <input
                type="number"
                value={newMaxCapacity}
                onChange={(e) => setNewMaxCapacity(e.target.value)}
                placeholder="e.g., 10"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Regulation Ratio (children / employee)</label>
              <input
                type="number"
                step="0.1"
                value={newRatio}
                onChange={(e) => setNewRatio(e.target.value)}
                placeholder="e.g., 6"
                min="0.1"
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddGroup}
          >
            Add Age Group
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab
