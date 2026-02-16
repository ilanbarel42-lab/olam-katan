import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAgeGroups, getEmployees, getSchedule, saveSchedule } from '../utils/storage'
import { t } from '../i18n'

const EXTERNAL_ROLES = [
  { value: 'lead', label: t.lead },
  { value: 'assistant', label: t.assistant }
]

const WEEK_DAYS = [
  { key: 'sunday', label: t.sunday },
  { key: 'monday', label: t.monday },
  { key: 'tuesday', label: t.tuesday },
  { key: 'wednesday', label: t.wednesday },
  { key: 'thursday', label: t.thursday },
  { key: 'friday', label: t.friday }
]

function getWeekSunday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day
  const sunday = new Date(date)
  sunday.setDate(diff)
  sunday.setHours(0, 0, 0, 0)
  return sunday
}

function toWeekKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeExternals(cell) {
  if (!cell) return []
  if (cell.externals && Array.isArray(cell.externals)) {
    return cell.externals.map(ext =>
      typeof ext === 'string' ? { name: ext, role: 'assistant' } : { name: ext.name || '', role: ext.role || 'assistant' }
    )
  }
  if (cell.externalNames && Array.isArray(cell.externalNames)) {
    return cell.externalNames.map(n => ({ name: typeof n === 'string' ? n : n?.name || '', role: 'assistant' }))
  }
  return []
}

function formatWeekRange(sunday) {
  const sun = new Date(sunday)
  const fri = new Date(sunday)
  fri.setDate(fri.getDate() + 5)
  return `${sun.getDate()}/${sun.getMonth() + 1} - ${fri.getDate()}/${fri.getMonth() + 1} ${fri.getFullYear()}`
}


