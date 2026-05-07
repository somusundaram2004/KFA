import { useRef, useState } from 'react'
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

function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0
}

function hasRequiredAcademicDetails(academic) {
  return Boolean(academic?.program_id || academic?.grade_id || academic?.university_program_id || academic?.academic_track)
}

function StudentAcademicDetailsGate({ data, student, session, onSaveAcademicDetails }) {
  const [form, setForm] = useState({
    academic_track: 'regular',
    program_id: '',
    grade_id: '',
    university_program_id: '',
    other_exam_name: '',
    start_date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const programs = data.programs || []
  const grades = data.grade_levels || []
  const universityPrograms = data.university_programs || []

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSaveAcademicDetails(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardFrame title="Student Dashboard" role={session.name} fullScreen>
      <section className="admin-workspace academic-gate-workspace">
        <section className="portal-hero academic-gate-hero">
          <div>
            <span className="eyebrow">Academic details required</span>
            <h2>{student?.name || session.name}</h2>
            <p>Fill your program and grade details to open your dashboard, fees, attendance, events, results, and alerts.</p>
          </div>
        </section>

        <form className="panel form-grid academic-gate-form" onSubmit={submit}>
          <div className="form-title-row">
            <div>
              <h3>Complete Academic Details</h3>
              <p className="hint">Choose the track that applies to you. Regular class students can save without grade or university exam details.</p>
            </div>
          </div>
          <label className="field-control">
            <span>Academic Track</span>
            <select required value={form.academic_track} onChange={(event) => setForm({ ...form, academic_track: event.target.value })}>
              <option value="regular">Regular Classes Only</option>
              <option value="grade">Grade Exam</option>
              <option value="university">University Exam</option>
              <option value="grade_university">Grade And University Exam</option>
              <option value="other">Other Exam Plan</option>
            </select>
          </label>
          <label className="field-control">
            <span>Program</span>
            <select value={form.program_id} onChange={(event) => setForm({ ...form, program_id: event.target.value })}>
              <option value="">Select Program</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}
            </select>
          </label>
          <label className="field-control">
            <span>Grade</span>
            <select required={['grade', 'grade_university'].includes(form.academic_track)} value={form.grade_id} onChange={(event) => setForm({ ...form, grade_id: event.target.value })}>
              <option value="">Select Grade</option>
              {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.grade_name}</option>)}
            </select>
          </label>
          <label className="field-control">
            <span>University Program</span>
            <select required={['university', 'grade_university'].includes(form.academic_track)} value={form.university_program_id} onChange={(event) => setForm({ ...form, university_program_id: event.target.value })}>
              <option value="">Select University Program</option>
              {universityPrograms.map((program) => (
                <option key={program.id} value={program.id}>{program.program_name}{program.university_name ? ` - ${program.university_name}` : ''}</option>
              ))}
            </select>
          </label>
          {form.academic_track === 'other' && (
            <label className="field-control">
              <span>Other Exam Plan</span>
              <input required value={form.other_exam_name} onChange={(event) => setForm({ ...form, other_exam_name: event.target.value })} />
            </label>
          )}
          <label className="field-control">
            <span>Start Date</span>
            <input type="date" required value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
          </label>
          <button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save And Open Dashboard'}</button>
        </form>
      </section>
    </DashboardFrame>
  )
}

