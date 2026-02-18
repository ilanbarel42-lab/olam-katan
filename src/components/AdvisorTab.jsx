/**
 * Advisor tab – daily summary, events, and intelligent advice.
 * V2: See ADVISOR_V2_DESIGN.md – free-style recording + LLM Q&A.
 */
import React, { useState, useEffect } from 'react'
import { getEvents, saveEvents, getChildren, getEmployees, shouldShowAdvisorReminder, getAdvisorConfig } from '../utils/storage'
import { getAdvice } from '../utils/adviceEngine'
import { t } from '../i18n'

function formatDateForInput(d) {
  if (!d) return ''
  if (typeof d !== 'string') {
    const date = d
    return isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const parts = d.split(/[\/\-]/)
  if (parts.length !== 3) return ''
  let y, month, day
  if (parts[0].length === 4) {
    y = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10)
    day = parseInt(parts[2], 10)
  } else {
    day = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10)
    y = parseInt(parts[2], 10)
  }
  const date = new Date(y, month - 1, day)
  return isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length !== 3) return dateStr
  if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

function todayAsDDMMYYYY() {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function AdvisorTab() {
  const [events, setEvents] = useState([])
  const [advice, setAdvice] = useState([])
  const [dailyText, setDailyText] = useState('')
  const [dailyDate, setDailyDate] = useState(todayAsDDMMYYYY())
  const [quickType, setQuickType] = useState('general')
  const [quickEntityType, setQuickEntityType] = useState('child')
  const [quickEntityId, setQuickEntityId] = useState('')
  const [quickDesc, setQuickDesc] = useState('')
  const [filterEntityType, setFilterEntityType] = useState(null)
  const [filterEntityId, setFilterEntityId] = useState('')
  const [showReminderBanner, setShowReminderBanner] = useState(false)
  const [promptQuery, setPromptQuery] = useState('')
  const [promptResponse, setPromptResponse] = useState('')

  const children = getChildren()
  const employees = getEmployees()

  useEffect(() => {
    setEvents(getEvents() || [])
    setAdvice(getAdvice())
    setShowReminderBanner(shouldShowAdvisorReminder())
  }, [])

  const refresh = () => {
    setEvents(getEvents() || [])
    setAdvice(getAdvice())
  }

  const handleTriggerAdvisor = () => {
    refresh()
    setShowReminderBanner(false)
  }

  const handleAskAdvisor = () => {
    const q = promptQuery.trim()
    if (!q) return
    setPromptResponse(t.advisorPromptRequiresApi)
  }

  const handleSaveDailySummary = () => {
    const text = dailyText.trim()
    if (!text) return
    const existing = getEvents() || []
    const sameDay = existing.find(e => e.type === 'daily_summary' && e.date === dailyDate)
    const updated = sameDay
      ? existing.map(e => (e.id === sameDay.id ? { ...e, description: text, createdAt: new Date().toISOString() } : e))
      : [
          ...existing,
          {
            id: `ev-${Date.now()}`,
            type: 'daily_summary',
            date: dailyDate,
            description: text,
            createdAt: new Date().toISOString(),
            source: 'manual'
          }
        ]
    saveEvents(updated)
    setDailyText('')
    refresh()
  }

  const handleAddQuickEvent = () => {
    const desc = quickDesc.trim()
    if (!desc) return
    const existing = getEvents() || []
    const newEvent = {
      id: `ev-${Date.now()}`,
      type: quickType,
      date: todayAsDDMMYYYY(),
      entityType: quickEntityType === 'child' ? 'child' : 'employee',
      entityId: quickEntityId || null,
      description: desc,
      createdAt: new Date().toISOString(),
      source: 'manual'
    }
    saveEvents([...existing, newEvent])
    setQuickDesc('')
    setQuickEntityId('')
    refresh()
  }

  const handleDeleteEvent = (id) => {
    if (!window.confirm(t.confirmDeleteEvent || 'האם למחוק את האירוע?')) return
    const updated = (getEvents() || []).filter(e => e.id !== id)
    saveEvents(updated)
    refresh()
  }

  const filteredEvents = (events || [])
    .filter(e => {
      if (!filterEntityId) return true
      return e.entityType === filterEntityType && e.entityId === filterEntityId
    })
  const eventsByDate = filteredEvents
    .filter(e => e.date)
    .reduce((acc, e) => {
      const d = e.date
      if (!acc[d]) acc[d] = []
      acc[d].push(e)
      return acc
    }, {})
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => (b || '').localeCompare(a || ''))

  return (
    <div className="advisor-tab">
      {showReminderBanner && (
        <div
          className="advisor-reminder-banner"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
            color: 'white',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <span style={{ fontWeight: 600 }}>תזכורת יומית – קבל עדכון יועץ לשבועיים הקרובים</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ background: 'white', color: 'var(--color-primary)' }} onClick={handleTriggerAdvisor}>
              {t.getAdvisorBriefing}
            </button>
            <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.3)' }} onClick={() => setShowReminderBanner(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="advisor-section advisor-daily-advise">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{t.advisorDailyAdvise}</h2>
            <p className="advisor-hint" style={{ marginBottom: 0 }}>{t.advisorDailyAdviseHint}</p>
          </div>
          <button className="btn btn-primary" onClick={handleTriggerAdvisor}>
            {t.getAdvisorBriefing}
          </button>
        </div>
        {advice.length === 0 ? (
          <p style={{ color: '#666' }}>{t.noAdvice}</p>
        ) : (
          <ul className="advice-list">
            {advice.map(a => (
              <li key={a.id} className={`advice-item priority-${a.priority}`}>
                <div>
                  <strong>{a.title}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{a.description}</p>
                  {a.date && <span style={{ fontSize: 11, color: '#888' }}>{formatDateDisplay(a.date)}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="advisor-section advisor-ask">
        <h2>{t.askAdvisor}</h2>
        <p className="advisor-hint">למשל: רשימת ילדים שלא קיבלו מתנה השנה, מתי נתתי לאחרונה מתנה לעובד X</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={promptQuery}
            onChange={e => setPromptQuery(e.target.value)}
            placeholder={t.askAdvisorPlaceholder}
            rows={3}
            style={{ padding: 10, borderRadius: 8, fontFamily: 'inherit' }}
          />
          <button className="btn btn-primary" onClick={handleAskAdvisor} style={{ alignSelf: 'flex-start' }}>
            {t.askAdvisorSubmit}
          </button>
          {promptResponse && (
            <div style={{ padding: 12, background: 'var(--color-gray-light)', borderRadius: 8, fontSize: 14 }}>
              {promptResponse}
            </div>
          )}
        </div>
      </div>

      <div className="advisor-section">
        <h2>{t.dailySummary}</h2>
        <p className="advisor-hint">{t.dailySummaryHint}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <label>
            {t.date}:
            <input
              type="date"
              value={formatDateForInput(dailyDate)}
              onChange={e => {
                const parts = e.target.value.split('-')
                if (parts.length === 3) setDailyDate(`${parts[2]}/${parts[1]}/${parts[0]}`)
              }}
              style={{ marginRight: 8, padding: 6 }}
            />
          </label>
          <textarea
            value={dailyText}
            onChange={e => setDailyText(e.target.value)}
            placeholder={t.dailySummaryPlaceholder}
            rows={4}
            style={{ padding: 10, borderRadius: 8, fontFamily: 'inherit' }}
          />
          <button className="btn btn-primary" onClick={handleSaveDailySummary}>
            {t.saveSummary}
          </button>
        </div>
      </div>

      <div className="advisor-section">
        <h2>{t.quickAddEvent}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
          <select value={quickType} onChange={e => setQuickType(e.target.value)} style={{ padding: 6 }}>
            <option value="general">{t.eventGeneral}</option>
            <option value="child_incident">{t.eventChildIncident}</option>
            <option value="staff_event">{t.eventStaffEvent}</option>
            <option value="staff_gift">{t.eventStaffGift}</option>
            <option value="parent_promise">{t.eventParentPromise}</option>
          </select>
          {(quickType === 'child_incident' || quickType === 'parent_promise') && (
            <select value={quickEntityId} onChange={e => setQuickEntityId(e.target.value)} style={{ padding: 6 }}>
              <option value="">{t.select} {t.child}</option>
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.childName || t.unnamed}</option>
              ))}
            </select>
          )}
          {(quickType === 'staff_event' || quickType === 'staff_gift') && (
            <select value={quickEntityId} onChange={e => setQuickEntityId(e.target.value)} style={{ padding: 6 }}>
              <option value="">{t.select} {t.employee}</option>
              {employees.filter(e => e.status !== 'discontinued').map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name || t.unnamed}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={quickDesc}
            onChange={e => setQuickDesc(e.target.value)}
            placeholder={t.eventDescriptionPlaceholder}
            style={{ flex: 1, minWidth: 150, padding: 6 }}
          />
          <button className="btn btn-primary" onClick={handleAddQuickEvent}>{t.add}</button>
        </div>
      </div>

      <div className="advisor-section">
        <h2>{t.eventsHistory}</h2>
        <p className="advisor-hint">{t.eventsListByDate}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <select
            value={filterEntityType && filterEntityId ? `${filterEntityType}::${filterEntityId}` : ''}
            onChange={e => {
              const v = e.target.value
              if (!v) {
                setFilterEntityType(null)
                setFilterEntityId('')
              } else {
                const [type, id] = v.split('::', 2)
                setFilterEntityType(type || null)
                setFilterEntityId(id || '')
              }
            }}
            style={{ padding: 6 }}
          >
            <option value="">{t.all} – {t.events}</option>
            <optgroup label={t.children}>
              {children.map(c => (
                <option key={c.id} value={`child::${c.id}`}>{c.childName || t.unnamed}</option>
              ))}
            </optgroup>
            <optgroup label={t.employees}>
              {employees.filter(e => e.status !== 'discontinued').map(emp => (
                <option key={emp.id} value={`employee::${emp.id}`}>{emp.name || t.unnamed}</option>
              ))}
            </optgroup>
          </select>
        </div>
        {sortedDates.length === 0 ? (
          <p style={{ color: '#666' }}>{t.noEvents}</p>
        ) : (
          <div className="events-by-date">
            {sortedDates.map(date => (
              <div key={date} className="events-date-group">
                <h3 className="events-date-header">{formatDateDisplay(date)}</h3>
                <ul>
                  {eventsByDate[date].map(ev => {
                    const child = ev.entityType === 'child' ? children.find(c => c.id === ev.entityId) : null
                    const emp = ev.entityType === 'employee' ? employees.find(e => e.id === ev.entityId) : null
                    const entityLabel = child ? child.childName : emp ? emp.name : ''
                    return (
                      <li key={ev.id} className="event-item">
                        <span className={`event-type-badge type-${ev.type}`}>{t[`eventType_${ev.type}`] || ev.type}</span>
                        {entityLabel && <span className="event-entity">{entityLabel}</span>}
                        <span className="event-desc">{ev.description}</span>
                        <button
                          type="button"
                          className="btn-delete-small"
                          onClick={() => handleDeleteEvent(ev.id)}
                          title={t.delete}
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvisorTab
