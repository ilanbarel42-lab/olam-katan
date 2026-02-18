import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import ChildrenTab from './components/ChildrenTab'
import EmployeesTab from './components/EmployeesTab'
import ScheduleTab from './components/ScheduleTab'
import SettingsTab from './components/SettingsTab'
import AdvisorTab from './components/AdvisorTab'
import { loadAll, getAgeGroups, getEmployees, saveAgeGroups, shouldShowAdvisorReminder } from './utils/storage'
import { config } from './config'
import { t } from './i18n'

function App() {
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState('children')
  const [ageGroups, setAgeGroups] = useState([])
  const [employees, setEmployees] = useState([])
  const [showAdvisorReminder, setShowAdvisorReminder] = useState(false)

  useEffect(() => {
    loadAll().then(() => {
      setReady(true)
      setShowAdvisorReminder(shouldShowAdvisorReminder())
    })
  }, [])

  useLayoutEffect(() => {
    if (ready && activeTab === 'advisor') setShowAdvisorReminder(false)
  }, [ready, activeTab])

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
    { id: 'schedule', label: t.schedule },
    { id: 'advisor', label: t.advisor },
    { id: 'settings', label: t.settings }
  ]

  return (
    <div className="app">
      {showAdvisorReminder && activeTab !== 'advisor' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
            color: 'white',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 14
          }}
        >
          <span>תזכורת יועץ – קבל עדכון לשבועיים הקרובים</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{ background: 'white', color: 'var(--color-primary)', padding: '6px 14px', fontSize: 13 }}
              onClick={() => { setActiveTab('advisor'); setShowAdvisorReminder(false) }}
            >
              {t.advisor} →
            </button>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,0.3)', padding: '6px 14px', fontSize: 13 }}
              onClick={() => setShowAdvisorReminder(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="app-header-sticky" style={showAdvisorReminder && activeTab !== 'advisor' ? { top: 40 } : {}}>
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

      <div className="tab-content" style={showAdvisorReminder && activeTab !== 'advisor' ? { paddingTop: 108 } : {}}>
        {!ready ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>{t.loading}</p>
          </div>
        ) : activeTab === 'children' ? (
          <ChildrenTab ageGroups={ageGroups} />
        ) : activeTab === 'employees' ? (
          <EmployeesTab onEmployeesChange={handleEmployeesChange} />
        ) : activeTab === 'schedule' ? (
          <ScheduleTab
            ageGroups={ageGroups}
            employees={employees}
            onMountRefresh={handleEmployeesChange}
          />
        ) : activeTab === 'advisor' ? (
          <AdvisorTab />
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