function ScheduleTab({ ageGroups, employees: employeesProp = [], onMountRefresh }) {
  const [weekStart, setWeekStart] = useState(() => getWeekSunday(new Date()))
  const [scheduleData, setScheduleData] = useState({})
  const [groups, setGroups] = useState([])
  const employees = employeesProp?.length ? employeesProp : getEmployees()

  useEffect(() => {
    const fromProp = ageGroups?.length ? ageGroups : []
    const fromStorage = getAgeGroups()
    setGroups(fromProp.length ? fromProp : fromStorage)
  }, [ageGroups])

  useEffect(() => {
    const raw = getSchedule()
    const hasLegacy = Object.values(raw).some(w => w?.assignments && Object.values(w.assignments).some(d =>
      Object.values(d).some(c => c?.externalNames?.length)
    ))
    if (!hasLegacy) {
      setScheduleData(raw)
      return
    }
    // Migrate legacy externalNames to externals
    const migrated = {}
    Object.keys(raw).forEach(wk => {
      const week = raw[wk]
      if (!week?.assignments) {
        migrated[wk] = week
        return
      }
      const nextAssignments = {}
      Object.keys(week.assignments).forEach(dk => {
        const day = week.assignments[dk]
        nextAssignments[dk] = {}
        Object.keys(day).forEach(gid => {
          const c = day[gid]
          nextAssignments[dk][gid] = {
            employeeIds: c?.employeeIds || [],
            externals: normalizeExternals(c)
          }
        })
      })
      migrated[wk] = { ...week, assignments: nextAssignments }
    })
    setScheduleData(migrated)
    saveSchedule(migrated)
  }, [])

  // Request fresh employees and ensure scheduleData reload when Schedule tab mounts
  useEffect(() => {
    onMountRefresh?.()
    setScheduleData(getSchedule())
  }, [onMountRefresh])

  const weekKey = toWeekKey(weekStart)

  const getCellAssignments = useCallback(
    (dayKey, groupId) => {
      const week = scheduleData[weekKey]
      if (!week?.assignments?.[dayKey]) return { employeeIds: [], externals: [] }
      const cell = week.assignments[dayKey][groupId]
      const base = cell || { employeeIds: [], externals: [] }
      return {
        employeeIds: base.employeeIds || [],
        externals: normalizeExternals(base)
      }
    },
    [scheduleData, weekKey]
  )

  const getEmployeeMap = useCallback(() => {
    const map = new Map()
    employees.forEach(e => map.set(e.id, e))
    return map
  }, [employees])

  const getOrCreateWeek = useCallback(() => {
    let week = scheduleData[weekKey]
    if (!week) {
      week = { assignments: {} }
      WEEK_DAYS.forEach(d => {
        week.assignments[d.key] = {}
        groups.forEach(g => {
          week.assignments[d.key][g.id] = { employeeIds: [], externals: [] }
        })
      })
      const activeEmployees = employees.filter(
        e => e.status !== 'discontinued' && e.groupId
      )
      activeEmployees.forEach(emp => {
        const freeDay = (emp.freeDay || 'friday').toLowerCase()
        WEEK_DAYS.forEach(({ key }) => {
          if (key === freeDay) return
          const gid = emp.groupId
          if (!week.assignments[key][gid]) week.assignments[key][gid] = { employeeIds: [], externals: [] }
          if (!week.assignments[key][gid].employeeIds.includes(emp.id)) {
            week.assignments[key][gid].employeeIds.push(emp.id)
          }
        })
      })
      const next = { ...scheduleData, [weekKey]: week }
      setScheduleData(next)
      saveSchedule(next)
    }
    return week
  }, [scheduleData, weekKey, groups, employees])

  useEffect(() => {
    if (!groups.length || !employees.length) return
    const existing = getSchedule()
    let week = existing[weekKey]
    if (!week) {
      const w = { assignments: {} }
      WEEK_DAYS.forEach(d => {
        w.assignments[d.key] = {}
        groups.forEach(g => {
          w.assignments[d.key][g.id] = { employeeIds: [], externals: [] }
        })
      })
      const active = employees.filter(e => e.status !== 'discontinued' && e.groupId)
      active.forEach(emp => {
        const free = (emp.freeDay || 'friday').toLowerCase()
        WEEK_DAYS.forEach(({ key }) => {
          if (key === free) return
          const gid = emp.groupId
          if (!w.assignments[key][gid]) w.assignments[key][gid] = { employeeIds: [], externals: [] }
          if (!w.assignments[key][gid].employeeIds.includes(emp.id)) {
            w.assignments[key][gid].employeeIds.push(emp.id)
          }
        })
      })
      const next = { ...existing, [weekKey]: w }
      setScheduleData(next)
      saveSchedule(next)
    } else {
      let changed = false
      const nextAssignments = {}
      const active = employees.filter(e => e.status !== 'discontinued' && e.groupId)
      const free = (emp) => (emp.freeDay || 'friday').toLowerCase()
      groups.forEach(g => {
        WEEK_DAYS.forEach(d => {
          if (!nextAssignments[d.key]) nextAssignments[d.key] = {}
          const current = week.assignments?.[d.key]?.[g.id] || { employeeIds: [], externals: [] }
          const shouldHave = active
            .filter(emp => emp.groupId === g.id && free(emp) !== d.key)
            .map(emp => emp.id)
          const existingIds = new Set(current.employeeIds || [])
          const toAdd = shouldHave.filter(id => !existingIds.has(id))
          const newIds = [...new Set([...(current.employeeIds || []), ...toAdd])]
          nextAssignments[d.key][g.id] = {
            employeeIds: newIds,
            externals: normalizeExternals(current)
          }
          if (toAdd.length > 0) changed = true
        })
      })
      if (changed) {
        const next = { ...existing, [weekKey]: { ...week, assignments: nextAssignments } }
        setScheduleData(next)
        saveSchedule(next)
      }
    }
  }, [weekKey, groups, employees])

  const updateCell = useCallback(
    (dayKey, groupId, updater) => {
      let week = scheduleData[weekKey]
      if (!week) {
        getOrCreateWeek()
        week = scheduleData[weekKey] || getSchedule()[weekKey]
      }
      if (!week) return
      const day = week.assignments[dayKey] || {}
      const cell = day[groupId] || { employeeIds: [], externals: [] }
      const next = updater({ ...cell })
      const nextDay = { ...day, [groupId]: next }
      const nextAssignments = { ...week.assignments, [dayKey]: nextDay }
      const nextWeek = { ...week, assignments: nextAssignments }
      const nextData = { ...scheduleData, [weekKey]: nextWeek }
      setScheduleData(nextData)
      saveSchedule(nextData)
    },
    [scheduleData, weekKey, getOrCreateWeek]
  )

  const addExternal = useCallback(
    (dayKey, groupId, name, role = 'assistant') => {
      const trimmed = (name || '').trim()
      if (!trimmed) return
      updateCell(dayKey, groupId, cell => ({
        ...cell,
        employeeIds: cell.employeeIds || [],
        externals: [...normalizeExternals(cell), { name: trimmed, role }]
      }))
    },
    [updateCell]
  )

  const updateExternalRole = useCallback(
    (dayKey, groupId, index, role) => {
      updateCell(dayKey, groupId, cell => {
        const ext = normalizeExternals(cell)
        if (index < 0 || index >= ext.length) return cell
        const next = [...ext]
        next[index] = { ...next[index], role }
        return { ...cell, employeeIds: cell.employeeIds || [], externals: next }
      })
    },
    [updateCell]
  )

  const removeExternal = useCallback(
    (dayKey, groupId, index) => {
      updateCell(dayKey, groupId, cell => ({
        ...cell,
        employeeIds: cell.employeeIds || [],
        externals: normalizeExternals(cell).filter((_, i) => i !== index)
      }))
    },
    [updateCell]
  )

  const removeEmployeeFromCell = useCallback(
    (dayKey, groupId, employeeId) => {
      updateCell(dayKey, groupId, cell => ({
        ...cell,
        employeeIds: (cell.employeeIds || []).filter(id => id !== employeeId)
      }))
    },
    [updateCell]
  )

  const handleDrop = useCallback(
    (e, targetDay, targetGroupId) => {
      e.preventDefault()
      const payload = e.dataTransfer.getData('application/json')
      if (!payload) return
      try {
        const data = JSON.parse(payload)
        const { sourceDay, sourceGroupId } = data
        if (sourceDay === targetDay && sourceGroupId === targetGroupId) return
        const week = scheduleData[weekKey] || getSchedule()[weekKey]
        if (!week?.assignments) return
        const nextAssignments = { ...week.assignments }
        const srcDay = { ...(nextAssignments[sourceDay] || {}) }
        const srcCell = srcDay[sourceGroupId] || { employeeIds: [], externals: [] }
        const srcExt = normalizeExternals(srcCell)
        let toAdd = null
        if (data.employeeId) {
          srcDay[sourceGroupId] = {
            ...srcCell,
            employeeIds: (srcCell.employeeIds || []).filter(id => id !== data.employeeId),
            externals: srcExt
          }
          toAdd = { type: 'emp', id: data.employeeId }
        } else if (data.externalIndex >= 0 && data.externalName != null) {
          const ext = srcExt[data.externalIndex]
          const nextExt = srcExt.filter((_, i) => i !== data.externalIndex)
          srcDay[sourceGroupId] = { ...srcCell, employeeIds: srcCell.employeeIds || [], externals: nextExt }
          toAdd = { type: 'ext', external: ext ? { name: ext.name, role: ext.role || 'assistant' } : { name: data.externalName, role: data.externalRole || 'assistant' } }
        }
        if (!toAdd) return
        nextAssignments[sourceDay] = srcDay
        const tgtDay = { ...(nextAssignments[targetDay] || {}) }
        const tgtCell = tgtDay[targetGroupId] || { employeeIds: [], externals: [] }
        const tgtExt = normalizeExternals(tgtCell)
        if (toAdd.type === 'emp' && !(tgtCell.employeeIds || []).includes(toAdd.id)) {
          tgtDay[targetGroupId] = {
            ...tgtCell,
            employeeIds: [...(tgtCell.employeeIds || []), toAdd.id],
            externals: tgtExt
          }
          nextAssignments[targetDay] = tgtDay
        } else if (toAdd.type === 'ext') {
          tgtDay[targetGroupId] = {
            ...tgtCell,
            employeeIds: tgtCell.employeeIds || [],
            externals: [...tgtExt, toAdd.external]
          }
          nextAssignments[targetDay] = tgtDay
        }
        const nextData = { ...scheduleData, [weekKey]: { ...week, assignments: nextAssignments } }
        setScheduleData(nextData)
        saveSchedule(nextData)
      } catch (_) {}
    },
    [scheduleData, weekKey]
  )

  const [dragOverCell, setDragOverCell] = useState(null)
  const handleDragOver = useCallback(e => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])
  const handleDragEnter = useCallback((dayKey, groupId) => {
    setDragOverCell(`${dayKey}-${groupId}`)
  }, [])
  const handleDragLeave = useCallback(() => {
    setDragOverCell(null)
  }, [])

  const handlePrevWeek = useCallback(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }, [weekStart])

  const handleNextWeek = useCallback(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }, [weekStart])

  const addEmployeeToCell = useCallback(
    (dayKey, groupId, employeeId) => {
      updateCell(dayKey, groupId, cell => {
        if ((cell.employeeIds || []).includes(employeeId)) return cell
        return {
          ...cell,
          employeeIds: [...(cell.employeeIds || []), employeeId]
        }
      })
    },
    [updateCell]
  )

  const empMap = useMemo(() => getEmployeeMap(), [getEmployeeMap])

  const getStaffingStatus = useCallback(
    (dayKey, groupId) => {
      const cell = getCellAssignments(dayKey, groupId)
      const group = groups.find(g => g.id === groupId)
      if (!group) return 'gray'
      const min = group.staffingMin || { lead: 1, assistant: 1, cook: 0 }
      const opt = group.staffingOptimal || { lead: 2, assistant: 2, cook: 0 }
      const counts = { lead: 0, assistant: 0, cook: 0 }
      ;(cell.employeeIds || []).forEach(id => {
        const emp = empMap.get(id)
        if (emp?.role) counts[emp.role] = (counts[emp.role] || 0) + 1
      })
      ;(normalizeExternals(cell) || []).forEach(ext => {
        const r = ext.role || 'assistant'
        if (counts[r] !== undefined) counts[r] = (counts[r] || 0) + 1
      })
      const meetMin =
        (counts.lead || 0) >= (min.lead || 0) &&
        (counts.assistant || 0) >= (min.assistant || 0) &&
        (counts.cook || 0) >= (min.cook || 0)
      const meetOpt =
        (counts.lead || 0) >= (opt.lead || 0) &&
        (counts.assistant || 0) >= (opt.assistant || 0) &&
        (counts.cook || 0) >= (opt.cook || 0)
      if (meetOpt) return 'green'
      if (meetMin) return 'amber'
      return 'red'
    },
    [getCellAssignments, groups, empMap]
  )

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <h3>{t.scheduleTitle}</h3>
        <p>{t.addAgeGroupsFirst}</p>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handlePrevWeek}>
            ← {t.prevWeek}
          </button>
          <h3 style={{ margin: 0, minWidth: '220px' }}>
            {t.week}: {formatWeekRange(weekStart)}
          </h3>
          <button className="btn btn-secondary" onClick={handleNextWeek}>
            {t.nextWeek} →
          </button>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setWeekStart(getWeekSunday(new Date()))}
        >
          {t.currentWeek}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '13px',
          alignItems: 'center'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: 4,
            background: '#4CAF50'
          }}
        />
        {t.greenOptimal}
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: 4,
            background: '#FF9800',
            marginLeft: 12
          }}
        />
        {t.amberMinimum}
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: 4,
            background: '#f44336',
            marginLeft: 12
          }}
        />
        {t.redBelow}
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table schedule-grid" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th className="schedule-grid-header" style={{ minWidth: 100, padding: '10px' }}>{t.groupCol}</th>
              {WEEK_DAYS.map(d => (
                <th key={d.key} className="schedule-grid-header" style={{ minWidth: 140, padding: '10px' }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => (
              <tr key={group.id} className={`schedule-group-row schedule-group-${groupIndex % 3}`}>
                <td
                  className="schedule-group-label"
                  style={{
                    fontWeight: 700,
                    padding: '10px'
                  }}
                >
                  {group.name || group.label}
                </td>
                {WEEK_DAYS.map(day => {
                  const cell = getCellAssignments(day.key, group.id)
                  const status = getStaffingStatus(day.key, group.id)
                  const bgMap = {
                    green: 'rgba(76, 175, 80, 0.2)',
                    amber: 'rgba(255, 152, 0, 0.2)',
                    red: 'rgba(244, 67, 54, 0.2)',
                    gray: 'transparent'
                  }
                  return (
                    <td
                      key={day.key}
                      onDragOver={handleDragOver}
                      onDragEnter={() => handleDragEnter(day.key, group.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => {
                        setDragOverCell(null)
                        handleDrop(e, day.key, group.id)
                      }}
                      className={`schedule-cell ${dragOverCell === `${day.key}-${group.id}` ? 'schedule-cell-drag-over' : ''}`}
                      style={{
                        padding: '8px',
                        minWidth: 140,
                        background: bgMap[status] || 'transparent',
                        verticalAlign: 'top'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          minHeight: 80,
                          position: 'relative',
                          paddingTop: 26
                        }}
                      >
                        {status !== 'gray' && (
                          <span
                            title={status === 'green' ? t.adequatelyStaffed : status === 'amber' ? t.belowOptimal : t.belowMinimum}
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              background: status === 'green' ? '#4CAF50' : status === 'amber' ? '#FF9800' : '#f44336',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 700,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                          >
                            {status === 'green' ? '✓' : '!'}
                          </span>
                        )}
                        {(cell.employeeIds || []).map(id => {
                          const emp = empMap.get(id)
                          const name = emp?.name || id
                          return (
                            <div
                              key={id}
                              draggable
                              onDragStart={e => {
                                e.dataTransfer.setData(
                                  'application/json',
                                  JSON.stringify({
                                    employeeId: id,
                                    sourceDay: day.key,
                                    sourceGroupId: group.id
                                  })
                                )
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              style={{
                                padding: '6px 10px',
                                background: 'var(--color-primary-light)',
                                borderRadius: 8,
                                fontSize: 12,
                                cursor: 'grab',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span>{name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeEmployeeFromCell(day.key, group.id, id)
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  padding: '0 4px',
                                  color: '#666'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                        {(cell.externals || []).map((ext, i) => (
                          <div
                            key={`ext-${i}`}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.setData(
                                'application/json',
                                JSON.stringify({
                                  externalName: ext.name,
                                  externalIndex: i,
                                  externalRole: ext.role,
                                  sourceDay: day.key,
                                  sourceGroupId: group.id
                                })
                              )
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--color-secondary-mint)',
                              borderRadius: 8,
                              fontSize: 12,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'grab'
                            }}
                          >
                            <span style={{ flex: 1 }}>{ext.name} (ext)</span>
                            <select
                              value={ext.role === 'cook' ? 'assistant' : (ext.role || 'assistant')}
                              onChange={e => {
                                e.stopPropagation()
                                updateExternalRole(day.key, group.id, i, e.target.value)
                              }}
                              onClick={e => e.stopPropagation()}
                              style={{
                                fontSize: 10,
                                padding: '2px 4px',
                                marginLeft: 4,
                                cursor: 'pointer'
                              }}
                            >
                              {EXTERNAL_ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                removeExternal(day.key, group.id, i)
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 14
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <CellPersonDropdown
                          dayKey={day.key}
                          groupId={group.id}
                          group={group}
                          employees={employees}
                          groups={groups}
                          cell={cell}
                          empMap={empMap}
                          onAddEmployee={addEmployeeToCell}
                          onAddExternal={addExternal}
                        />
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CellPersonDropdown({
  dayKey,
  groupId,
  group,
  employees,
  groups,
  cell,
  empMap,
  onAddEmployee,
  onAddExternal
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualRole, setManualRole] = useState('assistant')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const manualInputRef = useRef(null)
  const listRef = useRef(null)
  const optionRefs = useRef([])

  const activeEmps = useMemo(
    () => employees.filter(e => e.status !== 'discontinued'),
    [employees]
  )
  const inGroup = useMemo(
    () => activeEmps.filter(e => e.groupId === groupId),
    [activeEmps, groupId]
  )
  const otherEmps = useMemo(
    () => activeEmps.filter(e => e.groupId && e.groupId !== groupId),
    [activeEmps, groupId]
  )
  const alreadyInCell = new Set([
    ...(cell?.employeeIds || []),
    ...(normalizeExternals(cell) || []).map(ext => `ext:${ext.name}`)
  ])
  const freeDay = (emp) => (emp.freeDay || 'friday').toLowerCase()
  const isAvailable = (emp) => freeDay(emp) !== dayKey
  const matchesQuery = (name) =>
    !query.trim() ||
    (name || '')
      .toLowerCase()
      .includes(query.trim().toLowerCase())

  const inGroupFiltered = useMemo(
    () => inGroup.filter(e => matchesQuery(e.name || '')),
    [inGroup, query]
  )
  const otherFiltered = useMemo(
    () => otherEmps.filter(e => matchesQuery(e.name || '')),
    [otherEmps, query]
  )

  const options = useMemo(() => {
    const list = []
    list.push({ type: 'divider', label: t.inThisGroup(inGroupFiltered.length) })
    inGroupFiltered.forEach(e => {
      const available = isAvailable(e) && !alreadyInCell.has(e.id)
      const suffix = !isAvailable(e) ? ` — ${t.off}` : alreadyInCell.has(e.id) ? ` — ${t.alreadyAdded}` : ''
      const roleLabel = e.role ? (e.role === 'cook' ? t.assistant : EXTERNAL_ROLES.find(r => r.value === e.role)?.label || e.role) : ''
      list.push({
        type: 'emp',
        id: e.id,
        label: (e.name || t.unnamed) + (roleLabel ? ` (${roleLabel})` : '') + suffix,
        emp: e,
        disabled: !available
      })
    })
    if (otherFiltered.length) {
      list.push({ type: 'divider', label: t.fromOtherGroups })
      otherFiltered.forEach(e => {
        const available = isAvailable(e) && !alreadyInCell.has(e.id)
        const g = groups.find(gr => gr.id === e.groupId)
        const suffix = !isAvailable(e) ? ` — ${t.off}` : alreadyInCell.has(e.id) ? ` — ${t.alreadyAdded}` : ''
        const roleLabel = e.role ? (e.role === 'cook' ? t.assistant : EXTERNAL_ROLES.find(r => r.value === e.role)?.label || e.role) : ''
        list.push({
          type: 'emp',
          id: e.id,
          label: (e.name || t.unnamed) + (g ? ` — ${g.name}` : '') + (roleLabel ? ` (${roleLabel})` : '') + suffix,
          emp: e,
          disabled: !available
        })
      })
    }
    list.push({ type: 'divider', label: t.manualAdd })
    if (query.trim()) {
      list.push({ type: 'external', label: t.addAsExternal(query.trim()), externalName: query.trim() })
    }
    list.push({ type: 'manual', label: t.addManually })
    return list
  }, [inGroupFiltered, otherFiltered, groups, query, dayKey, alreadyInCell])

  const selectableOptions = options.filter(
    o => (o.type === 'emp' && !o.disabled) || o.type === 'external' || o.type === 'manual'
  )

  useEffect(() => {
    if (!open || selectableOptions.length === 0) return
    const el = optionRefs.current[focusedIndex]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex, open, selectableOptions.length])

  useEffect(() => {
    if (!open) return
    if (!query.trim()) {
      setFocusedIndex(0)
      return
    }
    const firstMatch = selectableOptions.findIndex(o => o.type === 'emp')
    if (firstMatch >= 0) setFocusedIndex(firstMatch)
    else setFocusedIndex(Math.max(0, selectableOptions.length - 1))
  }, [query, open, selectableOptions])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open && !showManualInput && inputRef.current) inputRef.current.focus()
  }, [open, showManualInput])

  useEffect(() => {
    if (!open) {
      setShowManualInput(false)
      setManualName('')
    }
  }, [open])

  const handleSelect = (opt) => {
    if (opt.type === 'emp' && !opt.disabled) {
      onAddEmployee(dayKey, groupId, opt.id)
      setOpen(false)
      setQuery('')
      setShowManualInput(false)
    } else if (opt.type === 'external' && opt.externalName) {
      onAddExternal(dayKey, groupId, opt.externalName, manualRole)
      setQuery('')
      setOpen(false)
      setShowManualInput(false)
    } else if (opt.type === 'manual') {
      setShowManualInput(true)
      setTimeout(() => manualInputRef.current?.focus(), 50)
    }
  }

  const handleManualAdd = (e) => {
    e?.preventDefault?.()
    const name = (manualName || query || '').trim()
    if (name) {
      onAddExternal(dayKey, groupId, name, manualRole)
      setManualName('')
      setQuery('')
      setShowManualInput(false)
      setOpen(false)
    }
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, selectableOptions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const sel = selectableOptions[focusedIndex]
      if (sel) handleSelect(sel)
      return
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: 12,
          border: '1px dashed var(--color-primary)',
          borderRadius: 8,
          background: open ? 'var(--color-primary-light)' : 'transparent',
          color: 'var(--color-primary)',
          cursor: 'pointer',
          fontWeight: 600,
          textAlign: 'right'
        }}
      >
        + {t.addPerson}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 100,
            overflow: 'hidden',
            maxHeight: 280
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.searchByName}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              border: 'none',
              borderBottom: '1px solid var(--color-gray-medium)',
              outline: 'none'
            }}
          />
          <div
            ref={listRef}
            className="schedule-person-dropdown-list"
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth'
            }}
          >
            {options.reduce((acc, opt, idx) => {
              if (opt.type === 'divider') {
                acc.push(
                  <div
                    key={`div-${idx}`}
                    style={{
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-text-light)',
                      background: 'var(--color-gray-light)'
                    }}
                  >
                    {opt.label}
                  </div>
                )
                return acc
              }
              const canSelect = (opt.type === 'emp' && !opt.disabled) || opt.type === 'external' || opt.type === 'manual'
              const selIdx = canSelect ? selectableOptions.findIndex(o =>
                o.type === opt.type &&
                (o.id === opt.id || (o.type === 'external' && o.externalName === opt.externalName) || (o.type === 'manual'))
              ) : -1
              const isFocused = canSelect && selIdx === focusedIndex
              acc.push(
                <div
                  key={opt.type === 'emp' ? opt.id : `ext-${idx}`}
                  ref={el => { if (canSelect && selIdx >= 0) optionRefs.current[selIdx] = el }}
                  onClick={() => canSelect && handleSelect(opt)}
                  onMouseEnter={() => canSelect && setFocusedIndex(selIdx)}
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    cursor: canSelect ? 'pointer' : 'default',
                    background: isFocused ? 'var(--color-primary-light)' : opt.disabled ? 'var(--color-gray-light)' : 'transparent',
                    color: opt.disabled ? 'var(--color-text-light)' : 'inherit',
                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  {opt.type === 'manual' && (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>✎ </span>
                  )}
                  {opt.type === 'external' && !opt.externalName && (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>✎ </span>
                  )}
                  {opt.label}
                </div>
              )
              return acc
            }, [])}
            {showManualInput && (
              <form
                onSubmit={handleManualAdd}
                style={{
                  padding: 12,
                  borderTop: '1px solid var(--color-gray-medium)',
                  background: 'var(--color-primary-light)'
                }}
              >
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder={t.typeNameEnter}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 13,
                    border: '2px solid var(--color-primary)',
                    borderRadius: 8,
                    marginBottom: 8
                  }}
                />
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-light)', display: 'block', marginBottom: 4 }}>{t.role}</label>
                  <select
                    value={manualRole}
                    onChange={e => setManualRole(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      border: '2px solid var(--color-gray-medium)',
                      borderRadius: 8,
                      width: '100%'
                    }}
                  >
                    {EXTERNAL_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                  {t.add}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleTab
