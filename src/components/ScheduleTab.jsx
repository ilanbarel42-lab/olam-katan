import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getAgeGroups, getEmployees, getSchedule, saveSchedule } from '../utils/storage'

const WEEK_DAYS = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' }
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

function formatWeekRange(sunday) {
  const sun = new Date(sunday)
  const fri = new Date(sunday)
  fri.setDate(fri.getDate() + 5)
  return `${sun.getDate()}/${sun.getMonth() + 1} - ${fri.getDate()}/${fri.getMonth() + 1} ${fri.getFullYear()}`
}


function ScheduleTab({ ageGroups }) {
  const [weekStart, setWeekStart] = useState(() => getWeekSunday(new Date()))
  const [scheduleData, setScheduleData] = useState({})
  const [employees, setEmployees] = useState([])
  const [groups, setGroups] = useState([])

  useEffect(() => {
    setEmployees(getEmployees())
    setGroups(ageGroups?.length ? ageGroups : getAgeGroups())
  }, [ageGroups])

  useEffect(() => {
    setScheduleData(getSchedule())
  }, [])

  const weekKey = toWeekKey(weekStart)

  const getCellAssignments = useCallback(
    (dayKey, groupId) => {
      const week = scheduleData[weekKey]
      if (!week?.assignments?.[dayKey]) return { employeeIds: [], externalNames: [] }
      const cell = week.assignments[dayKey][groupId]
      return cell || { employeeIds: [], externalNames: [] }
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
          week.assignments[d.key][g.id] = { employeeIds: [], externalNames: [] }
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
          if (!week.assignments[key][gid]) week.assignments[key][gid] = { employeeIds: [], externalNames: [] }
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

  const ensureWeek = useCallback(() => {
    const week = scheduleData[weekKey]
    if (!week) {
      getOrCreateWeek()
      return
    }
    let changed = false
    const nextAssignments = { ...week.assignments }
    groups.forEach(g => {
      WEEK_DAYS.forEach(d => {
        if (!nextAssignments[d.key]) nextAssignments[d.key] = {}
        if (!nextAssignments[d.key][g.id]) {
          nextAssignments[d.key][g.id] = { employeeIds: [], externalNames: [] }
          changed = true
        }
      })
    })
    if (changed) {
      const nextData = { ...scheduleData, [weekKey]: { ...week, assignments: nextAssignments } }
      setScheduleData(nextData)
      saveSchedule(nextData)
    }
  }, [scheduleData, weekKey, groups, getOrCreateWeek])

  useEffect(() => {
    if (groups.length && employees.length) ensureWeek()
  }, [weekKey, groups.length, employees.length, ensureWeek])

  const updateCell = useCallback(
    (dayKey, groupId, updater) => {
      let week = scheduleData[weekKey]
      if (!week) {
        getOrCreateWeek()
        week = scheduleData[weekKey] || getSchedule()[weekKey]
      }
      if (!week) return
      const day = week.assignments[dayKey] || {}
      const cell = day[groupId] || { employeeIds: [], externalNames: [] }
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
    (dayKey, groupId, name) => {
      const trimmed = (name || '').trim()
      if (!trimmed) return
      updateCell(dayKey, groupId, cell => ({
        ...cell,
        externalNames: [...(cell.externalNames || []), trimmed]
      }))
    },
    [updateCell]
  )

  const removeExternal = useCallback(
    (dayKey, groupId, index) => {
      updateCell(dayKey, groupId, cell => ({
        ...cell,
        externalNames: (cell.externalNames || []).filter((_, i) => i !== index)
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
        const { employeeId, sourceDay, sourceGroupId } = JSON.parse(payload)
        if (!employeeId) return
        if (sourceDay === targetDay && sourceGroupId === targetGroupId) return
        const week = scheduleData[weekKey] || getSchedule()[weekKey]
        if (!week?.assignments) return
        const nextAssignments = { ...week.assignments }
        const srcDay = { ...(nextAssignments[sourceDay] || {}) }
        const srcCell = srcDay[sourceGroupId] || { employeeIds: [], externalNames: [] }
        srcDay[sourceGroupId] = {
          ...srcCell,
          employeeIds: (srcCell.employeeIds || []).filter(id => id !== employeeId)
        }
        nextAssignments[sourceDay] = srcDay
        const tgtDay = { ...(nextAssignments[targetDay] || {}) }
        const tgtCell = tgtDay[targetGroupId] || { employeeIds: [], externalNames: [] }
        if (!(tgtCell.employeeIds || []).includes(employeeId)) {
          tgtDay[targetGroupId] = {
            ...tgtCell,
            employeeIds: [...(tgtCell.employeeIds || []), employeeId]
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

  const handleGenerate = useCallback(() => {
    getOrCreateWeek()
  }, [getOrCreateWeek])

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
      ;(cell.externalNames || []).forEach(() => {
        counts.assistant += 1
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
        <h3>Schedule</h3>
        <p>Add age groups in Settings first, then return here.</p>
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
            ← Prev
          </button>
          <h3 style={{ margin: 0, minWidth: '220px' }}>
            Week: {formatWeekRange(weekStart)}
          </h3>
          <button className="btn btn-secondary" onClick={handleNextWeek}>
            Next →
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setWeekStart(getWeekSunday(new Date()))}
          >
            Current Week
          </button>
          <button className="btn btn-primary" onClick={handleGenerate}>
            Generate / Refresh Week
          </button>
        </div>
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
        Green = Optimal
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
        Amber = Minimum
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
        Red = Below min
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 100, padding: '10px' }}>Group</th>
              {WEEK_DAYS.map(d => (
                <th key={d.key} style={{ minWidth: 140, padding: '10px' }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <tr key={group.id}>
                <td
                  style={{
                    fontWeight: 700,
                    padding: '10px',
                    background: 'var(--color-secondary-peach)'
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
                      className={dragOverCell === `${day.key}-${group.id}` ? 'schedule-cell-drag-over' : ''}
                      style={{
                        padding: '8px',
                        minWidth: 140,
                        background: bgMap[status] || 'transparent',
                        border: '1px solid var(--color-gray-medium)',
                        verticalAlign: 'top'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          minHeight: 80
                        }}
                      >
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
                        {(cell.externalNames || []).map((ext, i) => (
                          <div
                            key={`ext-${i}`}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--color-secondary-mint)',
                              borderRadius: 8,
                              fontSize: 12,
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{ext} (ext)</span>
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
                        <QuickAddInput
                          onAdd={name => addExternal(day.key, group.id, name)}
                          placeholder="+ External..."
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

      <AddEmployeePicker
        employees={employees}
        groups={groups}
        days={WEEK_DAYS}
        onAdd={addEmployeeToCell}
      />
    </div>
  )
}

function QuickAddInput({ onAdd, placeholder }) {
  const [value, setValue] = useState('')
  const handleSubmit = e => {
    e.preventDefault()
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
  }
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder || '+ Add external'}
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: 11,
          border: '1px dashed #999',
          borderRadius: 6
        }}
      />
    </form>
  )
}

function AddEmployeePicker({ employees, groups, days, onAdd }) {
  const [empId, setEmpId] = useState('')
  const [dayKey, setDayKey] = useState('')
  const [groupId, setGroupId] = useState('')
  const active = employees.filter(e => e.status !== 'discontinued')

  const handleAdd = () => {
    if (empId && dayKey && groupId) {
      onAdd(dayKey, groupId, empId)
    }
  }

  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(196, 126, 206, 0.12)'
      }}
    >
      <h4 style={{ marginBottom: 12 }}>Add Employee to Cell</h4>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={empId}
          onChange={e => setEmpId(e.target.value)}
          className="editable-select"
          style={{ minWidth: 140 }}
        >
          <option value="">Select employee</option>
          {active.map(e => (
            <option key={e.id} value={e.id}>
              {e.name || 'Unnamed'}
            </option>
          ))}
        </select>
        <select
          value={dayKey}
          onChange={e => setDayKey(e.target.value)}
          className="editable-select"
          style={{ minWidth: 120 }}
        >
          <option value="">Select day</option>
          {days.map(d => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value)}
          className="editable-select"
          style={{ minWidth: 120 }}
        >
          <option value="">Select group</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name || g.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!empId || !dayKey || !groupId}
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default ScheduleTab
