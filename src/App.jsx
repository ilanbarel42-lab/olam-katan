import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import ChildrenTab from './components/ChildrenTab'
import EmployeesTab from './components/EmployeesTab'
import ScheduleTab from './components/ScheduleTab'
import SettingsTab from './components/SettingsTab'
import { loadAll, getAgeGroups, getEmployees, saveAgeGroups } from './utils/storage'
import { config } from './config'
import { t } from './i18n'

function App() {
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState('children')
  const [ageGroups, setAgeGroups] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    loadAll().then(() => setReady(true))
  }, [])

  // Refresh employees and age groups when switching to Schedule so tab always has latest data
  useLayoutEffect(() => {
    if (activeTab === 'schedule') {
      setEmployees(getEmployees())
      setAgeGroups(getAgeGroups())
    }
  }, [activeTab])

  useEffect(() => {
    if (!ready) return
    const loadedGroups = getAgeGroups()
    if (loadedGroups.length === 0) {
      saveAgeGroups(config.defaultAgeGroups)
      setAgeGroups(config.defaultAgeGroups)
    } else {
      const { min: defMin, optimal: defOpt } = config.defaultStaffing
      const migrated = loadedGroups.map(g => ({
        ...g,
        staffingMin: g.staffingMin || defMin,
        staffingOptimal: g.staffingOptimal || defOpt
      }))
      if (migrated.some((g, i) => !loadedGroups[i].staffingMin || !loadedGroups[i].staffingOptimal)) {
        saveAgeGroups(migrated)
      }
      setAgeGroups(migrated)
    }
  }, [ready])

  const handleAgeGroupsChange = (newGroups) => {
    setAgeGroups(newGroups)
    saveAgeGroups(newGroups)
  }

  const handleEmployeesChange = useCallback(() => {
    setEmployees(getEmployees())
  }, [])

  const tabs = [
    { id: 'children', label: t.children },
    { id: 'employees', label: t.employees },
    { id: 'team', label: t.team },
    { id: 'schedule', label: t.schedule },
    { id: 'settings', label: t.settings }
  ]

  return (
    <div className="app">
      {/* Compact sticky app bar: brand + tabs in one row */}
      <div className="app-header-sticky">
        <header className="brand-header">
          <div className="brand-header-content">
            <h1 className="brand-title">עולם קטן</h1>
            <span className="brand-subtitle">Olam Katan</span>
          </div>
          <div className="brand-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-circle circle-3"></div>
          </div>
          <nav className="tab-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          </nav>
        </header>
      </div>

      <div className="tab-content">
        {!ready ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>{t.loading}</p>
          </div>
        ) : activeTab === 'children' ? (
          <ChildrenTab ageGroups={ageGroups} />
        ) : activeTab === 'employees' ? (
          <EmployeesTab onEmployeesChange={handleEmployeesChange} />
        ) : activeTab === 'team' ? (
          <div className="empty-state">
            <h3>{t.team}</h3>
            <p>{t.comingSoon}</p>
          </div>
        ) : activeTab === 'schedule' ? (
          <ScheduleTab
            ageGroups={ageGroups}
            employees={employees}
            onMountRefresh={handleEmployeesChange}
          />
        ) : activeTab === 'settings' ? (
          <SettingsTab 
            ageGroups={ageGroups} 
            onAgeGroupsChange={handleAgeGroupsChange}
          />
        ) : null}
      </div>
    </div>
  )
}

export default App
