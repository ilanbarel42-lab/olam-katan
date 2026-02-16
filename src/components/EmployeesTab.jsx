import React, { useEffect, useMemo, useState } from 'react'
import { getEmployees, saveEmployees, getAgeGroups, getChildren } from '../utils/storage'

const EMPLOYMENT_STATUSES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'temp', label: 'Temp' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'filler', label: 'Filler' }
]

const EMPLOYEE_ROLES = [
  { value: 'lead', label: 'Lead' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'cook', label: 'Cook' }
]

// Sunday to Friday is the working week
const WEEK_DAYS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' }
]

const HOURS = Array.from({ length: 11 }, (_, i) => 7 + i) // 7..17

function EmployeesTab({ onEmployeesChange }) {
  const [employees, setEmployees] = useState([])
  const [ageGroups, setAgeGroups] = useState([])
  const [children, setChildren] = useState([])

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
    const name = employeeName?.trim() ? employeeName.trim() : 'this employee'
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      const updated = employees.filter(emp => emp.id !== employeeId)
      setEmployees(updated)
      saveEmployees(updated)
      onEmployeesChange?.()
    }
  }

  const handleAddRow = () => {
    const newEmployee = {
      id: `new-${Date.now()}`,
      workStart: 7,
      workEnd: 17,
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

  const clampHour = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return 7
    return Math.min(17, Math.max(7, x))
  }

  const handleRowStartChange = (employeeId, newStart) => {
    const start = clampHour(newStart)
    const current = employees.find(e => e.id === employeeId)
    const end = clampHour(current?.workEnd ?? 17)

    // Keep end >= start + 1 when possible
    const nextEnd = end <= start ? Math.min(17, start + 1) : end
    const updated = employees.map(emp => {
      if (emp.id !== employeeId) return emp
      return { ...emp, workStart: start, workEnd: nextEnd }
    })
    setEmployees(updated)
    saveEmployees(updated)
    onEmployeesChange?.()
  }

  const handleRowEndChange = (employeeId, newEnd) => {
    const end = clampHour(newEnd)
    const current = employees.find(e => e.id === employeeId)
    const start = clampHour(current?.workStart ?? 7)

    // Keep end >= start + 1 when possible
    const nextEnd = end <= start ? Math.min(17, start + 1) : end
    const updated = employees.map(emp => {
      if (emp.id !== employeeId) return emp
      return { ...emp, workEnd: nextEnd }
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
        <h3>Group Staffing & Regulation</h3>
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
                  Employees:&nbsp;
                  <strong>{stats.employees}</strong>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  Children (registered):&nbsp;
                  <strong>{stats.children}</strong>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  Target ratio (children / employee):&nbsp;
                  <strong>{stats.targetRatio ?? 'Not set'}</strong>
                </div>
                <div style={{ fontSize: '14px', marginTop: '6px' }}>
                  Current ratio:&nbsp;
                  {stats.ratio === null ? (
                    <span style={{ fontStyle: 'italic' }}>N/A</span>
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
                  title="Add new employee"
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
              <th style={{ width: '160px' }}>Name</th>
              <th style={{ width: '90px' }}>Start</th>
              <th style={{ width: '90px' }}>End</th>
              <th style={{ width: '140px' }}>Phone</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '120px' }}>Role</th>
              <th style={{ width: '140px' }}>Group</th>
              <th style={{ width: '120px' }}>Free Day</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No employees yet. Click the + button above to add one.
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      title="Delete this employee"
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
                      Delete
                    </button>
                  </td>

                  <td>
                    <input
                      type="text"
                      className="editable-input"
                      value={emp.name || ''}
                      onChange={(e) => handleCellChange(emp.id, 'name', e.target.value)}
                      placeholder="Enter name"
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    />
                  </td>

                  <td>
                    <select
                      className="editable-select"
                      value={clampHour(emp.workStart ?? 7)}
                      onChange={(e) => handleRowStartChange(emp.id, Number(e.target.value))}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      className="editable-select"
                      value={clampHour(emp.workEnd ?? 17)}
                      onChange={(e) => handleRowEndChange(emp.id, Number(e.target.value))}
                      style={{ fontSize: '12px', padding: '8px 6px' }}
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      type="tel"
                      className="editable-input"
                      value={emp.phone || ''}
                      onChange={(e) => handleCellChange(emp.id, 'phone', e.target.value)}
                      placeholder="Enter phone"
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
                      value={emp.role || 'assistant'}
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
                      <option value="">Select</option>
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