function StudentAlerts({ notifications, due }) {
  const alerts = [
    due > 0 && { id: 'fee-due', title: 'Fee due', message: `Pending amount: Rs. ${due.toLocaleString('en-IN')}` },
    ...notifications,
  ].filter(Boolean)

  if (!alerts.length) {
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
        {alerts.map((item) => (
          <article className="portal-alert-card" key={item.id || `${item.title}-${item.created_at}`}>
            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : 'KFA alert'}</span>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function StudentDashboard({ data, session, onSaveAcademicDetails, sidebarOpen, setSidebarOpen }) {
  const workspaceRef = useRef(null)
  const [activePage, setActivePage] = useState('overview')
  const [attendanceFilters, setAttendanceFilters] = useState({ batch_id: '', date: '' })
  const student = (data.students || []).find((item) => Number(item.user_id) === Number(session.id)) || (data.students || []).find((item) => item.name === session.name)
  const academics = (data.student_academics || []).filter((item) => Number(item.student_id) === Number(student?.id))
  const currentAcademic = academics[0]
  const academicDetailsComplete = hasRequiredAcademicDetails(currentAcademic)
  const attendance = (data.attendance || []).filter((item) => Number(item.student_id) === Number(student?.id))
  const studentBatches = data.batches || []
  const filteredAttendance = attendance
    .filter((item) => !attendanceFilters.batch_id || Number(item.batch_id) === Number(attendanceFilters.batch_id))
    .filter((item) => !attendanceFilters.date || String(item.date || '').slice(0, 10) === attendanceFilters.date)
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
  const notifications = (data.notifications || []).filter((item) => ['student', 'all'].includes(item.role))
  const hasAcademicPrograms = hasRows(academics)
  const hasFees = hasRows(fees)
  const hasReceipts = hasRows(paidReceipts)
  const hasEventDetails = hasRows(eventPrograms) || hasRows(eventParticipants) || hasRows(eventItems) || hasRows(eventCharges)
  const hasResults = hasRows(results)
  const present = attendance.filter((item) => item.status === 'present').length
  const percentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0
  const due = fees.reduce((sum, fee) => sum + Number(fee.due_amount || 0), 0) + eventCharges.reduce((sum, charge) => sum + Number(charge.due_amount || 0), 0)
  const stats = [
    hasAcademicPrograms && ['Academic Programs', academics.length],
    hasRows(attendance) && ['Attendance', `${percentage}%`],
    hasFees && ['Total Due', `Rs. ${due.toLocaleString('en-IN')}`],
    hasEventDetails && ['Event Programs', eventPrograms.length],
    hasResults && ['Results', results.length],
    ['Alerts', notifications.length + (due > 0 ? 1 : 0)],
  ].filter(Boolean)

  const studentPages = [
    { id: 'overview', label: 'Overview', detail: 'Profile summary' },
    hasAcademicPrograms && { id: 'programs', label: 'Programs', detail: 'Academic details' },
    hasRows(attendance) && { id: 'attendance', label: 'Attendance', detail: 'Class history' },
    (hasFees || hasReceipts) && { id: 'fees', label: 'Fees', detail: 'Dues and receipts' },
    hasEventDetails && { id: 'events', label: 'Events', detail: 'Program duties' },
    hasResults && { id: 'results', label: 'Results', detail: 'Exam results' },
    { id: 'alerts', label: 'Alerts', detail: 'Notifications' },
  ].filter(Boolean)

  const activeMeta = studentPages.find((page) => page.id === activePage) || studentPages[0]

  if (!academicDetailsComplete) {
    return <StudentAcademicDetailsGate data={data} student={student} session={session} onSaveAcademicDetails={onSaveAcademicDetails} />
  }

  function selectPage(pageId) {
    setActivePage(pageId)
    setSidebarOpen(false)
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  return (
    <DashboardFrame title="Student Dashboard" role={session.name} fullScreen>
      <div className={`admin-layout portal-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
        <button className="sidebar-scrim" type="button" aria-label="Close student menu" onClick={() => setSidebarOpen(false)}></button>
        <aside className={`admin-sidebar portal-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Student work areas">
          <div className="admin-sidebar-title">
            <div>
              <span className="eyebrow">Student</span>
              <strong>{student?.name || session.name}</strong>
            </div>
          </div>
          <nav>
            {studentPages.map((page) => (
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
              <span className="eyebrow">Student page</span>
              <h2>{activeMeta.label}</h2>
              <p>{activeMeta.detail} for your KFA learning record.</p>
            </div>
          </div>

          {activePage === 'overview' && (
            <>
              <section className="portal-hero student-portal student-overview-hero">
                <div>
                  <span className="eyebrow">Student Portal</span>
                  <h2>{student?.name || session.name}</h2>
                  <p>Track only the classes, fees, programs, events, and results assigned to you.</p>
                </div>
                <div className="student-profile-card">
                  {student?.branch_name && <strong>{student.branch_name}</strong>}
                  {student?.parent_name && <span>Parent: {student.parent_name}</span>}
                  {(student?.phone || student?.email) && <small>{student.phone || student.email}</small>}
                </div>
              </section>
              <StatGrid stats={stats} />
              {!!attendance.length && (
                <div className="student-progress">
                  <div>
                    <span>Attendance Progress</span>
                    <strong>{percentage}%</strong>
                  </div>
                  <div className="progress-track"><span style={{ width: `${percentage}%` }}></span></div>
                </div>
              )}
              <StudentAlerts notifications={notifications.slice(0, 3)} due={due} />
            </>
          )}

          {activePage === 'programs' && <DataSection title="My Academic Program" rows={academics} columns={['academic_track', 'program_name', 'grade_name', 'university_program_name', 'other_exam_name', 'start_date', 'status']} />}
          {activePage === 'attendance' && (
            <>
              <section className="panel form-grid">
                <h3>Attendance Filters</h3>
                <label className="field-control">
                  <span>Batch</span>
                  <select value={attendanceFilters.batch_id} onChange={(event) => setAttendanceFilters({ ...attendanceFilters, batch_id: event.target.value })}>
                    <option value="">All Batches</option>
                    {studentBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_name} - {batch.course_name}</option>)}
                  </select>
                </label>
                <label className="field-control">
                  <span>Date</span>
                  <input type="date" value={attendanceFilters.date} onChange={(event) => setAttendanceFilters({ ...attendanceFilters, date: event.target.value })} />
                </label>
              </section>
              <DataSection title="Attendance" rows={filteredAttendance} columns={['course_name', 'batch_name', 'branch_name', 'date', 'day_of_week', 'attendance_time', 'status']} />
            </>
          )}

          {activePage === 'fees' && (
            <>
              {!!fees.length && <DataSection title="My Fees" rows={fees} columns={['fee_type', 'total_amount', 'paid_amount', 'due_amount', 'fee_show_date', 'monthly_due_date', 'status']} />}
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
            </>
          )}

          {activePage === 'events' && (
            <>
              {!!eventPrograms.length && <DataSection title="My Event Programs" rows={eventPrograms} columns={['program_name', 'event_date', 'event_time', 'venue', 'branch_name', 'status']} />}
              {!!eventParticipants.length && <DataSection title="My Program Team / Role" rows={eventParticipants} columns={['program_name', 'team_name', 'course_name', 'branch_name', 'grade_name', 'role_name', 'participation_status', 'notes']} />}
              {!!eventItems.length && <DataSection title="Program Song / Item Lists" rows={eventItems} columns={['program_name', 'category', 'item_title', 'item_notes', 'display_order']} />}
              {!!eventCharges.length && <DataSection title="Program Charges" rows={eventCharges} columns={['program_name', 'charge_type', 'amount', 'paid_amount', 'due_amount', 'status', 'notes']} />}
            </>
          )}

          {activePage === 'results' && <DataSection title="Results" rows={results} columns={['grade_exam_board', 'grade_name', 'university_exam_board', 'exam_name', 'university_program_name', 'marks', 'grade', 'result_status']} />}
          {activePage === 'alerts' && <StudentAlerts notifications={notifications} due={due} />}
        </section>
      </div>
    </DashboardFrame>
  )
}
