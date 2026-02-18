/**
 * Advisor tab – unified input, advice, and AI Q&A.
 * V2: See ADVISOR_V2_DESIGN.md – one place for all input.
 */
import React, { useState, useEffect } from 'react'
import { getEvents, saveEvents, getChildren, getEmployees, shouldShowAdvisorReminder } from '../utils/storage'
import { askAdvisor } from '../services/advisorApi'
import { parseDateFromText } from '../services/parseApi'
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

function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** Client-side date extraction from Hebrew/English text (fallback when API unavailable) */
function extractDateFromTextClient(text) {
  if (!text || typeof text !== 'string') return null
  const lower = text.toLowerCase().trim()
  if (/\bהיום\b|\btoday\b|\bהיום\s*[''"]?s?\s*update/i.test(lower) || /^היום\s|^today\s/i.test(lower)) return todayAsDDMMYYYY()
  if (/\bאתמול\b|\byesterday\b/i.test(lower)) return dateOffset(-1)
  if (/\bמחר\b|\btomorrow\b/i.test(lower)) return dateOffset(1)
  return null
}

function AdvisorTab() {
  const [events, setEvents] = useState([])
  const [advice, setAdvice] = useState([])
  const [inputText, setInputText] = useState('')
  const [inputDate, setInputDate] = useState(todayAsDDMMYYYY())
  const [useAutoDate, setUseAutoDate] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [filterEntityType, setFilterEntityType] = useState(null)
  const [filterEntityId, setFilterEntityId] = useState('')
  const [showReminderBanner, setShowReminderBanner] = useState(false)
  const [promptQuery, setPromptQuery] = useState('')
  const [promptResponse, setPromptResponse] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [isRecordingLive, setIsRecordingLive] = useState(false)
  const [recognitionRef, setRecognitionRef] = useState(null)

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

  const handleAskAdvisor = async () => {
    const q = promptQuery.trim()
    if (!q) return
    setPromptLoading(true)
    setPromptResponse('')
    try {
      const { answer } = await askAdvisor(q)
      setPromptResponse(answer)
    } catch (err) {
      setPromptResponse(t.advisorError || 'שגיאה. נסה שוב.')
    } finally {
      setPromptLoading(false)
    }
  }

  const handleSaveInput = async () => {
    const text = inputText.trim()
    if (!text) return
    setSaveLoading(true)
    let dateToUse = inputDate
    if (useAutoDate) {
      const fromText = extractDateFromTextClient(text)
      dateToUse = fromText || await parseDateFromText(text, inputDate)
    }
    setSaveLoading(false)
    const existing = getEvents() || []
    const newEvent = {
      id: `ev-${Date.now()}`,
      type: 'unstructured_record',
      date: dateToUse,
      raw: text,
      description: text,
      scope: 'general',
      createdAt: new Date().toISOString(),
      source: 'manual'
    }
    saveEvents([...existing, newEvent])
    setInputText('')
    refresh()
  }

  const handleDeleteEvent = (id) => {
    if (!window.confirm(t.confirmDeleteEvent || 'האם למחוק את האירוע?')) return
    const updated = (getEvents() || []).filter(e => e.id !== id)
    saveEvents(updated)
    refresh()
  }

  const handleStartLiveRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('דפדפן זה לא תומך בהקלטת קול. נסה Chrome או Edge.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'he-IL'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const transcript = e.results[i][0].transcript
          setInputText(prev => (prev ? prev + ' ' : '') + transcript)
        }
      }
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') setIsRecordingLive(false)
    }
    recognition.onend = () => setIsRecordingLive(false)
    recognition.start()
    setRecognitionRef(recognition)
    setIsRecordingLive(true)
  }

  const handleStopLiveRecording = () => {
    if (recognitionRef) {
      recognitionRef.stop()
      setRecognitionRef(null)
    }
    setIsRecordingLive(false)
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

      <div className="advisor-section advisor-add-info">
        <h2>{t.addInformation}</h2>
        <p className="advisor-hint">{t.addInformationHint}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={useAutoDate}
                onChange={e => setUseAutoDate(e.target.checked)}
              />
              <span>{t.dateAutoFromText}</span>
            </label>
            {!useAutoDate && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{t.dateForRecord}:</span>
                <input
                  type="date"
                  value={formatDateForInput(inputDate)}
                  onChange={e => {
                    const parts = e.target.value.split('-')
                    if (parts.length === 3) setInputDate(`${parts[2]}/${parts[1]}/${parts[0]}`)
                  }}
                  style={{ padding: 6 }}
                />
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isRecordingLive ? (
              <button type="button" className="btn btn-secondary" onClick={handleStartLiveRecording} title={t.recordVoice}>
                🎤 {t.recordVoice}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleStopLiveRecording} style={{ background: '#c00' }}>
                ⏹ {t.recordVoiceStop}
              </button>
            )}
            <span style={{ fontSize: 13, color: '#666' }}>{isRecordingLive ? t.recordingInProgress : ''}</span>
          </div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={t.addInformationPlaceholder}
            rows={5}
            style={{ padding: 10, borderRadius: 8, fontFamily: 'inherit' }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSaveInput}
            disabled={!inputText.trim() || saveLoading}
            style={{ alignSelf: 'flex-start' }}
          >
            {saveLoading ? (t.loading || 'טוען...') : t.saveRecord}
          </button>
        </div>
      </div>

      <div className="advisor-section advisor-ask">
        <h2>{t.askAdvisor}</h2>
        <p className="advisor-hint">{t.askAdvisorHint}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={promptQuery}
            onChange={e => setPromptQuery(e.target.value)}
            placeholder={t.askAdvisorPlaceholder}
            rows={3}
            style={{ padding: 10, borderRadius: 8, fontFamily: 'inherit' }}
          />
          <button className="btn btn-primary" onClick={handleAskAdvisor} disabled={promptLoading} style={{ alignSelf: 'flex-start' }}>
            {promptLoading ? (t.loading || 'טוען...') : t.askAdvisorSubmit}
          </button>
          {promptResponse && (
            <div style={{ padding: 12, background: 'var(--color-gray-light)', borderRadius: 8, fontSize: 14 }}>
              {promptResponse}
            </div>
          )}
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
                    const typeLabel = t[`eventType_${ev.type}`] || ev.type
                    return (
                      <li key={ev.id} className="event-item">
                        <span className={`event-type-badge type-${ev.type}`}>{typeLabel}</span>
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
