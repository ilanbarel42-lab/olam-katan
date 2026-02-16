import React, { useState } from 'react'
import { t } from '../i18n'

function AgeGroupWidget({ children, ageGroups }) {
  const [expanded, setExpanded] = useState(false)
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
    <div className={`age-group-widget age-group-widget-compact ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="age-group-widget-header"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? t.collapseStats : t.expandStats}
        aria-expanded={expanded}
      >
        <span className="age-group-widget-summary">
          {ageGroups.map((group, i) => {
            const stats = groupStats[group.id] || { total: 0 }
            return (
              <span key={group.id} className="age-group-summary-item">
                {i > 0 && ' • '}{group.name || group.label}: <strong>{stats.total}</strong>
              </span>
            )
          })}
          <span className="age-group-summary-total"> • {t.total}: <strong>{totalChildren}</strong></span>
        </span>
        <span className="age-group-widget-toggle">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="age-group-stats">
          {ageGroups.map(group => {
            const stats = groupStats[group.id] || { registered: 0, candidates: 0, total: 0, max: group.maxCapacity || 0 }
            const isOverCapacity = stats.total > stats.max && stats.max > 0

            return (
              <div key={group.id} className="age-group-item" style={isOverCapacity ? { backgroundColor: 'rgba(244, 67, 54, 0.3)' } : {}}>
                <div className="label">{group.name || group.label}</div>
                <div className="age-group-item-range">{group.minAge}-{group.maxAge} {t.months}</div>
                <div className="age-group-item-details">
                  <div>{t.registeredShort}: <strong>{stats.registered}</strong></div>
                  <div>{t.candidatesShort}: <strong>{stats.candidates}</strong></div>
                  <div>{t.total}: <strong>{stats.total}</strong></div>
                  <div className="age-group-item-max">{t.maxShort}: <strong>{stats.max || '∞'}</strong></div>
                  {isOverCapacity && <div className="age-group-over-capacity">{t.overCapacity}</div>}
                </div>
              </div>
            )
          })}
          <div className="age-group-item age-group-item-overall">
            <div className="label">{t.overall}</div>
            <div className="age-group-item-details">
              <div>{t.registeredShort}: <strong>{totalRegistered}</strong></div>
              <div>{t.candidatesShort}: <strong>{totalCandidates}</strong></div>
              <div className="age-group-item-max">{t.total}: <strong>{totalChildren}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgeGroupWidget
