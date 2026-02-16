import React, { useState } from 'react'
import { getChildren } from '../utils/storage'
import { t } from '../i18n'

function SettingsTab({ ageGroups, onAgeGroupsChange }) {
  const [newName, setNewName] = useState('')
  const [newMinAge, setNewMinAge] = useState('')
  const [newMaxAge, setNewMaxAge] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('')
  const [newRatio, setNewRatio] = useState('')
  const [newMinLead, setNewMinLead] = useState('1')
  const [newMinAssistant, setNewMinAssistant] = useState('1')
  const [newOptLead, setNewOptLead] = useState('2')
  const [newOptAssistant, setNewOptAssistant] = useState('2')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMinAge, setEditMinAge] = useState('')
  const [editMaxAge, setEditMaxAge] = useState('')
  const [editMaxCapacity, setEditMaxCapacity] = useState('')
  const [editRatio, setEditRatio] = useState('')
  const [editMinLead, setEditMinLead] = useState('')
  const [editMinAssistant, setEditMinAssistant] = useState('')
  const [editOptLead, setEditOptLead] = useState('')
  const [editOptAssistant, setEditOptAssistant] = useState('')

  const handleAddGroup = () => {
    const minAge = parseInt(newMinAge, 10)
    const maxAge = parseInt(newMaxAge, 10)
    const maxCapacity = parseInt(newMaxCapacity, 10)
    const ratio = parseFloat(newRatio)
    
    if (!newName.trim()) {
      alert(t.enterGroupName)
      return
    }
    
    if (isNaN(minAge) || isNaN(maxAge) || minAge < 0 || maxAge < minAge) {
      alert(t.validAgeRange)
      return
    }
    
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      alert(t.validCapacity)
      return
    }
    
    if (isNaN(ratio) || ratio <= 0) {
      alert(t.validRatio)
      return
    }

    const minLead = Math.max(0, parseInt(newMinLead, 10) || 0)
    const minAssistant = Math.max(0, parseInt(newMinAssistant, 10) || 0)
    const optLead = Math.max(minLead, parseInt(newOptLead, 10) || minLead)
    const optAssistant = Math.max(minAssistant, parseInt(newOptAssistant, 10) || minAssistant)
    
    const newGroup = {
      id: Date.now().toString(),
      name: newName.trim(),
      minAge,
      maxAge,
      label: `${minAge}-${maxAge} ${t.months}`,
      maxCapacity,
      ratio,
      staffingMin: { lead: minLead, assistant: minAssistant, cook: 0 },
      staffingOptimal: { lead: optLead, assistant: optAssistant, cook: 0 }
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
      alert(t.cannotDeleteGroup(childrenInGroup.length))
      return
    }
    
    if (window.confirm(t.confirmDeleteGroup)) {
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
    setEditOptLead(so.lead.toString())
    setEditOptAssistant(so.assistant.toString())
  }

  const handleSaveEdit = (groupId) => {
    const minAge = parseInt(editMinAge, 10)
    const maxAge = parseInt(editMaxAge, 10)
    const maxCapacity = parseInt(editMaxCapacity, 10)
    const ratio = parseFloat(editRatio)
    
    if (!editName.trim()) {
      alert(t.enterGroupName)
      return
    }
    
    if (isNaN(minAge) || isNaN(maxAge) || minAge < 0 || maxAge < minAge) {
      alert(t.validAgeRange)
      return
    }
    
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      alert(t.validCapacity)
      return
    }
    
    if (isNaN(ratio) || ratio <= 0) {
      alert(t.validRatio)
      return
    }

    const minLead = Math.max(0, parseInt(editMinLead, 10) || 0)
    const minAssistant = Math.max(0, parseInt(editMinAssistant, 10) || 0)
    const optLead = Math.max(minLead, parseInt(editOptLead, 10) || minLead)
    const optAssistant = Math.max(minAssistant, parseInt(editOptAssistant, 10) || minAssistant)
    
    const updatedGroups = ageGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          name: editName.trim(),
          minAge,
          maxAge,
          label: `${minAge}-${maxAge} ${t.months}`,
          maxCapacity,
          ratio,
          staffingMin: { lead: minLead, assistant: minAssistant, cook: 0 },
          staffingOptimal: { lead: optLead, assistant: optAssistant, cook: 0 }
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
        <h2>{t.ageGroupConfig}</h2>
        <p style={{ marginBottom: '20px', color: '#666', fontFamily: 'Assistant, sans-serif' }}>
          {t.settingsDescription}
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
                      placeholder={t.groupNamePlaceholder}
                      style={{ flex: 1, padding: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={editMinAge}
                      onChange={(e) => setEditMinAge(e.target.value)}
                      placeholder={t.minPlaceholder}
                      style={{ width: '80px', padding: '8px' }}
                      min="0"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      value={editMaxAge}
                      onChange={(e) => setEditMaxAge(e.target.value)}
                      placeholder={t.maxPlaceholder}
                      style={{ width: '80px', padding: '8px' }}
                      min="0"
                    />
                    <span>{t.months}</span>
                    <span style={{ marginRight: '20px' }}>{t.maxCapacity}:</span>
                    <input
                      type="number"
                      value={editMaxCapacity}
                      onChange={(e) => setEditMaxCapacity(e.target.value)}
                      placeholder={t.maxPlaceholder}
                      style={{ width: '80px', padding: '8px' }}
                      min="1"
                    />
                    <span style={{ marginRight: '20px' }}>{t.regulationRatio}:</span>
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
                    <span style={{ fontWeight: '600' }}>{t.staffingMinLabel}:</span>
                    <input type="number" value={editMinLead} onChange={(e) => setEditMinLead(e.target.value)} placeholder={t.leadShort} style={{ width: '60px', padding: '8px' }} min="0" />
                    <input type="number" value={editMinAssistant} onChange={(e) => setEditMinAssistant(e.target.value)} placeholder={t.asstShort} style={{ width: '60px', padding: '8px' }} min="0" />
                    <span style={{ fontWeight: '600', marginRight: '10px' }}>{t.optimalLabel}:</span>
                    <input type="number" value={editOptLead} onChange={(e) => setEditOptLead(e.target.value)} placeholder={t.leadShort} style={{ width: '60px', padding: '8px' }} min="0" />
                    <input type="number" value={editOptAssistant} onChange={(e) => setEditOptAssistant(e.target.value)} placeholder={t.asstShort} style={{ width: '60px', padding: '8px' }} min="0" />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSaveEdit(group.id)}
                    >
                      {t.save}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '16px' }}>
                      {group.name || t.unnamedGroup}
                    </div>
                    <div className="range" style={{ color: '#666', marginBottom: '5px', fontFamily: 'Assistant, sans-serif' }}>
                      {group.label} • {t.maxShort}: {group.maxCapacity || '?'} • {t.ratioShort}: {group.ratio ?? '?'} • {t.staffMinShort}: {(() => {
                        const sm = group.staffingMin || { lead: 1, assistant: 1, cook: 0 }
                        return t.staffingFormat(sm.lead, sm.assistant)
                      })()} • {t.optShort}: {(() => {
                        const so = group.staffingOptimal || { lead: 2, assistant: 2, cook: 0 }
                        return t.staffingFormat(so.lead, so.assistant)
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={group.maxCapacity || ''}
                      onChange={(e) => handleMaxCapacityChange(group.id, e.target.value)}
                      placeholder={t.maxPlaceholder}
                      style={{ width: '80px', padding: '8px', textAlign: 'center' }}
                      min="1"
                      title={t.editCapacity}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleStartEdit(group)}
                    >
                      {t.edit}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      {t.delete}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>{t.addAgeGroup}</h3>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>{t.groupName}</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.groupNamePlaceholder}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t.minAge}</label>
              <input
                type="number"
                value={newMinAge}
                onChange={(e) => setNewMinAge(e.target.value)}
                placeholder="5"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>{t.maxAge}</label>
              <input
                type="number"
                value={newMaxAge}
                onChange={(e) => setNewMaxAge(e.target.value)}
                placeholder="10"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>{t.maxCapacity}</label>
              <input
                type="number"
                value={newMaxCapacity}
                onChange={(e) => setNewMaxCapacity(e.target.value)}
                placeholder="10"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>{t.regulationRatio}</label>
              <input
                type="number"
                step="0.1"
                value={newRatio}
                onChange={(e) => setNewRatio(e.target.value)}
                placeholder="6"
                min="0.1"
              />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: '15px' }}>
            <span style={{ fontWeight: '600', marginRight: '10px' }}>{t.staffingMinLabel}:</span>
            <input type="number" value={newMinLead} onChange={(e) => setNewMinLead(e.target.value)} placeholder={t.leadShort} min="0" style={{ width: '70px' }} />
            <input type="number" value={newMinAssistant} onChange={(e) => setNewMinAssistant(e.target.value)} placeholder={t.asstShort} min="0" style={{ width: '70px' }} />
            <span style={{ fontWeight: '600', marginRight: '10px' }}>{t.optimalLabel}:</span>
            <input type="number" value={newOptLead} onChange={(e) => setNewOptLead(e.target.value)} placeholder={t.leadShort} min="0" style={{ width: '70px' }} />
            <input type="number" value={newOptAssistant} onChange={(e) => setNewOptAssistant(e.target.value)} placeholder={t.asstShort} min="0" style={{ width: '70px' }} />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddGroup}
          >
            {t.addAgeGroup}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab
