import React, { useState, useEffect } from 'react'
import ChildrenTab from './components/ChildrenTab'
import EmployeesTab from './components/EmployeesTab'
import SettingsTab from './components/SettingsTab'
import { getAgeGroups, saveAgeGroups } from './utils/storage'

function App() {
  const [activeTab, setActiveTab] = useState('children')
  const [ageGroups, setAgeGroups] = useState([])

  useEffect(() => {
    // Load age groups from storage or use defaults
    const loadedGroups = getAgeGroups()
    if (loadedGroups.length === 0) {
      // Set default age groups
      const defaultGroups = [
        { id: '1', name: 'Infants', minAge: 5, maxAge: 10, label: '5-10 months', maxCapacity: 10, ratio: 4 },
        { id: '2', name: 'Toddlers', minAge: 11, maxAge: 15, label: '11-15 months', maxCapacity: 12, ratio: 6 },
        { id: '3', name: 'Preschoolers', minAge: 18, maxAge: 30, label: '18-30 months', maxCapacity: 15, ratio: 8 }
      ]
      saveAgeGroups(defaultGroups)
      setAgeGroups(defaultGroups)
    } else {
      setAgeGroups(loadedGroups)
    }
  }, [])

  const handleAgeGroupsChange = (newGroups) => {
    setAgeGroups(newGroups)
    saveAgeGroups(newGroups)
  }

  const tabs = [
    { id: 'children', label: 'Children' },
    { id: 'employees', label: 'Employees' },
    { id: 'team', label: 'Team' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'settings', label: 'Settings' }
  ]

  return (
    <div className="app">
      {/* Brand Header */}
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

      <div className="tab-content">
        {activeTab === 'children' && (
          <ChildrenTab ageGroups={ageGroups} />
        )}
        {activeTab === 'employees' && (
          <EmployeesTab />
        )}
        {activeTab === 'team' && (
          <div className="empty-state">
            <h3>Team Tab</h3>
            <p>Coming soon...</p>
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="empty-state">
            <h3>Schedule Tab</h3>
            <p>Coming soon...</p>
          </div>
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
