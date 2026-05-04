import { useState } from 'react'
import DashboardFrame from '../../components/DashboardFrame'
import DataSection from '../../components/DataSection'
import StatGrid from '../../components/StatGrid'

export default function StaffDashboard({ data, session, markAttendance, addRecord }) {
  const staff = data.staff.find((item) => Number(item.user_id) === Number(session.id)) || data.staff.find((item) => item.name === session.name) || data.staff[0]
  const classes = data.classes.filter((item) => Number(item.staff_id) === Number(staff?.id) || item.staff_name === staff?.name)
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [attendanceForm, setAttendanceForm] = useState({ student_id: '', status: 'present' })
  const today = new Date().toISOString().slice(0, 10)
  const selectedClass = classes.find((item) => String(item.id) === String(selectedClassId))
  const classAttendance = data.attendance.filter((item) => String(item.class_id) === String(selectedClassId))

  function submitAttendance(event) {
    event.preventDefault()
    markAttendance({ ...attendanceForm, class_id: selectedClassId, date: today })
    setAttendanceForm({ student_id: '', status: 'present' })
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
      <StatGrid stats={[['Assigned Classes', classes.length], ['Students', data.students.length], ['Marked Records', classAttendance.length], ['Notifications', data.notifications.length]]} />
      <div className="class-card-grid">
        {classes.map((item) => (
          <button key={item.id} type="button" className={String(selectedClassId) === String(item.id) ? 'class-card active' : 'class-card'} onClick={() => setSelectedClassId(item.id)}>
            <strong>{item.course_name}</strong>
            <span>{item.branch_name || 'KFA Branch'}</span>
            <small>{item.day_of_week} {item.start_time} - {item.end_time}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <form className="panel form-grid" onSubmit={submitAttendance}>
          <h3>{selectedClass ? `Today: ${selectedClass.course_name}` : 'Today Attendance'}</h3>
          <label className="field-control">
            <span>Student</span>
            <select required value={attendanceForm.student_id} onChange={(event) => setAttendanceForm({ ...attendanceForm, student_id: event.target.value })}>
              <option value="">Select student</option>
              {data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
          <label className="field-control">
            <span>Status</span>
            <select value={attendanceForm.status} onChange={(event) => setAttendanceForm({ ...attendanceForm, status: event.target.value })}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </label>
          <button className="primary">Mark Attendance</button>
        </form>
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
      <DataSection title="Class Attendance History" rows={classAttendance} columns={['student_name', 'course_name', 'date', 'status']} />
      <DataSection title="Assigned Classes" rows={classes} columns={['course_name', 'branch_name', 'day_of_week', 'start_time', 'end_time']} />
    </DashboardFrame>
  )
}
