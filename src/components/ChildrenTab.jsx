import React, { useState, useEffect, useRef } from 'react'
import AgeGroupWidget from './AgeGroupWidget'
import { getChildren, saveChildren } from '../utils/storage'
import { t } from '../i18n'

// Transition date: Sept 1st ( Israeli year switch ). Returns next occurrence.
function getNextTransitionDate() {
  const today = new Date()
  const sep1ThisYear = new Date(today.getFullYear(), 8, 1) // month 8 = Sept
  if (today < sep1ThisYear) return sep1ThisYear
  return new Date(today.getFullYear() + 1, 8, 1)
}

function ChildrenTab({ ageGroups }) {
  const [children, setChildren] = useState([])
  const [editingRowId, setEditingRowId] = useState(null)
  const [selectedFilterGroup, setSelectedFilterGroup] = useState(null) // null = all groups
  const [sortOrder, setSortOrder] = useState(null) // null, 'asc', 'desc'
  const fileInputRef = useRef(null)

  useEffect(() => {
    const loadedChildren = getChildren()
    setChildren(loadedChildren)
  }, [])

  // Ref date for group calc: entryDate if valid, else today
  const getEntryRefDate = (entryDateStr) => {
    if (!entryDateStr) return new Date()
    const d = parseEuropeanDate(entryDateStr)
    return d || new Date()
  }

  const handleCellChange = (childId, field, value) => {
    const updatedChildren = children.map(child => {
      if (child.id === childId) {
        const updated = { ...child, [field]: value }
        
        // When DOB or entryDate changes, recalculate group (age at entry date) and nextGroup (Sept 1st)
        if (field === 'dateOfBirth') {
          const refDate = getEntryRefDate(updated.entryDate)
          const groupResult = calculateGroupAtDate(value, refDate, ageGroups)
          updated.group = groupResult ? groupResult.id : ''
          const nextResult = calculateGroupAtDate(value, getNextTransitionDate(), ageGroups)
          updated.nextGroup = nextResult ? nextResult.id : ''
        }
        if (field === 'entryDate') {
          const refDate = getEntryRefDate(value)
          const groupResult = refDate && updated.dateOfBirth
            ? calculateGroupAtDate(updated.dateOfBirth, refDate, ageGroups)
            : null
          updated.group = groupResult ? groupResult.id : ''
        }
        
        return updated
      }
      return child
    })
    
    setChildren(updatedChildren)
    saveChildren(updatedChildren)
  }

  const handleQuickRegister = (childId) => {
    const updatedChildren = children.map(child => {
      if (child.id === childId) {
        return { ...child, registerStatus: 'registered' }
      }
      return child
    })
    
    setChildren(updatedChildren)
    saveChildren(updatedChildren)
  }

  const handleDeleteChild = (childId, childName) => {
    const name = childName || t.thisChild
    if (window.confirm(t.deleteConfirm(name))) {
      const updatedChildren = children.filter(child => child.id !== childId)
      setChildren(updatedChildren)
      saveChildren(updatedChildren)
    }
  }

  const handleAddRow = () => {
    const newChild = {
      id: `new-${Date.now()}`,
      childName: '',
      dateOfBirth: '',
      entryDate: '',
      registerStatus: 'candidate',
      group: '',
      nextGroup: '',
      parent1Name: '',
      parent1Phone: '',
      parent2Name: '',
      parent2Phone: '',
      healthNotes: '',
      nutritionNotes: ''
    }

    const updatedChildren = [...children, newChild]
    setChildren(updatedChildren)
    saveChildren(updatedChildren)
    setEditingRowId(newChild.id)
  }

  const handleCSVImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        alert(t.csvEmpty)
        return
      }

      // Parse CSV (handle quoted values and commas)
      const parseCSVLine = (line) => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0].toLowerCase())
      const nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('parent'))
      const dobIndex = headers.findIndex(h => h.includes('date') || h.includes('birth') || h.includes('dob'))
      
      if (nameIndex === -1) {
        alert('CSV must contain a "name" column')
        return
      }

      const importedChildren = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const name = values[nameIndex]?.trim()
        
        if (!name) continue // Skip rows without names
        
        const dob = dobIndex !== -1 ? values[dobIndex]?.trim() : ''
        const entryDate = '' // no entry date in CSV; group uses today
        const refDate = entryDate ? (parseEuropeanDate(entryDate) || new Date()) : new Date()
        const groupResult = dob ? calculateGroupAtDate(dob, refDate, ageGroups) : null
        const nextResult = dob ? calculateGroupAtDate(dob, getNextTransitionDate(), ageGroups) : null
        importedChildren.push({
          id: Date.now().toString() + '-' + i,
          childName: name,
          dateOfBirth: dob,
          entryDate,
          registerStatus: 'candidate',
          group: groupResult ? groupResult.id : '',
          nextGroup: nextResult ? nextResult.id : '',
          parent1Name: '',
          parent1Phone: '',
          parent2Name: '',
          parent2Phone: '',
          healthNotes: '',
          nutritionNotes: ''
        })
      }

      if (importedChildren.length === 0) {
        alert('No valid children found in CSV file')
        return
      }

      const updatedChildren = [...children, ...importedChildren]
      setChildren(updatedChildren)
      saveChildren(updatedChildren)
      alert(`Successfully imported ${importedChildren.length} children`)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    
    reader.readAsText(file)
  }

  // Calculate age in months at a given reference date (day-of-month aware)
  const ageInMonthsAt = (birthDate, refDate) => {
    if (!birthDate || !refDate) return null
    let ageInMonths = (refDate.getFullYear() - birthDate.getFullYear()) * 12 +
      (refDate.getMonth() - birthDate.getMonth())
    if (refDate.getDate() < birthDate.getDate()) ageInMonths--
    return ageInMonths
  }

  // Calculate group based on child's age at a given date. Returns { id, name, ageInMonths } or null.
  const calculateGroupAtDate = (dateOfBirth, refDate, groups) => {
    const result = calculateGroupOrAgeStatus(dateOfBirth, refDate, groups)
    return result?.status === 'match' ? { id: result.id, name: result.name, ageInMonths: result.ageInMonths } : null
  }

  // Returns { status: 'match'|'tooSmall'|'tooBig', id?, name?, ageInMonths } or null
  const calculateGroupOrAgeStatus = (dateOfBirth, refDate, groups) => {
    if (!dateOfBirth || !refDate || !groups?.length) return null
    const birthDate = parseEuropeanDate(dateOfBirth)
    if (!birthDate) return null
    const ageInMonths = ageInMonthsAt(birthDate, refDate)
    if (ageInMonths === null) return null
    for (const group of groups) {
      if (ageInMonths >= group.minAge && ageInMonths <= group.maxAge) {
        return { status: 'match', id: group.id, name: group.name || group.label, ageInMonths }
      }
    }
    const minAge = Math.min(...groups.map(g => g.minAge))
    const maxAge = Math.max(...groups.map(g => g.maxAge))
    return { status: ageInMonths < minAge ? 'tooSmall' : 'tooBig', ageInMonths }
  }

  const parseEuropeanDate = (dateString) => {
    // Try DD/MM/YYYY format first
    let parts = dateString.split('/')
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day)
      }
    }
    
    // Try YYYY-MM-DD format
    parts = dateString.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day)
      }
    }
    
    return null
  }

  const formatDateForInput = (dateString) => {
    // Return as-is if already in DD/MM/YYYY format
    return dateString || ''
  }

  // Convert DD/MM/YYYY to YYYY-MM-DD for HTML date input
  const convertToDateInputFormat = (dateString) => {
    if (!dateString) return ''
    const date = parseEuropeanDate(dateString)
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Convert YYYY-MM-DD (from HTML date input) to DD/MM/YYYY
  const convertFromDateInputFormat = (dateString) => {
    if (!dateString) return ''
    const parts = dateString.split('-')
    if (parts.length === 3) {
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      return `${day}/${month}/${year}`
    }
    return dateString
  }

  // Abbreviate group name for table display
  const abbreviateGroupName = (groupId) => {
    if (!groupId) return ''
    const group = ageGroups.find(g => g.id === groupId)
    if (!group) return ''
    const name = group.name || group.label || ''
    // Take first 3-4 characters or first word if it's short
    if (name.length <= 8) return name
    return name.substring(0, 6) + '...'
  }

  // Get full group name for tooltip
  const getFullGroupName = (groupId) => {
    if (!groupId) return ''
    const group = ageGroups.find(g => g.id === groupId)
    return group ? (group.name || group.label || '') : ''
  }

  // Check if child's age at entry date matches their allocated group's age range (anomaly if not)
  const hasGroupAgeMismatch = (child) => {
    if (!child.group) return false
    const birthDate = parseEuropeanDate(child.dateOfBirth)
    if (!birthDate) return false
    const refDate = getEntryRefDate(child.entryDate)
    const ageInMonths = ageInMonthsAt(birthDate, refDate)
    if (ageInMonths === null) return false
    const group = ageGroups.find(g => g.id === child.group)
    if (!group) return false
    return ageInMonths < group.minAge || ageInMonths > group.maxAge
  }

  // Get recommended group for child based on age at entry date (for anomaly display)
  const getRecommendedGroupForChild = (child) => {
    const refDate = getEntryRefDate(child.entryDate)
    return calculateGroupAtDate(child.dateOfBirth, refDate, ageGroups)
  }

  // The transition date (Sept 1st) used for "next group" calculation - for display
  const getTransitionDateDisplay = () => {
    const d = getNextTransitionDate()
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return ''
    return dateString
  }

  // Calculate age in months for a child as of today (for sorting, display)
  const calculateAgeInMonths = (dateOfBirth) => {
    if (!dateOfBirth) return null
    const birthDate = parseEuropeanDate(dateOfBirth)
    if (!birthDate) return null
    return ageInMonthsAt(birthDate, new Date())
  }

  // Filter children based on selected group
  const filteredChildren = selectedFilterGroup === null 
    ? children 
    : children.filter(child => child.group === selectedFilterGroup)

  // Sort filtered children by age
  const sortedAndFilteredChildren = [...filteredChildren].sort((a, b) => {
    if (sortOrder === null) return 0
    
    const ageA = calculateAgeInMonths(a.dateOfBirth)
    const ageB = calculateAgeInMonths(b.dateOfBirth)
    
    // Handle null ages (invalid dates) - put them at the end
    if (ageA === null && ageB === null) return 0
    if (ageA === null) return 1
    if (ageB === null) return -1
    
    if (sortOrder === 'asc') {
      return ageA - ageB
    } else {
      return ageB - ageA
    }
  })

  // Handle sort toggle
  const handleSortByAge = () => {
    if (sortOrder === null) {
      setSortOrder('asc')
    } else if (sortOrder === 'asc') {
      setSortOrder('desc')
    } else {
      setSortOrder(null)
    }
  }

  return (
    <div>
      {/* Slim toolbar: filter + import - minimal, above the list */}
      <div className="children-toolbar">
        <div className="children-filter-pills">
          <button
            className={`filter-pill ${selectedFilterGroup === null ? 'active' : ''}`}
            onClick={() => setSelectedFilterGroup(null)}
          >
            {t.all} ({children.length})
          </button>
          {ageGroups.map(group => {
            const count = children.filter(c => c.group === group.id).length
            return (
              <button
                key={group.id}
                className={`filter-pill ${selectedFilterGroup === group.id ? 'active' : ''}`}
                onClick={() => setSelectedFilterGroup(group.id)}
              >
                {group.name || group.label} ({count})
              </button>
            )
          })}
        </div>
        <label className="import-csv-link" title={t.importCSV}>
          {t.importCSV}
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
        </label>
      </div>

      <AgeGroupWidget children={children} ageGroups={ageGroups} />

      <div className="table-container children-table-primary">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>
                <button
                  className="btn-icon"
                  onClick={handleAddRow}
                  title={t.addChild}
                  style={{
                    background: '#C47ECE',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  +
                </button>
              </th>
              <th style={{ width: '120px' }}>{t.childName}</th>
              <th 
                className="sortable-header"
                style={{ 
                  width: '100px', 
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative'
                }}
                onClick={handleSortByAge}
                title={t.sortByAge}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                  {t.dateOfBirth}
                  {sortOrder === 'asc' && <span style={{ fontSize: '12px', color: '#C47ECE' }}>↑</span>}
                  {sortOrder === 'desc' && <span style={{ fontSize: '12px', color: '#C47ECE' }}>↓</span>}
                  {sortOrder === null && <span style={{ fontSize: '12px', color: '#ccc' }}>⇅</span>}
                </div>
              </th>
              <th style={{ width: '110px' }}>{t.registerStatus}</th>
              <th style={{ width: '80px' }}>{t.group}</th>
              <th style={{ width: '115px' }} title={t.expectedEntryTooltip}>{t.expectedEntry}</th>
              <th style={{ width: '110px' }} title={t.nextGroupTooltip}>{t.nextGroup} ({getTransitionDateDisplay()})</th>
              <th style={{ width: '100px' }}>{t.parent1Name}</th>
              <th style={{ width: '100px' }}>{t.parent1Phone}</th>
              <th style={{ width: '100px' }}>{t.parent2Name}</th>
              <th style={{ width: '100px' }}>{t.parent2Phone}</th>
              <th style={{ width: '120px' }}>{t.healthNotes}</th>
              <th style={{ width: '120px' }}>{t.nutritionNotes}</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredChildren.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {selectedFilterGroup === null ? t.noChildren : t.noChildrenInGroup}
                </td>
              </tr>
            ) : (
              sortedAndFilteredChildren.map((child) => (
                <tr key={child.id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                      {child.registerStatus === 'candidate' && (
                        <button
                          className="btn-register"
                          onClick={() => handleQuickRegister(child.id)}
                          title={t.clickToRegister}
                          style={{
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            width: '100%'
                          }}
                        >
                          {t.register}
                        </button>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteChild(child.id, child.childName)}
                        title={t.deleteChild}
                        style={{
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '5px 10px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          width: '100%'
                        }}
                        >
                          {t.delete}
                        </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="editable-input"
                      value={child.childName || ''}
                      onChange={(e) => handleCellChange(child.id, 'childName', e.target.value)}
                      placeholder={t.enterName}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="editable-input"
                      value={convertToDateInputFormat(child.dateOfBirth)}
                      onChange={(e) => {
                        const convertedDate = convertFromDateInputFormat(e.target.value)
                        handleCellChange(child.id, 'dateOfBirth', convertedDate)
                      }}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <select
                        className="editable-select"
                        value={child.registerStatus || 'candidate'}
                        onChange={(e) => handleCellChange(child.id, 'registerStatus', e.target.value)}
                        style={{ flex: 1, fontSize: '12px', padding: '8px 6px' }}
                      >
                        <option value="candidate">{t.candidate}</option>
                        <option value="registered">{t.registered}</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <select
                        className="editable-select"
                        value={child.group || ''}
                        onChange={(e) => handleCellChange(child.id, 'group', e.target.value)}
                        title={getFullGroupName(child.group)}
                        style={{
                          flex: 1,
                          minWidth: '80px',
                          fontSize: '12px',
                          padding: '8px 6px',
                          ...(hasGroupAgeMismatch(child) ? { borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontWeight: '600' } : {})
                        }}
                      >
                        <option value="">{t.select}</option>
                        {ageGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name || group.label}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const status = calculateGroupOrAgeStatus(child.dateOfBirth, getEntryRefDate(child.entryDate), ageGroups)
                        if (status?.status === 'tooSmall') return <span style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{t.ageTooSmall}</span>
                        if (status?.status === 'tooBig') return <span style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{t.ageTooBig}</span>
                        if (hasGroupAgeMismatch(child)) {
                          const rec = getRecommendedGroupForChild(child)
                          const recText = rec ? t.recommendedShort(rec.name, rec.ageInMonths) : t.ageOutsideRanges
                          return (
                            <span className="group-mismatch-warning" title={t.ageMismatch(recText)}>⚠</span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="date"
                        className="editable-input"
                        value={convertToDateInputFormat(child.entryDate)}
                        onChange={(e) => {
                          const converted = convertFromDateInputFormat(e.target.value)
                          handleCellChange(child.id, 'entryDate', converted)
                        }}
                        style={{
                          fontSize: '12px',
                          padding: '8px 6px',
                          ...(hasGroupAgeMismatch(child) ? { borderColor: 'var(--color-danger)', color: 'var(--color-danger)' } : {})
                        }}
                      />
                      {hasGroupAgeMismatch(child) && (() => {
                        const rec = getRecommendedGroupForChild(child)
                        const recText = rec ? t.recommendedShort(rec.name, rec.ageInMonths) : t.ageOutsideRanges
                        return (
                          <span
                            className="group-mismatch-warning"
                            title={t.ageMismatch(recText)}
                          >
                            ⚠
                          </span>
                        )
                      })()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <select
                        className="editable-select"
                        value={child.nextGroup || ''}
                        onChange={(e) => handleCellChange(child.id, 'nextGroup', e.target.value)}
                        title={getFullGroupName(child.nextGroup)}
                        style={{ flex: 1, minWidth: '80px', fontSize: '12px', padding: '8px 6px' }}
                      >
                        <option value="">{t.select}</option>
                        {ageGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name || group.label}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const status = calculateGroupOrAgeStatus(child.dateOfBirth, getNextTransitionDate(), ageGroups)
                        if (status?.status === 'tooSmall') return <span style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{t.ageTooSmall}</span>
                        if (status?.status === 'tooBig') return <span style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{t.ageTooBig}</span>
                        return null
                      })()}
                    </div>
                  </td>
                  <td className="truncate">
                    <input
                      type="text"
                      className="editable-input"
                      value={child.parent1Name || ''}
                      onChange={(e) => handleCellChange(child.id, 'parent1Name', e.target.value)}
                      placeholder={t.enterName}
                      title={child.parent1Name || ''}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="tel"
                      className="editable-input"
                      value={child.parent1Phone || ''}
                      onChange={(e) => handleCellChange(child.id, 'parent1Phone', e.target.value)}
                      placeholder={t.enterPhone}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td className="truncate">
                    <input
                      type="text"
                      className="editable-input"
                      value={child.parent2Name || ''}
                      onChange={(e) => handleCellChange(child.id, 'parent2Name', e.target.value)}
                      placeholder={t.enterName}
                      title={child.parent2Name || ''}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="tel"
                      className="editable-input"
                      value={child.parent2Phone || ''}
                      onChange={(e) => handleCellChange(child.id, 'parent2Phone', e.target.value)}
                      placeholder={t.enterPhone}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td>
                    <textarea
                      className="editable-input"
                      value={child.healthNotes || ''}
                      onChange={(e) => handleCellChange(child.id, 'healthNotes', e.target.value)}
                      placeholder={t.healthNotes}
                      rows="2"
                      style={{ fontSize: '12px', padding: '8px 6px', resize: 'vertical' }}
                      title={child.healthNotes || ''}
                    />
                  </td>
                  <td>
                    <textarea
                      className="editable-input"
                      value={child.nutritionNotes || ''}
                      onChange={(e) => handleCellChange(child.id, 'nutritionNotes', e.target.value)}
                      placeholder={t.nutritionNotes}
                      rows="2"
                      style={{ fontSize: '12px', padding: '8px 6px', resize: 'vertical' }}
                      title={child.nutritionNotes || ''}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ChildrenTab
