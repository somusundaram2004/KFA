import { useEffect, useRef, useState } from 'react'
import DashboardFrame from '../../components/DashboardFrame'
import DataSection from '../../components/DataSection'
import StatGrid from '../../components/StatGrid'

function formatTime(timeValue) {
  if (!timeValue) return ''
  const [hour, minute] = String(timeValue).split(':')
  const date = new Date()
  date.setHours(Number(hour || 0), Number(minute || 0), 0, 0)
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0
}

function AlertList({ notifications }) {
  if (!notifications.length) {
    return (
      <section className="panel portal-alert-panel">
        <h3>Alerts</h3>
        <p className="empty">No alerts right now.</p>
      </section>
    )
  }

  return (
    <section className="panel portal-alert-panel">
      <h3>Alerts</h3>
      <div className="portal-alert-grid">
        {notifications.map((item) => (
          <article className="portal-alert-card" key={item.id || `${item.title}-${item.created_at}`}>
            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : 'KFA update'}</span>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function StaffDashboard({ data, session, markAttendance, addRecord, updateRecord, sidebarOpen, setSidebarOpen }) {
  const workspaceRef = useRef(null)
  const staff = (data.staff || []).find((item) => Number(item.user_id) === Number(session.id)) || (data.staff || []).find((item) => item.name === session.name)
  const classes = (data.classes || []).filter((item) => Number(item.staff_id) === Number(staff?.id) || item.staff_name === staff?.name)
  const batches = (data.batches || []).filter((item) => Number(item.staff_id) === Number(staff?.id) || classes.some((classRow) => Number(classRow.id) === Number(item.class_id)))
  const [activePage, setActivePage] = useState('overview')
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '')
  const [attendanceDate, setAttendanceDate] = useState(todayValue())
  const [newBatch, setNewBatch] = useState({ class_id: classes[0]?.id || '', batch_name: '', batch_type: 'weekday', start_time: '', end_time: '' })
  const [newBatchStudent, setNewBatchStudent] = useState({ batch_id: selectedBatchId || '', student_id: '' })
  const selectedBatch = batches.find((item) => String(item.id) === String(selectedBatchId))
  const selectedClass = classes.find((item) => String(item.id) === String(selectedBatch?.class_id))
  const batchForStudentForm = batches.find((item) => String(item.id) === String(newBatchStudent.batch_id || selectedBatchId))
  const classForStudentForm = classes.find((item) => String(item.id) === String(batchForStudentForm?.class_id))
  const eligibleStudentIds = new Set(
    (data.enrollments || [])
      .filter((enrollment) => classForStudentForm && String(enrollment.course_id) === String(classForStudentForm.course_id))
      .map((enrollment) => String(enrollment.student_id)),
  )
  const eligibleStudents = batchForStudentForm
    ? (data.students || []).filter((student) => eligibleStudentIds.has(String(student.id)))
    : []
  const selectedDay = selectedClass?.day_of_week || 'Class Day'
  const batchAttendance = (data.attendance || []).filter((item) => String(item.batch_id || '') === String(selectedBatchId))
  const todaysAttendance = batchAttendance.filter((item) => item.date === attendanceDate)
  const batchStudentRows = (data.batch_students || []).filter((item) => String(item.batch_id) === String(selectedBatchId))
  const roster = batchStudentRows.map((row) => {
    const student = (data.students || []).find((item) => Number(item.id) === Number(row.student_id))
    return student ? { ...student, student_code: row.student_id } : null
  }).filter(Boolean)
  const presentCount = todaysAttendance.filter((item) => item.status === 'present').length
  const eventPrograms = data.event_programs || []
  const eventTeams = data.event_program_teams || []
  const eventParticipants = data.event_program_participants || []
  const eventItems = (data.event_program_items || []).filter((item) => eventPrograms.some((program) => Number(program.id) === Number(item.event_program_id)))
  const notifications = (data.notifications || []).filter((item) => ['staff', 'all'].includes(item.role))
  const hasEvents = hasRows(eventPrograms) || hasRows(eventTeams) || hasRows(eventItems) || hasRows(eventParticipants)
  const stats = [
    ['Assigned Batches', batches.length],
    selectedClass && ['Marked Present', `${presentCount}/${roster.length}`],
    hasEvents && ['Event Programs', eventPrograms.length],
    ['Alerts', notifications.length],
  ].filter(Boolean)

  const staffPages = [
    { id: 'overview', label: 'Overview', detail: 'Today summary' },
    { id: 'attendance', label: 'Attendance', detail: 'Mark batch attendance' },
    { id: 'batches', label: 'Batches', detail: 'Create and enroll' },
    hasRows(classes) && { id: 'classes', label: 'Classes', detail: 'Assigned timetable' },
    hasEvents && { id: 'events', label: 'Programs', detail: 'Event duties' },
    { id: 'alerts', label: 'Alerts', detail: 'Notifications' },
  ].filter(Boolean)

  const activeMeta = staffPages.find((page) => page.id === activePage) || staffPages[0]

  useEffect(() => {
    if (!selectedBatchId && batches[0]?.id) {
      setSelectedBatchId(batches[0].id)
      setNewBatchStudent((current) => ({ ...current, batch_id: current.batch_id || batches[0].id }))
    }
  }, [batches, selectedBatchId])

  useEffect(() => {
    if (!newBatch.class_id && classes[0]?.id) {
      setNewBatch((current) => ({ ...current, class_id: classes[0].id }))
    }
  }, [classes, newBatch.class_id])

  function selectPage(pageId) {
    setActivePage(pageId)
    setSidebarOpen(false)
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  function attendanceFor(studentId) {
    return todaysAttendance.find((item) => Number(item.student_id) === Number(studentId))
  }

  function setAttendance(studentId, status) {
    const existing = attendanceFor(studentId)
    const record = {
      student_id: studentId,
      class_id: selectedBatch?.class_id,
      batch_id: selectedBatchId,
      date: attendanceDate,
      day_of_week: selectedClass?.day_of_week || new Date(attendanceDate).toLocaleDateString('en-US', { weekday: 'long' }),
      attendance_time: selectedBatch?.start_time || selectedClass?.start_time || new Date().toTimeString().slice(0, 5),
      status,
    }
    if (existing) {
      updateRecord('attendance', existing.id, record)
      return
    }
    markAttendance(record)
  }

  async function createBatch(event) {
    event.preventDefault()
    const saved = {
      ...newBatch,
      staff_id: staff?.id,
    }
    await addRecord('batches', saved)
    setNewBatch({ class_id: classes[0]?.id || '', batch_name: '', batch_type: 'weekday', start_time: '', end_time: '' })
  }

  async function addStudentToBatch(event) {
    event.preventDefault()
    const batchId = newBatchStudent.batch_id || selectedBatchId
    await addRecord('batch_students', {
      ...newBatchStudent,
      batch_id: batchId,
      enrollment_date: todayValue(),
    })
    setNewBatchStudent({ batch_id: batchId || '', student_id: '' })
  }

  return (
    <DashboardFrame title="Staff Dashboard" role={session.name} fullScreen>
      <div className={`admin-layout portal-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
        <button className="sidebar-scrim" type="button" aria-label="Close staff menu" onClick={() => setSidebarOpen(false)}></button>
        <aside className={`admin-sidebar portal-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Staff work areas">
          <div className="admin-sidebar-title">
            <div>
              <span className="eyebrow">Faculty</span>
              <strong>{session.name}</strong>
            </div>
          </div>
          <nav>
            {staffPages.map((page) => (
              <button key={page.id} className={activePage === page.id ? 'active' : ''} type="button" onClick={() => selectPage(page.id)}>
                <span>{page.label}</span>
                <small>{page.detail}</small>
              </button>
            ))}
          </nav>
        </aside>

        <section className="admin-workspace" ref={workspaceRef}>
          <div className="workspace-head">
            <div>
              <span className="eyebrow">Staff page</span>
              <h2>{activeMeta.label}</h2>
              <p>{activeMeta.detail} for KFA Music Academy.</p>
            </div>
          </div>

          {activePage === 'overview' && (
            <>
              <section className="portal-hero staff-portal">
                <div>
                  <span className="eyebrow">Faculty Portal</span>
                  <h2>{staff?.specialization || 'Teaching'} workspace</h2>
                  <p>Manage classes, attendance, event duties, and student updates from one clean screen.</p>
                </div>
              </section>
              <StatGrid stats={stats} />
              {!batches.length && <AlertList notifications={[{ id: 'no-batches', title: 'No batches assigned', message: 'Assigned batches will appear here after admin or staff creates them.' }, ...notifications]} />}
              {!!notifications.length && <AlertList notifications={notifications.slice(0, 3)} />}
            </>
          )}

          {activePage === 'attendance' && (
            <>
              <div className="class-card-grid day-card-grid">
                {batches.map((item) => (
                  <button key={item.id} type="button" className={String(selectedBatchId) === String(item.id) ? 'class-card day-card active' : 'class-card day-card'} onClick={() => {
                    setSelectedBatchId(item.id)
                    setNewBatchStudent((current) => ({ ...current, batch_id: item.id }))
                  }}>
                    <span>{item.batch_type || 'weekday'}</span>
                    <strong>{item.course_name}</strong>
                    <span>{item.batch_name}</span>
                    <span>{item.branch_name || 'KFA Branch'}</span>
                    <small>{formatTime(item.start_time)} - {formatTime(item.end_time)}</small>
                    <small>{(data.batch_students || []).filter((row) => Number(row.batch_id) === Number(item.id)).length} students</small>
                  </button>
                ))}
              </div>
              <section className="panel attendance-roster-panel">
                <div className="form-title-row">
                  <div>
                    <h3>{selectedBatch ? `${selectedBatch.batch_name}: ${selectedBatch.course_name}` : 'Attendance'}</h3>
                    <p className="hint">{selectedBatch ? `${selectedBatch.batch_type || 'weekday'} | ${selectedBatch.branch_name || 'KFA Branch'} | ${formatTime(selectedBatch.start_time)} - ${formatTime(selectedBatch.end_time)}` : 'Choose a batch card to view students.'}</p>
                  </div>
                  <label className="field-control compact-control">
                    <span>Date</span>
                    <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} />
                  </label>
                </div>
                {!selectedBatch ? (
                  <p className="empty">No batch selected yet.</p>
                ) : !roster.length ? (
                  <p className="empty">No students enrolled in this batch yet.</p>
                ) : (
                  <div className="attendance-roster">
                    {roster.map((student) => {
                      const marked = attendanceFor(student.id)
                      const isPresent = marked?.status === 'present'
                      return (
                        <article className={isPresent ? 'attendance-student present' : 'attendance-student'} key={student.id}>
                          <div>
                            <strong>{student.name}</strong>
                            <span>ID: {student.id}</span>
                            {(student.phone || student.email) && <span>{student.phone || student.email}</span>}
                          </div>
                          <button type="button" className={isPresent ? 'present-toggle is-on' : 'present-toggle'} onClick={() => setAttendance(student.id, isPresent ? 'absent' : 'present')} aria-pressed={isPresent}>
                            <span></span>
                            {isPresent ? 'Present' : 'Absent'}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
              {!!batchAttendance.length && <DataSection title="Batch Attendance History" rows={batchAttendance} columns={['student_name', 'course_name', 'batch_name', 'date', 'day_of_week', 'attendance_time', 'status']} />}
            </>
          )}

          {activePage === 'batches' && (
            <div className="dashboard-grid">
              <form className="panel form-grid" onSubmit={createBatch}>
                <h3>Create Batch</h3>
                <label className="field-control">
                  <span>Class</span>
                  <select required value={newBatch.class_id} onChange={(event) => setNewBatch({ ...newBatch, class_id: event.target.value })}>
                    <option value="">Select Class</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.course_name} - {item.day_of_week}</option>)}
                  </select>
                </label>
                <label className="field-control">
                  <span>Batch Name</span>
                  <input required value={newBatch.batch_name} onChange={(event) => setNewBatch({ ...newBatch, batch_name: event.target.value })} />
                </label>
                <label className="field-control">
                  <span>Type</span>
                  <select value={newBatch.batch_type} onChange={(event) => setNewBatch({ ...newBatch, batch_type: event.target.value })}>
                    <option value="weekday">Weekday</option>
                    <option value="weekend">Weekend</option>
                  </select>
                </label>
                <label className="field-control">
                  <span>Start Time</span>
                  <input required type="time" value={newBatch.start_time} onChange={(event) => setNewBatch({ ...newBatch, start_time: event.target.value })} />
                </label>
                <label className="field-control">
                  <span>End Time</span>
                  <input required type="time" value={newBatch.end_time} onChange={(event) => setNewBatch({ ...newBatch, end_time: event.target.value })} />
                </label>
                <button className="primary">Save Batch</button>
              </form>
              <form className="panel form-grid" onSubmit={addStudentToBatch}>
                <h3>Add Student To Batch</h3>
                <label className="field-control">
                  <span>Batch</span>
                  <select required value={newBatchStudent.batch_id || selectedBatchId} onChange={(event) => setNewBatchStudent({ ...newBatchStudent, batch_id: event.target.value, student_id: '' })}>
                    <option value="">Select Batch</option>
                    {batches.map((item) => <option key={item.id} value={item.id}>{item.batch_name} - {item.course_name}</option>)}
                  </select>
                </label>
                <label className="field-control">
                  <span>Student</span>
                  <select required value={newBatchStudent.student_id} disabled={!batchForStudentForm || !eligibleStudents.length} onChange={(event) => setNewBatchStudent({ ...newBatchStudent, student_id: event.target.value })}>
                    <option value="">{batchForStudentForm ? 'Select Student' : 'Select batch first'}</option>
                    {eligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.name} - ID {student.id}</option>)}
                  </select>
                  {batchForStudentForm && !eligibleStudents.length && <small className="select-detail">No students enrolled in this class course yet.</small>}
                </label>
                <button className="primary">Add Student</button>
              </form>
              <DataSection title="My Batches" rows={batches.map((batch) => ({ ...batch, student_count: (data.batch_students || []).filter((row) => Number(row.batch_id) === Number(batch.id)).length }))} columns={['course_name', 'batch_name', 'batch_type', 'start_time', 'end_time', 'student_count']} />
            </div>
          )}

          {activePage === 'classes' && <DataSection title="Assigned Classes" rows={classes} columns={['course_name', 'branch_name', 'day_of_week', 'start_time', 'end_time']} />}

          {activePage === 'events' && (
            <>
              {!!eventPrograms.length && <DataSection title="Assigned Event Programs" rows={eventPrograms} columns={['program_name', 'event_date', 'event_time', 'venue', 'branch_name', 'status']} />}
              {!!eventTeams.length && <DataSection title="My Program Teams" rows={eventTeams} columns={['program_name', 'team_name', 'team_notes']} />}
              {!!eventItems.length && <DataSection title="Program Song / Item Lists" rows={eventItems} columns={['program_name', 'category', 'item_title', 'item_notes', 'display_order']} />}
              {!!eventParticipants.length && <DataSection title="Program Participants" rows={eventParticipants} columns={['program_name', 'student_name', 'team_name', 'course_name', 'branch_name', 'grade_name', 'role_name', 'participation_status', 'notes']} />}
            </>
          )}

          {activePage === 'alerts' && (
            <div className="dashboard-grid">
              <AlertList notifications={notifications} />
              <form className="panel form-grid" onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                addRecord('notifications', { title: form.get('title'), message: form.get('message'), role: 'student', created_at: new Date().toISOString() })
                event.currentTarget.reset()
              }}>
                <h3>Send Student Update</h3>
                <input name="title" required placeholder="Title" />
                <textarea name="message" required placeholder="Message" />
                <button className="primary">Send</button>
              </form>
            </div>
          )}
        </section>
      </div>
    </DashboardFrame>
  )
}
