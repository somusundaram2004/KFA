import DashboardFrame from '../../components/DashboardFrame'
import DataSection from '../../components/DataSection'
import StatGrid from '../../components/StatGrid'
import { downloadReceipt, feeReceiptData, openReceipt } from '../../utils/receipts'

function monthlyDate(dayValue) {
  const day = Number(dayValue)
  if (!day) return '-'
  const now = new Date()
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(Math.max(day, 1), maxDay)
  return new Date(now.getFullYear(), now.getMonth(), safeDay).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentDashboard({ data, session }) {
  const student = (data.students || []).find((item) => Number(item.user_id) === Number(session.id)) || (data.students || []).find((item) => item.name === session.name)
  const academics = (data.student_academics || []).filter((item) => Number(item.student_id) === Number(student?.id))
  const attendance = (data.attendance || []).filter((item) => Number(item.student_id) === Number(student?.id))
  const fees = (data.fees || []).filter((item) => Number(item.student_id) === Number(student?.id)).map((fee) => ({
    ...fee,
    fee_show_date: fee.fee_frequency === 'one-time' ? '-' : monthlyDate(fee.billing_day || 1),
    monthly_due_date: fee.fee_frequency === 'one-time' ? '-' : monthlyDate(fee.due_day || fee.billing_day || 10),
  }))
  const payments = (data.payments || []).filter((payment) => fees.some((fee) => Number(fee.id) === Number(payment.fee_id)))
  const paidReceipts = payments.length
    ? payments.map((payment) => {
      const fee = fees.find((item) => Number(item.id) === Number(payment.fee_id))
      return feeReceiptData({ fee, student, payment })
    })
    : fees.filter((fee) => Number(fee.paid_amount || 0) > 0 || fee.status === 'paid').map((fee) => feeReceiptData({ fee, student }))
  const results = (data.academic_results || []).filter((item) => Number(item.student_id) === Number(student?.id))
  const eventPrograms = data.event_programs || []
  const eventItems = data.event_program_items || []
  const eventParticipants = data.event_program_participants || []
  const eventCharges = data.event_program_charges || []
  const notifications = data.notifications || []
  const hasAcademicPrograms = academics.length > 0
  const hasFees = fees.length > 0
  const hasEventDetails = eventPrograms.length || eventParticipants.length || eventItems.length || eventCharges.length
  const hasResults = results.length > 0
  const present = attendance.filter((item) => item.status === 'present').length
  const percentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0
  const due = fees.reduce((sum, fee) => sum + Number(fee.due_amount || 0), 0) + eventCharges.reduce((sum, charge) => sum + Number(charge.due_amount || 0), 0)
  const stats = [
    hasAcademicPrograms && ['Academic Programs', academics.length],
    hasEventDetails && ['Event Programs', eventPrograms.length],
    ['Total Due', `Rs. ${due.toLocaleString('en-IN')}`],
    hasResults && ['Results', results.length],
  ].filter(Boolean)

  return (
    <DashboardFrame title="Student Dashboard" role={session.name}>
      <section className="portal-hero student-portal student-overview-hero">
        <div>
          <span className="eyebrow">Student Portal</span>
          <h2>{student?.name || session.name}</h2>
          <p>Track classes, attendance, fees, academic level, and results in one mobile-friendly place.</p>
        </div>
        <div className="student-profile-card">
          <strong>{student?.branch_name || 'KFA Branch'}</strong>
          <span>{student?.parent_name ? `Parent: ${student.parent_name}` : 'Student profile'}</span>
          <small>{student?.phone || student?.email || 'Contact details not set'}</small>
        </div>
      </section>
      <StatGrid stats={stats} />
      <div className="student-progress">
        <div>
          <span>Attendance Progress</span>
          <strong>{percentage}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${percentage}%` }}></span></div>
      </div>
      {(hasAcademicPrograms || hasFees) && (
        <div className="dashboard-grid">
          {hasAcademicPrograms && <DataSection compact title="My Academic Program" rows={academics} columns={['program_name', 'grade_name', 'university_program_name', 'start_date', 'status']} />}
          {hasFees && <DataSection compact title="My Fees" rows={fees} columns={['fee_type', 'total_amount', 'paid_amount', 'due_amount', 'fee_show_date', 'monthly_due_date', 'status']} />}
        </div>
      )}
      {!fees.length && <section className="table-section empty-state-panel"><h3>No Fees Assigned</h3><p className="empty">Your fee details will appear here when admin assigns monthly or program fees.</p></section>}
      {!!paidReceipts.length && (
        <section className="table-section">
          <h3>My Receipts</h3>
          <div className="receipt-grid">
            {paidReceipts.map((receipt) => (
              <article className="receipt-card" key={receipt.receiptNo}>
                <span>{receipt.receiptNo}</span>
                <strong>{receipt.item}</strong>
                <p>Paid {`Rs. ${Number(receipt.paidAmount || 0).toLocaleString('en-IN')}`} on {receipt.date}</p>
                <div className="row-actions">
                  <button type="button" onClick={() => openReceipt(receipt)}>View</button>
                  <button type="button" onClick={() => downloadReceipt(receipt)}>Download</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {!!attendance.length && <DataSection title="Attendance" rows={attendance} columns={['course_name', 'branch_name', 'date', 'day_of_week', 'attendance_time', 'status']} />}
      {!!hasEventDetails && (
        <>
          {!!eventPrograms.length && <DataSection title="My Event Programs" rows={eventPrograms} columns={['program_name', 'event_date', 'event_time', 'venue', 'branch_name', 'status']} />}
          {!!eventParticipants.length && <DataSection title="My Program Team / Role" rows={eventParticipants} columns={['program_name', 'team_name', 'course_name', 'branch_name', 'grade_name', 'role_name', 'participation_status', 'notes']} />}
          {!!eventItems.length && <DataSection title="Program Song / Item Lists" rows={eventItems} columns={['program_name', 'category', 'item_title', 'item_notes', 'display_order']} />}
          {!!eventCharges.length && <DataSection title="Program Charges" rows={eventCharges} columns={['program_name', 'charge_type', 'amount', 'paid_amount', 'due_amount', 'status', 'notes']} />}
        </>
      )}
      {hasResults && <DataSection title="Results" rows={results} columns={['grade_name', 'exam_name', 'university_program_name', 'marks', 'grade', 'result_status']} />}
      <DataSection title="Notifications" rows={notifications.filter((item) => ['student', 'all'].includes(item.role))} columns={['title', 'message', 'created_at']} />
    </DashboardFrame>
  )
}
