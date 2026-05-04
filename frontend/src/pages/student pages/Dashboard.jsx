import DashboardFrame from '../../components/DashboardFrame'
import DataSection from '../../components/DataSection'
import StatGrid from '../../components/StatGrid'

export default function StudentDashboard({ data, session }) {
  const student = data.students.find((item) => Number(item.user_id) === Number(session.id)) || data.students.find((item) => item.name === session.name) || data.students[0]
  const academics = data.student_academics.filter((item) => Number(item.student_id) === Number(student?.id))
  const attendance = data.attendance.filter((item) => Number(item.student_id) === Number(student?.id))
  const fees = data.fees.filter((item) => Number(item.student_id) === Number(student?.id))
  const results = data.academic_results.filter((item) => Number(item.student_id) === Number(student?.id))
  const present = attendance.filter((item) => item.status === 'present').length
  const percentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0
  const due = fees.reduce((sum, fee) => sum + Number(fee.due_amount || 0), 0)

  return (
    <DashboardFrame title="Student Dashboard" role={session.name}>
      <section className="portal-hero student-portal">
        <div>
          <span className="eyebrow">Student Portal</span>
          <h2>{student?.name || session.name}</h2>
          <p>Track classes, attendance, fees, academic level, and results in one mobile-friendly place.</p>
        </div>
      </section>
      <StatGrid stats={[['Academic Programs', academics.length], ['Attendance', `${percentage}%`], ['Fee Due', `Rs. ${due.toLocaleString('en-IN')}`], ['Results', results.length]]} />
      <div className="student-progress">
        <div>
          <span>Attendance Progress</span>
          <strong>{percentage}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${percentage}%` }}></span></div>
      </div>
      <div className="dashboard-grid">
        <DataSection compact title="My Academic Program" rows={academics} columns={['program_name', 'grade_name', 'university_program_name', 'start_date', 'status']} />
        <DataSection compact title="My Fees" rows={fees} columns={['fee_type', 'total_amount', 'paid_amount', 'due_amount', 'status']} />
      </div>
      <DataSection title="Attendance" rows={attendance} columns={['course_name', 'branch_name', 'date', 'status']} />
      <DataSection title="Results" rows={results} columns={['grade_name', 'exam_name', 'university_program_name', 'marks', 'grade', 'result_status']} />
      <DataSection title="Notifications" rows={data.notifications.filter((item) => ['student', 'all'].includes(item.role))} columns={['title', 'message', 'created_at']} />
    </DashboardFrame>
  )
}
