import React, { useEffect, useMemo, useState } from 'react'
import { getEmployees, saveEmployees, getAgeGroups, getChildren } from '../utils/storage'
import { config } from '../config'
import { t } from '../i18n'

const EMPLOYMENT_STATUSES = [
  { value: 'permanent', label: t.permanent },
  { value: 'temp', label: t.temp },
  { value: 'discontinued', label: t.discontinued },
  { value: 'filler', label: t.filler }
]

const EMPLOYEE_ROLES = [
  { value: 'lead', label: t.lead },
  { value: 'assistant', label: t.assistant }
]

const WEEK_DAYS = [
  { value: 'sunday', label: t.sunday },
  { value: 'monday', label: t.monday },
  { value: 'tuesday', label: t.tuesday },
  { value: 'wednesday', label: t.wednesday },
  { value: 'thursday', label: t.thursday },
  { value: 'friday', label: t.friday }
]

const { min: WORK_MIN, max: WORK_MAX } = config.workHours
const HOURS = Array.from({ length: WORK_MAX - WORK_MIN + 1 }, (_, i) => WORK_MIN + i)

function decimalToTimeStr(decimal) {
  if (decimal == null || !Number.isFinite(decimal)) return `${WORK_MIN}:00`
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function parseTimeToDecimal(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.trim()
  if (/^\d+$/.test(s)) return Math.min(WORK_MAX, Math.max(WORK_MIN, Number(s)))
  const m1 = s.match(/^(\d{1,2}):(\d{1,2})$/)
  if (m1) {
    const h = parseInt(m1[1], 10)
    const m = parseInt(m1[2], 10)
    if (m >= 60) return null
    const dec = h + m / 60
    return Math.min(WORK_MAX, Math.max(WORK_MIN, dec))
  }
  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (m2) {
    const dec = parseFloat(s)
    return Math.min(WORK_MAX, Math.max(WORK_MIN, dec))
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.min(WORK_MAX, Math.max(WORK_MIN, n)) : null
}

function clampDecimal(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return WORK_MIN
  return Math.min(WORK_MAX, Math.max(WORK_MIN, x))
}

function EmployeesTab({ onEmployeesChange }) {
  const [employees, setEmployees] = useState([])
  const [ageGroups, setAgeGroups] = useState([])
  const [children, setChildren] = useState([])
  const [timeEdit, setTimeEdit] = useState(null) // { empId, field, str }

  useEffect(() => {
    setEmployees(getEmployees())
    setAgeGroups(getAgeGroups())
    setChildren(getChildren())
  }, [])

  const statusLabelByValue = useMemo(() => {
    const map = new Map()
    for (const s of EMPLOYMENT_STATUSES) map.set(s.value, s.label)
    return map
  }, [])

  const handleCellChange = (employeeId, field, value) => {
    const updated = employees.map(emp => (emp.id === employeeId ? { ...emp, [field]: value } : emp))
    setEmployees(updated)
    saveEmployees(updated)
    onEmployeesChange?.()
  }

  const handleDeleteEmployee = (employeeId, employeeName) => {
    const name = employeeName?.trim() ? employeeName.trim() : t.thisEmployee
    if (window.confirm(t.deleteConfirm(name))) {
      const updated = employees.filter(emp => emp.id !== employeeId)
      setEmployees(updated)
      saveEmployees(updated)
      onEmployeesChange?.()
    }
  }

  const handleAddRow = () => {
    const newEmployee = {
      id: `new-${Date.now()}`,
      workStart: WORK_MIN,
      workEnd: WORK_MAX,
      name: '',
      phone: '',
      status: 'permanent',
      freeDay: 'friday',
      groupId: '',
      role: 'assistant'
    }

    const updated = [...employees, newEmployee]
    setEmployees(updated)
    saveEmployees(updated)
    onEmployeesChange?.()
  }

  const handleTimeChange = (employeeId, field, rawValue) => {
    const decimal = typeof rawValue === 'number' ? clampDecimal(rawValue) : (parseTimeToDecimal(String(rawValue)) ?? (field === 'workStart' ? WORK_MIN : WORK_MAX))
    const current = employees.find(e => e.id === employeeId)
    const curStart = clampDecimal(current?.workStart ?? WORK_MIN)
    const curEnd = clampDecimal(current?.workEnd ?? WORK_MAX)
    let nextStart, nextEnd
    if (field === 'workStart') {
      nextStart = decimal
      nextEnd = curEnd <= decimal ? Math.min(WORK_MAX, decimal + 0.25) : curEnd
    } else {
      nextEnd = decimal
      nextStart = curStart >= decimal ? Math.max(WORK_MIN, decimal - 0.25) : curStart
    }
    const updated = employees.map(emp => {
      if (emp.id !== employeeId) return emp
      return { ...emp, workStart: nextStart, workEnd: nextEnd }
    })
    setEmployees(updated)
    saveEmployees(updated)
    onEmployeesChange?.()
  }

  // Compute per-group staffing and ratio info
  const groupStats = useMemo(() => {
    const stats = {}
    ageGroups.forEach(group => {
      stats[group.id] = {
        employees: 0,
        children: 0,
        ratio: null,
        targetRatio: group.ratio || null
      }
    })

    // Count employees per group (exclude discontinued)
    employees.forEach(emp => {
      const groupId = emp.groupId
      if (groupId && stats[groupId] && emp.status !== 'discontinued') {
        stats[groupId].employees += 1
      }
    })

    // Count registered children per group
    children.forEach(child => {
      const groupId = child.group
      if (groupId && stats[groupId] && child.registerStatus === 'registered') {
        stats[groupId].children += 1
      }
    })

    // Compute ratio = children / employees
    Object.keys(stats).forEach(id => {
      const g = stats[id]
      if (g.employees > 0) {
        g.ratio = g.children / g.employees
      } else {
        g.ratio = null
      }
    })

    return stats
  }, [ageGroups, employees, children])

  return (
    <div>
      {/* Group staffing & regulation summary */}
      <div className="age-group-widget" style={{ marginBottom: '20px' }}>
        <h3>{t.groupStaffing}</h3>
        <div className="age-group-stats">
          {ageGroups.map(group => {
            const stats = groupStats[group.id] || {
              employees: 0,
              children: 0,
              ratio: null,
              targetRatio: group.ratio || null
            }
            const isBelowTarget =
              stats.ratio !== null &&
              stats.targetRatio !== null &&
              stats.ratio < stats.targetRatio

            return (
              <div
                key={group.id}
                className="age-group-item"
                style={
                  isBelowTarget
                    ? { backgroundColor: 'rgba(244, 67, 54, 0.3)' }
                    : {}
                }
              >
                <div className="label">
                  {group.name || group.label}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {t.employeesCount}:&nbsp;
                  <strong>{stats.employees}</strong>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {t.childrenRegistered}:&nbsp;
                  <strong>{stats.children}</strong>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {t.targetRatio}:&nbsp;
                  <strong>{stats.targetRatio ?? t.na}</strong>
                </div>
                <div style={{ fontSize: '14px', marginTop: '6px' }}>
                  {t.currentRatio}:&nbsp;
                  {stats.ratio === null ? (
                    <span style={{ fontStyle: 'italic' }}>{t.na}</span>
                  ) : (
                    <span
                      style={
                        isBelowTarget
                          ? { color: '#f44336', fontWeight: '800' }
                          : { fontWeight: '700' }
                      }
                    >
                      {stats.ratio.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>
                <button
                  className="btn-icon"
                  onClick={handleAddRow}
                  title={t.addEmployee}
                  style={{
                    background: '#C47ECE',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  +
                </button>
              </th>
              <th style={{ width: '160px' }}>{t.name}</th>
              <th style={{ width: '90px' }}>{t.entry}</th>
              <th style={{ width: '90px' }}>{t.exit}</th>
              <th style={{ width: '140px' }}>{t.phone}</th>
              <th style={{ width: '120px' }}>{t.status}</th>
              <th style={{ width: '120px' }}>{t.role}</th>
              <th style={{ width: '140px' }}>{t.group}</th>
              <th style={{ width: '120px' }}>{t.freeDay}</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {t.noEmployees}
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      title={t.deleteEmployee}
                      style={{
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      {t.delete}
                    </button>
                  </td>

                  <td>
                    <input
                      type="text"
                      className="editable-input"
                      value={emp.name || ''}
                      onChange={(e) => handleCellChange(emp.id, 'name', e.target.value)}
                      placeholder={t.enterName}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      className="editable-input"
                      value={timeEdit?.empId === emp.id && timeEdit?.field === 'workStart' ? timeEdit.str : decimalToTimeStr(clampDecimal(emp.workStart ?? WORK_MIN))}
                      onChange={(e) => setTimeEdit(t => t?.empId === emp.id && t?.field === 'workStart' ? { ...t, str: e.target.value } : { empId: emp.id, field: 'workStart', str: e.target.value })}
                      onFocus={() => setTimeEdit({ empId: emp.id, field: 'workStart', str: decimalToTimeStr(clampDecimal(emp.workStart ?? WORK_MIN)) })}
                      onBlur={() => {
                        if (timeEdit?.empId === emp.id && timeEdit?.field === 'workStart') {
                          const dec = parseTimeToDecimal(timeEdit.str)
                          if (dec != null) handleTimeChange(emp.id, 'workStart', dec)
                          setTimeEdit(null)
                        }
                      }}
                      list="entry-hours-list"
                      placeholder={`${WORK_MIN}:00`}
                      style={{ fontSize: '12px', padding: '8px 6px', width: '72px' }}
                      title={t.typeTime('7:30')}
                    />
                    <datalist id="entry-hours-list">
                      {HOURS.map(h => (
                        <option key={h} value={`${h}:00`} />
                      ))}
                    </datalist>
                  </td>

                  <td>
                    <input
                      type="text"
                      className="editable-input"
                      value={timeEdit?.empId === emp.id && timeEdit?.field === 'workEnd' ? timeEdit.str : decimalToTimeStr(clampDecimal(emp.workEnd ?? WORK_MAX))}
                      onChange={(e) => setTimeEdit(t => t?.empId === emp.id && t?.field === 'workEnd' ? { ...t, str: e.target.value } : { empId: emp.id, field: 'workEnd', str: e.target.value })}
                      onFocus={() => setTimeEdit({ empId: emp.id, field: 'workEnd', str: decimalToTimeStr(clampDecimal(emp.workEnd ?? WORK_MAX)) })}
                      onBlur={() => {
                        if (timeEdit?.empId === emp.id && timeEdit?.field === 'workEnd') {
                          const dec = parseTimeToDecimal(timeEdit.str)
                          if (dec != null) handleTimeChange(emp.id, 'workEnd', dec)
                          setTimeEdit(null)
                        }
                      }}
                      list="exit-hours-list"
                      placeholder={`${WORK_MAX}:00`}
                      style={{ fontSize: '12px', padding: '8px 6px', width: '72px' }}
                      title={t.typeTime('17:30')}
                    />
                    <datalist id="exit-hours-list">
                      {HOURS.map(h => (
                        <option key={h} value={`${h}:00`} />
                      ))}
                    </datalist>
                  </td>

                  <td>
                    <input
                      type="tel"
                      className="editable-input"
                      value={emp.phone || ''}
                      onChange={(e) => handleCellChange(emp.id, 'phone', e.target.value)}
                      placeholder={t.enterPhone}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>

                  <td>
                    <select
                      className="editable-select"
                      value={emp.status || 'permanent'}
                      onChange={(e) => handleCellChange(emp.id, 'status', e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    >
                      {EMPLOYMENT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      className="editable-select"
                      value={emp.role === 'cook' ? 'assistant' : (emp.role || 'assistant')}
                      onChange={(e) => handleCellChange(emp.id, 'role', e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    >
                      {EMPLOYEE_ROLES.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      className="editable-select"
                      value={emp.groupId || ''}
                      onChange={(e) => handleCellChange(emp.id, 'groupId', e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    >
                      <option value="">{t.select}</option>
                      {ageGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name || group.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      className="editable-select"
                      value={emp.freeDay || 'friday'}
                      onChange={(e) => handleCellChange(emp.id, 'freeDay', e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                      title={`Status: ${statusLabelByValue.get(emp.status) || emp.status || ''}`}
                    >
                      {WEEK_DAYS.map(d => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EmployeesTab

