import { useState } from 'react'
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

export default function StaffDashboard({ data, session, markAttendance, addRecord, updateRecord }) {
  const staff = (data.staff || []).find((item) => Number(item.user_id) === Number(session.id)) || (data.staff || []).find((item) => item.name === session.name) || (data.staff || [])[0]
  const classes = (data.classes || []).filter((item) => Number(item.staff_id) === Number(staff?.id) || item.staff_name === staff?.name)
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
  const notifications = data.notifications || []

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
    <DashboardFrame title="Staff Dashboard" role={session.name}>
      <section className="portal-hero staff-portal">
        <div>
          <span className="eyebrow">Faculty Portal</span>
          <h2>{staff?.specialization || 'Teaching'} workspace</h2>
          <p>Manage today&apos;s classes, mark attendance, and send updates to students from one clean screen.</p>
        </div>
      </section>
      <StatGrid stats={[['Assigned Classes', classes.length], ['Marked Present', `${presentCount}/${roster.length}`], ['Event Programs', eventPrograms.length], ['Notifications', notifications.length]]} />
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
      <div className="dashboard-grid">
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
          {!selectedClass ? (
            <p className="empty">No assigned classes yet.</p>
          ) : !roster.length ? (
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
                      <span>{student.phone || student.email || 'Student'}</span>
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
      <DataSection title="Class Attendance History" rows={classAttendance} columns={['student_name', 'course_name', 'date', 'day_of_week', 'attendance_time', 'status']} />
      <DataSection title="Assigned Classes" rows={classes} columns={['course_name', 'branch_name', 'day_of_week', 'start_time', 'end_time']} />
      <DataSection title="Assigned Event Programs" rows={eventPrograms} columns={['program_name', 'event_date', 'event_time', 'venue', 'branch_name', 'status']} />
      <DataSection title="My Program Teams" rows={eventTeams} columns={['program_name', 'team_name', 'team_notes']} />
      <DataSection title="Program Song / Item Lists" rows={eventItems} columns={['program_name', 'category', 'item_title', 'item_notes', 'display_order']} />
      <DataSection title="Program Participants" rows={eventParticipants} columns={['program_name', 'student_name', 'team_name', 'course_name', 'branch_name', 'grade_name', 'role_name', 'participation_status', 'notes']} />
      <DataSection title="Notifications" rows={notifications.filter((item) => ['staff', 'all'].includes(item.role))} columns={['title', 'message', 'created_at']} />
    </DashboardFrame>
  )
}
