import React from 'react'

function AgeGroupWidget({ children, ageGroups }) {
  const calculateAgeInMonths = (dateOfBirth) => {
    if (!dateOfBirth) return null
    
    const parts = dateOfBirth.split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    
    const birthDate = new Date(year, month, day)
    const today = new Date()
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (today.getMonth() - birthDate.getMonth())
    
    return ageInMonths
  }

  const getGroupStats = () => {
    const stats = {}
    
    ageGroups.forEach(group => {
      stats[group.id] = {
        registered: 0,
        candidates: 0,
        total: 0,
        max: group.maxCapacity || 0
      }
    })
    
    children.forEach(child => {
      let groupId = child.group
      
      // Auto-calculate group if not set but date of birth is available
      if (!groupId && child.dateOfBirth) {
        const ageInMonths = calculateAgeInMonths(child.dateOfBirth)
        if (ageInMonths !== null) {
          const matchingGroup = ageGroups.find(group => 
            ageInMonths >= group.minAge && ageInMonths <= group.maxAge
          )
          if (matchingGroup) {
            groupId = matchingGroup.id
          }
        }
      }
      
      if (groupId && stats[groupId]) {
        stats[groupId].total++
        if (child.registerStatus === 'registered') {
          stats[groupId].registered++
        } else {
          stats[groupId].candidates++
        }
      }
    })
    
    return stats
  }

  const groupStats = getGroupStats()
  const totalChildren = children.length
  const totalRegistered = children.filter(c => c.registerStatus === 'registered').length
  const totalCandidates = children.filter(c => c.registerStatus === 'candidate' || !c.registerStatus).length

  return (
    <div className="age-group-widget">
      <h3>Age Group Statistics</h3>
      <div className="age-group-stats">
        {ageGroups.map(group => {
          const stats = groupStats[group.id] || { registered: 0, candidates: 0, total: 0, max: group.maxCapacity || 0 }
          const isOverCapacity = stats.total > stats.max && stats.max > 0
          
          return (
            <div key={group.id} className="age-group-item" style={isOverCapacity ? { backgroundColor: 'rgba(244, 67, 54, 0.3)' } : {}}>
              <div className="label" style={{ 
                fontWeight: 'bold', 
                marginBottom: '8px',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}>
                {group.name || group.label}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: 'rgba(255,255,255,0.95)', 
                marginBottom: '10px', 
                fontWeight: '500',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}>
                {group.minAge}-{group.maxAge} months
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '5px', 
                fontSize: '14px',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}>
                <div>Registered: <strong>{stats.registered}</strong></div>
                <div>Candidates: <strong>{stats.candidates}</strong></div>
                <div>Total: <strong>{stats.total}</strong></div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '5px', marginTop: '5px' }}>
                  Max: <strong>{stats.max || '∞'}</strong>
                </div>
                {isOverCapacity && (
                  <div style={{ color: '#FCE1B6', fontWeight: 'bold', fontSize: '12px', marginTop: '5px', backgroundColor: 'rgba(244, 67, 54, 0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    Over Capacity!
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div className="age-group-item" style={{ marginRight: 'auto' }}>
          <div className="label" style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          }}>Overall</div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '5px', 
            fontSize: '14px',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          }}>
            <div>Registered: <strong>{totalRegistered}</strong></div>
            <div>Candidates: <strong>{totalCandidates}</strong></div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '5px', marginTop: '5px' }}>
              Total: <strong>{totalChildren}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgeGroupWidget
