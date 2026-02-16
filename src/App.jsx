import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import ChildrenTab from './components/ChildrenTab'
import EmployeesTab from './components/EmployeesTab'
import ScheduleTab from './components/ScheduleTab'
import SettingsTab from './components/SettingsTab'
import { getAgeGroups, getEmployees, saveAgeGroups } from './utils/storage'

function App() {
  const [activeTab, setActiveTab] = useState('children')
  const [ageGroups, setAgeGroups] = useState([])
  const [employees, setEmployees] = useState([])

  // Refresh employees on tab change; use useLayoutEffect so Schedule tab gets fresh data before paint
  useLayoutEffect(() => {
    setEmployees(getEmployees())
  }, [activeTab])

  useEffect(() => {
    const loadedGroups = getAgeGroups()
    if (loadedGroups.length === 0) {
      const defaultGroups = [
        { id: '1', name: 'Infants', minAge: 5, maxAge: 10, label: '5-10 months', maxCapacity: 10, ratio: 4, staffingMin: { lead: 1, assistant: 1, cook: 0 }, staffingOptimal: { lead: 2, assistant: 2, cook: 0 } },
        { id: '2', name: 'Toddlers', minAge: 11, maxAge: 15, label: '11-15 months', maxCapacity: 12, ratio: 6, staffingMin: { lead: 1, assistant: 1, cook: 0 }, staffingOptimal: { lead: 2, assistant: 2, cook: 0 } },
        { id: '3', name: 'Preschoolers', minAge: 18, maxAge: 30, label: '18-30 months', maxCapacity: 15, ratio: 8, staffingMin: { lead: 1, assistant: 2, cook: 0 }, staffingOptimal: { lead: 2, assistant: 3, cook: 0 } }
      ]
      saveAgeGroups(defaultGroups)
      setAgeGroups(defaultGroups)
    } else {
      const migrated = loadedGroups.map(g => ({
        ...g,
        staffingMin: g.staffingMin || { lead: 1, assistant: 1, cook: 0 },
        staffingOptimal: g.staffingOptimal || { lead: 2, assistant: 2, cook: 0 }
      }))
      if (migrated.some((g, i) => !loadedGroups[i].staffingMin || !loadedGroups[i].staffingOptimal)) {
        saveAgeGroups(migrated)
      }
      setAgeGroups(migrated)
    }
  }, [])

  const handleAgeGroupsChange = (newGroups) => {
    setAgeGroups(newGroups)
    saveAgeGroups(newGroups)
  }

  const handleEmployeesChange = useCallback(() => {
    setEmployees(getEmployees())
  }, [])

  const tabs = [
    { id: 'children', label: 'Children' },
    { id: 'employees', label: 'Employees' },
    { id: 'team', label: 'Team' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'settings', label: 'Settings' }
  ]

  return (
    <div className="app">
      {/* Sticky header: brand + tabs always visible at top */}
      <div className="app-header-sticky">
        <header className="brand-header">
        <div className="brand-header-content">
          <h1 className="brand-title">עולם קטן</h1>
          <p className="brand-subtitle">Olam Katan</p>
        </div>
        <div className="brand-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </header>

      <div className="tab-container">
        <div className="tab-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      </div>

      <div className="tab-content">
        {activeTab === 'children' && (
          <ChildrenTab ageGroups={ageGroups} />
        )}
        {activeTab === 'employees' && (
          <EmployeesTab onEmployeesChange={handleEmployeesChange} />
        )}
        {activeTab === 'team' && (
          <div className="empty-state">
            <h3>Team Tab</h3>
            <p>Coming soon...</p>
          </div>
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab
            ageGroups={ageGroups}
            employees={employees}
            onMountRefresh={handleEmployeesChange}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab 
            ageGroups={ageGroups} 
            onAgeGroupsChange={handleAgeGroupsChange}
          />
        )}
      </div>
    </div>
  )
}

export default App
