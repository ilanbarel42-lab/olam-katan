import React, { useState, useEffect, useRef } from 'react'
import AgeGroupWidget from './AgeGroupWidget'
import { getChildren, saveChildren } from '../utils/storage'

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

  const handleCellChange = (childId, field, value) => {
    const updatedChildren = children.map(child => {
      if (child.id === childId) {
        const updated = { ...child, [field]: value }
        
        // Auto-update group based on reference date (1.9.2026) if date of birth changes
        if (field === 'dateOfBirth') {
          const recommendation = calculateGroupForReferenceDate(value, ageGroups)
          if (recommendation) {
            updated.group = recommendation.id
          } else {
            updated.group = ''
          }
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
    const name = childName || 'this child'
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
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
      registerStatus: 'candidate',
      group: '',
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
        alert('CSV file is empty')
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
        const recommendation = dob ? calculateGroupForReferenceDate(dob, ageGroups) : null
        const calculatedGroup = recommendation ? recommendation.id : ''
        
        importedChildren.push({
          id: Date.now().toString() + '-' + i,
          childName: name,
          dateOfBirth: dob,
          registerStatus: 'candidate',
          group: calculatedGroup,
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

  const calculateGroup = (dateOfBirth, groups) => {
    if (!dateOfBirth) return ''
    
    const birthDate = parseEuropeanDate(dateOfBirth)
    if (!birthDate) return ''
    
    const today = new Date()
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (today.getMonth() - birthDate.getMonth())
    
    for (const group of groups) {
      if (ageInMonths >= group.minAge && ageInMonths <= group.maxAge) {
        return group.id
      }
    }
    
    return ''
  }

  // Calculate group based on reference date: September 1, 2026
  const calculateGroupForReferenceDate = (dateOfBirth, groups) => {
    if (!dateOfBirth) return null
    
    const birthDate = parseEuropeanDate(dateOfBirth)
    if (!birthDate) return null
    
    // Reference date: September 1, 2026
    const referenceDate = new Date(2026, 8, 1) // Month is 0-indexed, so 8 = September
    
    // Calculate age in months as of reference date, accounting for day of month
    let ageInMonths = (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (referenceDate.getMonth() - birthDate.getMonth())
    
    // If the day hasn't occurred yet this month, subtract one month
    if (referenceDate.getDate() < birthDate.getDate()) {
      ageInMonths--
    }
    
    // Find matching group
    for (const group of groups) {
      if (ageInMonths >= group.minAge && ageInMonths <= group.maxAge) {
        return {
          id: group.id,
          name: group.name || group.label,
          ageInMonths: ageInMonths
        }
      }
    }
    
    return null
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

  // Calculate the date when child will be eligible for next age group
  const calculateNextGroupTransitionDate = (child) => {
    if (!child.dateOfBirth || !child.group) return null
    
    const birthDate = parseEuropeanDate(child.dateOfBirth)
    if (!birthDate) return null
    
    const currentGroup = ageGroups.find(g => g.id === child.group)
    if (!currentGroup) return null
    
    // Sort groups by minAge to find the next one
    const sortedGroups = [...ageGroups].sort((a, b) => a.minAge - b.minAge)
    
    // Find the next group (one with minAge > current group's maxAge)
    const nextGroup = sortedGroups.find(g => g.minAge > currentGroup.maxAge)
    
    if (!nextGroup) {
      // Child is already in the highest age group
      return null
    }
    
    // Calculate the date when child will reach nextGroup.minAge months old
    // Add months to birth date
    const transitionDate = new Date(birthDate)
    
    // Calculate target year and month
    const targetYear = birthDate.getFullYear() + Math.floor((birthDate.getMonth() + nextGroup.minAge) / 12)
    const targetMonth = (birthDate.getMonth() + nextGroup.minAge) % 12
    
    // Handle day overflow - if the day doesn't exist in target month, use last day of that month
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
    const targetDay = Math.min(birthDate.getDate(), daysInTargetMonth)
    
    transitionDate.setFullYear(targetYear)
    transitionDate.setMonth(targetMonth)
    transitionDate.setDate(targetDay)
    
    // Format as DD/MM/YYYY
    const day = String(transitionDate.getDate()).padStart(2, '0')
    const month = String(transitionDate.getMonth() + 1).padStart(2, '0')
    const year = transitionDate.getFullYear()
    
    return `${day}/${month}/${year}`
  }

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return ''
    return dateString
  }

  // Calculate age in months for a child based on reference date (1.9.2026)
  const calculateAgeInMonths = (dateOfBirth) => {
    if (!dateOfBirth) return null
    
    const birthDate = parseEuropeanDate(dateOfBirth)
    if (!birthDate) return null
    
    // Reference date: September 1, 2026
    const referenceDate = new Date(2026, 8, 1) // Month is 0-indexed, so 8 = September
    
    // Calculate age in months as of reference date, accounting for day of month
    let ageInMonths = (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (referenceDate.getMonth() - birthDate.getMonth())
    
    // If the day hasn't occurred yet this month, subtract one month
    if (referenceDate.getDate() < birthDate.getDate()) {
      ageInMonths--
    }
    
    return ageInMonths
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
      <AgeGroupWidget children={children} ageGroups={ageGroups} />
      
      {/* Group Filter */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        background: '#fff', 
        borderRadius: '16px', 
        boxShadow: '0 4px 12px rgba(196, 126, 206, 0.12)' 
      }}>
        <div style={{ marginBottom: '12px', fontWeight: '700', color: '#333', fontFamily: 'Nunito, sans-serif', fontSize: '18px' }}>
          Filter by Group:
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedFilterGroup === null ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedFilterGroup(null)}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            All Groups ({children.length})
          </button>
          {ageGroups.map(group => {
            const groupChildrenCount = children.filter(c => c.group === group.id).length
            return (
              <button
                key={group.id}
                className={`btn ${selectedFilterGroup === group.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedFilterGroup(group.id)}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                {group.name || group.label} ({groupChildrenCount})
              </button>
            )
          })}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }} title="Import children from a CSV file">
          Import CSV
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>
                <button
                  className="btn-icon"
                  onClick={handleAddRow}
                  title="Add new child"
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
              <th style={{ width: '120px' }}>Child Name</th>
              <th 
                className="sortable-header"
                style={{ 
                  width: '100px', 
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative'
                }}
                onClick={handleSortByAge}
                title="Click to sort by age"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                  Date of Birth
                  {sortOrder === 'asc' && <span style={{ fontSize: '12px', color: '#C47ECE' }}>↑</span>}
                  {sortOrder === 'desc' && <span style={{ fontSize: '12px', color: '#C47ECE' }}>↓</span>}
                  {sortOrder === null && <span style={{ fontSize: '12px', color: '#ccc' }}>⇅</span>}
                </div>
              </th>
              <th style={{ width: '110px' }}>Register Status</th>
              <th style={{ width: '80px' }}>Group</th>
              <th style={{ width: '120px' }}>Next Group Date</th>
              <th style={{ width: '100px' }}>Parent 1 Name</th>
              <th style={{ width: '100px' }}>Parent 1 Phone</th>
              <th style={{ width: '100px' }}>Parent 2 Name</th>
              <th style={{ width: '100px' }}>Parent 2 Phone</th>
              <th style={{ width: '120px' }}>Health Notes</th>
              <th style={{ width: '120px' }}>Nutrition Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredChildren.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {selectedFilterGroup === null 
                    ? 'No children yet. Click the + button above to add one.'
                    : 'No children in this group. Click the + button above to add one.'
                  }
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
                          title="Click to register this candidate"
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
                          Register
                        </button>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteChild(child.id, child.childName)}
                        title="Delete this child"
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
                        Delete
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="editable-input"
                      value={child.childName || ''}
                      onChange={(e) => handleCellChange(child.id, 'childName', e.target.value)}
                      placeholder="Enter name"
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
                        <option value="candidate">Candidate</option>
                        <option value="registered">Registered</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <select
                      className="editable-select"
                      value={child.group || ''}
                      onChange={(e) => handleCellChange(child.id, 'group', e.target.value)}
                      title={getFullGroupName(child.group)}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    >
                      <option value="">Select</option>
                      {ageGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name || group.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ fontSize: '12px', padding: '8px 6px', color: '#666', textAlign: 'center' }}>
                    {(() => {
                      const transitionDate = calculateNextGroupTransitionDate(child)
                      if (transitionDate === null) {
                        return <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>
                      }
                      return transitionDate
                    })()}
                  </td>
                  <td className="truncate">
                    <input
                      type="text"
                      className="editable-input"
                      value={child.parent1Name || ''}
                      onChange={(e) => handleCellChange(child.id, 'parent1Name', e.target.value)}
                      placeholder="Enter name"
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
                      placeholder="Enter phone"
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td className="truncate">
                    <input
                      type="text"
                      className="editable-input"
                      value={child.parent2Name || ''}
                      onChange={(e) => handleCellChange(child.id, 'parent2Name', e.target.value)}
                      placeholder="Enter name"
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
                      placeholder="Enter phone"
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>
                  <td>
                    <textarea
                      className="editable-input"
                      value={child.healthNotes || ''}
                      onChange={(e) => handleCellChange(child.id, 'healthNotes', e.target.value)}
                      placeholder="Health notes"
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
                      placeholder="Nutrition notes"
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
