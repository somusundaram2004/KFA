import { useRef, useState } from 'react'
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
  const [activePage, setActivePage] = useState('overview')
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [attendanceDate, setAttendanceDate] = useState(todayValue())
  const selectedClass = classes.find((item) => String(item.id) === String(selectedClassId))
  const selectedDay = selectedClass?.day_of_week || 'Class Day'
  const classAttendance = (data.attendance || []).filter((item) => String(item.class_id) === String(selectedClassId))
  const todaysAttendance = classAttendance.filter((item) => item.date === attendanceDate)
  const enrolledStudentIds = (data.enrollments || []).filter((item) => Number(item.course_id) === Number(selectedClass?.course_id)).map((item) => Number(item.student_id))
  const roster = (data.students || []).filter((student) => enrolledStudentIds.length ? enrolledStudentIds.includes(Number(student.id)) : Number(student.branch_id || selectedClass?.branch_id) === Number(selectedClass?.branch_id || student.branch_id))
  const presentCount = todaysAttendance.filter((item) => item.status === 'present').length
  const eventPrograms = data.event_programs || []
  const eventTeams = data.event_program_teams || []
  const eventParticipants = data.event_program_participants || []
  const eventItems = (data.event_program_items || []).filter((item) => eventPrograms.some((program) => Number(program.id) === Number(item.event_program_id)))
  const notifications = (data.notifications || []).filter((item) => ['staff', 'all'].includes(item.role))
  const hasEvents = hasRows(eventPrograms) || hasRows(eventTeams) || hasRows(eventItems) || hasRows(eventParticipants)
  const stats = [
    ['Assigned Classes', classes.length],
    selectedClass && ['Marked Present', `${presentCount}/${roster.length}`],
    hasEvents && ['Event Programs', eventPrograms.length],
    ['Alerts', notifications.length],
  ].filter(Boolean)

  const staffPages = [
    { id: 'overview', label: 'Overview', detail: 'Today summary' },
    hasRows(classes) && { id: 'attendance', label: 'Attendance', detail: 'Mark class attendance' },
    hasRows(classes) && { id: 'classes', label: 'Classes', detail: 'Assigned timetable' },
    hasEvents && { id: 'events', label: 'Programs', detail: 'Event duties' },
    { id: 'alerts', label: 'Alerts', detail: 'Notifications' },
  ].filter(Boolean)

  const activeMeta = staffPages.find((page) => page.id === activePage) || staffPages[0]

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
      class_id: selectedClassId,
      date: attendanceDate,
      day_of_week: selectedClass?.day_of_week || new Date(attendanceDate).toLocaleDateString('en-US', { weekday: 'long' }),
      attendance_time: selectedClass?.start_time || new Date().toTimeString().slice(0, 5),
      status,
    }
    if (existing) {
      updateRecord('attendance', existing.id, record)
      return
    }
    markAttendance(record)
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
              {!classes.length && <AlertList notifications={[{ id: 'no-classes', title: 'No classes assigned', message: 'Assigned classes will appear here after admin updates the timetable.' }, ...notifications]} />}
              {!!notifications.length && <AlertList notifications={notifications.slice(0, 3)} />}
            </>
          )}

          {activePage === 'attendance' && (
            <>
              <div className="class-card-grid day-card-grid">
                {classes.map((item) => (
                  <button key={item.id} type="button" className={String(selectedClassId) === String(item.id) ? 'class-card day-card active' : 'class-card day-card'} onClick={() => setSelectedClassId(item.id)}>
                    <span>{item.day_of_week || 'Class Day'}</span>
                    <strong>{item.course_name}</strong>
                    <span>{item.branch_name || 'KFA Branch'}</span>
                    <small>{formatTime(item.start_time)} - {formatTime(item.end_time)}</small>
                  </button>
                ))}
              </div>
              <section className="panel attendance-roster-panel">
                <div className="form-title-row">
                  <div>
                    <h3>{selectedClass ? `${selectedDay}: ${selectedClass.course_name}` : 'Attendance'}</h3>
                    <p className="hint">{selectedClass ? `${selectedClass.branch_name || 'KFA Branch'} | ${formatTime(selectedClass.start_time)} - ${formatTime(selectedClass.end_time)}` : 'Choose a day card to view students.'}</p>
                  </div>
                  <label className="field-control compact-control">
                    <span>Date</span>
                    <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} />
                  </label>
                </div>
                {!roster.length ? (
                  <p className="empty">No students found for this class yet.</p>
                ) : (
                  <div className="attendance-roster">
                    {roster.map((student) => {
                      const marked = attendanceFor(student.id)
                      const isPresent = marked?.status === 'present'
                      return (
                        <article className={isPresent ? 'attendance-student present' : 'attendance-student'} key={student.id}>
                          <div>
                            <strong>{student.name}</strong>
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
              {!!classAttendance.length && <DataSection title="Class Attendance History" rows={classAttendance} columns={['student_name', 'course_name', 'date', 'day_of_week', 'attendance_time', 'status']} />}
            </>
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
