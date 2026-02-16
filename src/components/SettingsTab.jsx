import React, { useState } from 'react'
import { getChildren } from '../utils/storage'

function SettingsTab({ ageGroups, onAgeGroupsChange }) {
  const [newName, setNewName] = useState('')
  const [newMinAge, setNewMinAge] = useState('')
  const [newMaxAge, setNewMaxAge] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('')
  const [newRatio, setNewRatio] = useState('')
  const [newMinLead, setNewMinLead] = useState('1')
  const [newMinAssistant, setNewMinAssistant] = useState('1')
  const [newMinCook, setNewMinCook] = useState('0')
  const [newOptLead, setNewOptLead] = useState('2')
  const [newOptAssistant, setNewOptAssistant] = useState('2')
  const [newOptCook, setNewOptCook] = useState('0')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMinAge, setEditMinAge] = useState('')
  const [editMaxAge, setEditMaxAge] = useState('')
  const [editMaxCapacity, setEditMaxCapacity] = useState('')
  const [editRatio, setEditRatio] = useState('')
  const [editMinLead, setEditMinLead] = useState('')
  const [editMinAssistant, setEditMinAssistant] = useState('')
  const [editMinCook, setEditMinCook] = useState('')
  const [editOptLead, setEditOptLead] = useState('')
  const [editOptAssistant, setEditOptAssistant] = useState('')
  const [editOptCook, setEditOptCook] = useState('')

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

    const minLead = Math.max(0, parseInt(newMinLead, 10) || 0)
    const minAssistant = Math.max(0, parseInt(newMinAssistant, 10) || 0)
    const minCook = Math.max(0, parseInt(newMinCook, 10) || 0)
    const optLead = Math.max(minLead, parseInt(newOptLead, 10) || minLead)
    const optAssistant = Math.max(minAssistant, parseInt(newOptAssistant, 10) || minAssistant)
    const optCook = Math.max(minCook, parseInt(newOptCook, 10) || minCook)
    
    const newGroup = {
      id: Date.now().toString(),
      name: newName.trim(),
      minAge,
      maxAge,
      label: `${minAge}-${maxAge} months`,
      maxCapacity,
      ratio,
      staffingMin: { lead: minLead, assistant: minAssistant, cook: minCook },
      staffingOptimal: { lead: optLead, assistant: optAssistant, cook: optCook }
    }
    
    const updatedGroups = [...ageGroups, newGroup].sort((a, b) => a.minAge - b.minAge)
    onAgeGroupsChange(updatedGroups)
    
    setNewName('')
    setNewMinAge('')
    setNewMaxAge('')
    setNewMaxCapacity('')
    setNewRatio('')
  }

  const getStaffing = (group) => ({
    min: group.staffingMin || { lead: 1, assistant: 1, cook: 0 },
    opt: group.staffingOptimal || { lead: 2, assistant: 2, cook: 0 }
  })

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
    const sm = group.staffingMin || { lead: 1, assistant: 1, cook: 0 }
    const so = group.staffingOptimal || { lead: 2, assistant: 2, cook: 0 }
    setEditMinLead(sm.lead.toString())
    setEditMinAssistant(sm.assistant.toString())
    setEditMinCook((sm.cook || 0).toString())
    setEditOptLead(so.lead.toString())
    setEditOptAssistant(so.assistant.toString())
    setEditOptCook((so.cook || 0).toString())
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

    const minLead = Math.max(0, parseInt(editMinLead, 10) || 0)
    const minAssistant = Math.max(0, parseInt(editMinAssistant, 10) || 0)
    const minCook = Math.max(0, parseInt(editMinCook, 10) || 0)
    const optLead = Math.max(minLead, parseInt(editOptLead, 10) || minLead)
    const optAssistant = Math.max(minAssistant, parseInt(editOptAssistant, 10) || minAssistant)
    const optCook = Math.max(minCook, parseInt(editOptCook, 10) || minCook)
    
    const updatedGroups = ageGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          name: editName.trim(),
          minAge,
          maxAge,
          label: `${minAge}-${maxAge} months`,
          maxCapacity,
          ratio,
          staffingMin: { lead: minLead, assistant: minAssistant, cook: minCook },
          staffingOptimal: { lead: optLead, assistant: optAssistant, cook: optCook }
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
                    <span style={{ marginRight: '20px' }}>Ratio:</span>
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
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600' }}>Staffing Min (L/A/C):</span>
                    <input type="number" value={editMinLead} onChange={(e) => setEditMinLead(e.target.value)} placeholder="Lead" style={{ width: '60px', padding: '8px' }} min="0" />
                    <input type="number" value={editMinAssistant} onChange={(e) => setEditMinAssistant(e.target.value)} placeholder="Asst" style={{ width: '60px', padding: '8px' }} min="0" />
                    <input type="number" value={editMinCook} onChange={(e) => setEditMinCook(e.target.value)} placeholder="Cook" style={{ width: '60px', padding: '8px' }} min="0" />
                    <span style={{ fontWeight: '600', marginRight: '10px' }}>Optimal:</span>
                    <input type="number" value={editOptLead} onChange={(e) => setEditOptLead(e.target.value)} placeholder="Lead" style={{ width: '60px', padding: '8px' }} min="0" />
                    <input type="number" value={editOptAssistant} onChange={(e) => setEditOptAssistant(e.target.value)} placeholder="Asst" style={{ width: '60px', padding: '8px' }} min="0" />
                    <input type="number" value={editOptCook} onChange={(e) => setEditOptCook(e.target.value)} placeholder="Cook" style={{ width: '60px', padding: '8px' }} min="0" />
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
                      {group.label} • Max: {group.maxCapacity || '?'} • Ratio: {group.ratio ?? '?'} • Staff Min: {(() => {
                        const sm = group.staffingMin || { lead: 1, assistant: 1, cook: 0 }
                        return `${sm.lead}L/${sm.assistant}A/${sm.cook ?? 0}C`
                      })()} • Opt: {(() => {
                        const so = group.staffingOptimal || { lead: 2, assistant: 2, cook: 0 }
                        return `${so.lead}L/${so.assistant}A/${so.cook ?? 0}C`
                      })()}
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
              <label>Regulation Ratio</label>
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
          <div className="form-row" style={{ marginBottom: '15px' }}>
            <span style={{ fontWeight: '600', marginRight: '10px' }}>Staffing Min (Lead / Assistant / Cook):</span>
            <input type="number" value={newMinLead} onChange={(e) => setNewMinLead(e.target.value)} placeholder="Lead" min="0" style={{ width: '70px' }} />
            <input type="number" value={newMinAssistant} onChange={(e) => setNewMinAssistant(e.target.value)} placeholder="Asst" min="0" style={{ width: '70px' }} />
            <input type="number" value={newMinCook} onChange={(e) => setNewMinCook(e.target.value)} placeholder="Cook" min="0" style={{ width: '70px' }} />
            <span style={{ fontWeight: '600', marginRight: '10px' }}>Optimal:</span>
            <input type="number" value={newOptLead} onChange={(e) => setNewOptLead(e.target.value)} placeholder="Lead" min="0" style={{ width: '70px' }} />
            <input type="number" value={newOptAssistant} onChange={(e) => setNewOptAssistant(e.target.value)} placeholder="Asst" min="0" style={{ width: '70px' }} />
            <input type="number" value={newOptCook} onChange={(e) => setNewOptCook(e.target.value)} placeholder="Cook" min="0" style={{ width: '70px' }} />
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
