import { useMemo, useRef, useState } from 'react'
import DashboardFrame from '../../components/DashboardFrame'
import DataSection from '../../components/DataSection'
import StatGrid from '../../components/StatGrid'
import { api } from '../../utils/api'

function cleanRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value === '' ? null : value]))
}

function mediaSrc(url) {
  if (!url) return ''
  if (url.startsWith('/uploads')) return `http://localhost:5000${url}`
  return url
}

function AdminForm({ title, fields, initialRecord, onSubmit, onCancel }) {
  const blank = useMemo(() => Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || ''])), [fields])
  const [form, setForm] = useState(initialRecord ? { ...blank, ...initialRecord } : blank)

  return (
    <form className="panel form-grid" onSubmit={(event) => {
      event.preventDefault()
      onSubmit(cleanRecord(form))
    }}>
      <div className="form-title-row">
        <h3>{initialRecord ? `Edit ${title}` : title}</h3>
        {initialRecord && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
      {fields.map((field) => (
        <label className="field-control" key={field.name}>
          <span>{field.label}</span>
          {field.type === 'select' ? (
            <select required={field.required !== false} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
              <option value="">{field.placeholder || `Select ${field.label}`}</option>
              {(field.options || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea required={field.required !== false} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
          ) : (
            <input type={field.type || 'text'} required={field.required !== false} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
          )}
        </label>
      ))}
      <button className="primary">{initialRecord ? 'Update' : 'Save'}</button>
    </form>
  )
}

function ManagedSection({ type, title, fields, rows, columns, filters = [], addRecord, updateRecord, deleteRecord }) {
  const [editing, setEditing] = useState(null)
  const [filterState, setFilterState] = useState({})
  const visibleRows = rows.filter((row) => filters.every((filter) => {
    const value = filterState[filter.name]
    if (!value) return true
    return String(row[filter.name] ?? '') === String(value)
  }))

  async function submit(record) {
    if (editing) {
      await updateRecord(type, editing.id, record)
      setEditing(null)
    } else {
      await addRecord(type, record)
    }
  }

  return (
    <>
      <AdminForm key={`${type}-${editing?.id || 'new'}`} title={title} fields={fields} initialRecord={editing} onSubmit={submit} onCancel={() => setEditing(null)} />
      <section className="table-section">
        <h3>{title.replace(/^Add /, '')}</h3>
        {!!filters.length && (
          <div className="filter-bar">
            {filters.map((filter) => (
              <label className="field-control" key={filter.name}>
                <span>{filter.label}</span>
                <select value={filterState[filter.name] || ''} onChange={(event) => setFilterState({ ...filterState, [filter.name]: event.target.value })}>
                  <option value="">All</option>
                  {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
        {!visibleRows.length ? (
          <p className="empty">No records yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => <td key={column}>{String(row[column] ?? '-')}</td>)}
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => setEditing(row)}>Edit</button>
                        <button type="button" onClick={() => deleteRecord(type, row.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function AttendanceView({ data }) {
  const [selectedClassId, setSelectedClassId] = useState(data.classes[0]?.id || '')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const selectedClass = data.classes.find((item) => String(item.id) === String(selectedClassId))
  const rows = data.attendance.filter((item) => {
    const classMatch = !selectedClassId || String(item.class_id) === String(selectedClassId)
    const dateMatch = !selectedDate || item.date?.slice(0, 10) === selectedDate
    return classMatch && dateMatch
  })
  const previousRows = data.attendance.filter((item) => !selectedClassId || String(item.class_id) === String(selectedClassId))

  return (
    <>
      <div className="class-card-grid">
        {data.classes.map((item) => (
          <button key={item.id} type="button" className={String(selectedClassId) === String(item.id) ? 'class-card active' : 'class-card'} onClick={() => setSelectedClassId(item.id)}>
            <strong>{item.course_name}</strong>
            <span>{item.branch_name || 'Branch not set'}</span>
            <small>{item.day_of_week} {item.start_time} - {item.end_time}</small>
          </button>
        ))}
      </div>
      <section className="table-section">
        <div className="form-title-row">
          <h3>{selectedClass ? `${selectedClass.course_name} Attendance` : 'Attendance'}</h3>
          <label className="field-control compact-control">
            <span>Date</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
        </div>
        <DataSection compact title="Selected Date" rows={rows} columns={['student_name', 'course_name', 'branch_name', 'date', 'status']} />
        <DataSection compact title="Previous Attendance" rows={previousRows} columns={['student_name', 'course_name', 'branch_name', 'date', 'status']} />
      </section>
    </>
  )
}

function FeesView({ data, optionSets }) {
  const [filters, setFilters] = useState({ branch_id: '', student_id: '', status: '', fee_type: '' })
  const rows = data.fees.filter((fee) => Object.entries(filters).every(([key, value]) => !value || String(fee[key] ?? '') === String(value)))
  const paidCount = rows.filter((fee) => fee.status === 'paid').length
  const unpaidCount = rows.filter((fee) => fee.status !== 'paid').length

  return (
    <section className="table-section">
      <div className="fee-summary">
        <article><strong>{paidCount}</strong><span>Paid</span></article>
        <article><strong>{unpaidCount}</strong><span>Not Paid / Partial</span></article>
      </div>
      <div className="filter-bar">
        {[
          { name: 'branch_id', label: 'Branch', options: optionSets.branches },
          { name: 'student_id', label: 'Student', options: optionSets.students },
          { name: 'fee_type', label: 'Fee Type', options: optionSets.feeTypes },
          { name: 'status', label: 'Status', options: optionSets.feeStatuses },
        ].map((filter) => (
          <label className="field-control" key={filter.name}>
            <span>{filter.label}</span>
            <select value={filters[filter.name]} onChange={(event) => setFilters({ ...filters, [filter.name]: event.target.value })}>
              <option value="">All</option>
              {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      <DataSection compact title="Student Fee Details" rows={rows} columns={['student_name', 'branch_name', 'fee_type', 'course_name', 'program_name', 'grade_name', 'university_program_name', 'total_amount', 'paid_amount', 'due_amount', 'status']} />
    </section>
  )
}

function MediaManager({ data, optionSets, addRecord, updateRecord, deleteRecord }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', media_type: 'photo', class_id: '', file: null, media_url: '', thumbnail_url: '' })
  const [error, setError] = useState('')

  function edit(item) {
    setEditing(item)
    setForm({
      title: item.title || '',
      media_type: item.media_type || 'photo',
      class_id: item.class_id || '',
      file: null,
      media_url: item.media_url || '',
      thumbnail_url: item.thumbnail_url || '',
    })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      let mediaUrl = form.media_url
      if (form.file) {
        const upload = new FormData()
        upload.append('file', form.file)
        const result = await api('/uploads/gallery', { method: 'POST', body: upload })
        mediaUrl = result.url
      }
      const record = cleanRecord({
        class_id: form.class_id,
        title: form.title,
        media_type: form.media_type,
        media_url: mediaUrl,
        thumbnail_url: form.thumbnail_url,
      })
      if (editing) {
        await updateRecord('class_media', editing.id, record)
        setEditing(null)
      } else {
        await addRecord('class_media', record)
      }
      setForm({ title: '', media_type: 'photo', class_id: '', file: null, media_url: '', thumbnail_url: '' })
    } catch {
      setError('Could not save this gallery item. Restart the backend and try again.')
    }
  }

  return (
    <>
      <form className="panel form-grid" onSubmit={submit}>
        <div className="form-title-row">
          <h3>{editing ? 'Edit Gallery Item' : 'Add Gallery Photo'}</h3>
          {editing && <button type="button" onClick={() => setEditing(null)}>Cancel</button>}
        </div>
        <label className="field-control">
          <span>Photo title</span>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Example: Shivaratri program by our students"
            required
          />
        </label>
        <label className="field-control">
          <span>Type</span>
          <select value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value })}>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className="field-control">
          <span>Class</span>
          <select value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value })}>
            <option value="">No class</option>
            {optionSets.classes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {form.media_type === 'photo' ? (
          <label className="field-control">
            <span>Upload Photo</span>
            <input type="file" accept="image/*" onChange={(event) => setForm({ ...form, file: event.target.files[0] })} required={!editing && !form.media_url} />
          </label>
        ) : (
          <>
            <label className="field-control">
              <span>Video URL</span>
              <input value={form.media_url} onChange={(event) => setForm({ ...form, media_url: event.target.value })} required />
            </label>
            <label className="field-control">
              <span>Thumbnail URL</span>
              <input value={form.thumbnail_url || ''} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} />
            </label>
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary">{editing ? 'Update' : 'Save'}</button>
      </form>
      <section className="table-section">
        <h3>Gallery Items</h3>
        <div className="media-admin-grid">
          {data.class_media.map((item) => (
            <article className="media-admin-card" key={item.id}>
              {item.media_type === 'photo' ? <img src={mediaSrc(item.media_url)} alt={item.title} /> : <div className="video-placeholder">Video</div>}
              <strong>{item.title}</strong>
              <span>{item.media_type}</span>
              <div className="row-actions">
                <button type="button" onClick={() => edit(item)}>Edit</button>
                <button type="button" onClick={() => deleteRecord('class_media', item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export default function AdminDashboard({ data, addRecord, updateRecord, deleteRecord, sidebarOpen, setSidebarOpen }) {
  const [activePage, setActivePage] = useState('overview')
  const workspaceRef = useRef(null)
  const stats = [
    ['Branches', data.branches.length],
    ['Students', data.students.length],
    ['Staff', data.staff.length],
    ['Classes', data.classes.length],
    ['Programs', data.programs.length],
    ['Grades', data.grade_levels.length],
    ['University Programs', data.university_programs.length],
    ['Grade Exams', data.grade_exams.length],
    ['University Exams', data.university_exams.length],
    ['Results', data.academic_results.length],
    ['Fees', data.fees.length],
    ['Gallery Items', data.class_media.length],
  ]

  const optionSets = {
    branches: data.branches.map((branch) => ({ value: branch.id, label: branch.branch_name })),
    students: data.students.map((student) => ({ value: student.id, label: student.name })),
    staff: data.staff.map((staff) => ({ value: staff.id, label: staff.name })),
    courses: data.courses.map((course) => ({ value: course.id, label: course.course_name })),
    classes: data.classes.map((item) => ({ value: item.id, label: `${item.course_name || 'Class'} - ${item.day_of_week || ''}` })),
    fees: data.fees.map((fee) => ({ value: fee.id, label: `${fee.student_name || 'Student'} - ${fee.fee_type || 'fee'} - Rs. ${fee.total_amount || fee.amount || 0}` })),
    programs: data.programs.map((program) => ({ value: program.id, label: program.program_name })),
    grades: data.grade_levels.map((grade) => ({ value: grade.id, label: grade.grade_name })),
    universityPrograms: data.university_programs.map((program) => ({ value: program.id, label: `${program.program_name}${program.university_name ? ` - ${program.university_name}` : ''}` })),
    gradeExams: data.grade_exams.map((exam) => ({ value: exam.id, label: `${exam.grade_name || 'Grade exam'} - ${exam.exam_date || 'No date'}` })),
    universityExams: data.university_exams.map((exam) => ({ value: exam.id, label: `${exam.exam_name || 'University exam'} - ${exam.exam_date || 'No date'}` })),
    statuses: ['active', 'completed', 'dropped'].map((status) => ({ value: status, label: status })),
    resultStatuses: ['pass', 'fail'].map((status) => ({ value: status, label: status })),
    attendanceStatuses: ['present', 'absent'].map((status) => ({ value: status, label: status })),
    feeTypes: ['course', 'program', 'grade', 'university'].map((type) => ({ value: type, label: type })),
    feeStatuses: ['pending', 'partial', 'paid'].map((status) => ({ value: status, label: status })),
  }

  const adminPages = useMemo(() => [
    { id: 'overview', label: 'Overview', detail: 'Today summary' },
    { id: 'branches', label: 'Branches', detail: 'Locations' },
    { id: 'students', label: 'Students', detail: 'Student details' },
    { id: 'staff', label: 'Staff', detail: 'Faculty details' },
    { id: 'courses', label: 'Courses', detail: 'Course fees' },
    { id: 'classes', label: 'Classes', detail: 'Branch timetable' },
    { id: 'media', label: 'Gallery', detail: 'Website photos' },
    { id: 'programs', label: 'Programs', detail: 'Crayons, oil pastels' },
    { id: 'grades', label: 'Grade Levels', detail: 'Pre-grade and grades' },
    { id: 'university', label: 'University', detail: 'University programs' },
    { id: 'exams', label: 'Exams', detail: 'Grade and university' },
    { id: 'results', label: 'Results', detail: 'Marks and result' },
    { id: 'fees', label: 'Fees', detail: 'Advanced billing' },
    { id: 'payments', label: 'Payments', detail: 'Fee collections' },
    { id: 'attendance', label: 'Attendance', detail: 'Class attendance' },
    { id: 'enquiries', label: 'Enquiries', detail: 'Lead follow-up' },
  ], [])

  const activeMeta = adminPages.find((page) => page.id === activePage) || adminPages[0]

  function selectPage(pageId) {
    setActivePage(pageId)
    setSidebarOpen(false)
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  return (
    <DashboardFrame title="Admin Dashboard" role="Administrator" fullScreen>
      <div className={`admin-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close admin menu"
          onClick={() => setSidebarOpen(false)}
        ></button>
        <aside className="admin-sidebar" aria-label="Admin work areas">
          <div className="admin-sidebar-title">
            <strong>Admin Dashboard</strong>
          </div>
          <nav>
            {adminPages.map((page) => (
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
              <span className="eyebrow">Admin page</span>
              <h2>{activeMeta.label}</h2>
              <p>{activeMeta.detail} for KFA Music Academy operations.</p>
            </div>
          </div>

          {activePage === 'overview' && (
            <>
              <StatGrid stats={stats} />
              <div className="dashboard-grid">
                <DataSection compact title="Recent Student Academics" rows={data.student_academics.slice(0, 5)} columns={['student_name', 'program_name', 'grade_name', 'university_program_name', 'status']} />
                <DataSection compact title="Recent Results" rows={data.academic_results.slice(0, 5)} columns={['student_name', 'grade_name', 'exam_name', 'marks', 'result_status']} />
              </div>
            </>
          )}

          {activePage === 'branches' && (
            <ManagedSection
              type="branches"
              title="Add Branch"
              fields={[
                { name: 'branch_name', label: 'Branch Name' },
                { name: 'location', label: 'Location' },
                { name: 'phone', label: 'Phone' },
              ]}
              rows={data.branches}
              columns={['branch_name', 'location', 'phone']}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'students' && (
            <ManagedSection
              type="students"
              title="Add Student"
              fields={[
                { name: 'name', label: 'Student Name' },
                { name: 'dob', label: 'DOB', type: 'date' },
                { name: 'email', label: 'Email', type: 'email', required: false },
                { name: 'phone', label: 'Phone', required: false },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches },
                { name: 'admission_date', label: 'Admission Date', type: 'date' },
                { name: 'parent_name', label: 'Parent Name' },
                { name: 'program_id', label: 'Non-Exam Program', type: 'select', options: optionSets.programs, required: false },
                { name: 'grade_id', label: 'Grade Level', type: 'select', options: optionSets.grades, required: false },
                { name: 'university_program_id', label: 'University Program', type: 'select', options: optionSets.universityPrograms, required: false },
                { name: 'start_date', label: 'Academic Start Date', type: 'date', required: false },
                { name: 'status', label: 'Academic Status', type: 'select', options: optionSets.statuses, required: false },
              ]}
              rows={data.students}
              columns={['name', 'branch_name', 'dob', 'email', 'phone', 'admission_date', 'parent_name', 'program_name', 'grade_name', 'university_program_name', 'status']}
              filters={[{ name: 'branch_id', label: 'Branch', options: optionSets.branches }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'staff' && (
            <ManagedSection
              type="staff"
              title="Add Staff"
              fields={[
                { name: 'name', label: 'Staff Name' },
                { name: 'dob', label: 'DOB', type: 'date' },
                { name: 'email', label: 'Email', type: 'email', required: false },
                { name: 'phone', label: 'Phone', required: false },
                { name: 'specialization', label: 'Specialization' },
                { name: 'salary', label: 'Salary', type: 'number' },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches },
              ]}
              rows={data.staff}
              columns={['name', 'branch_name', 'specialization', 'salary', 'email', 'phone']}
              filters={[{ name: 'branch_id', label: 'Branch', options: optionSets.branches }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'courses' && (
            <ManagedSection
              type="courses"
              title="Add Course"
              fields={[
                { name: 'course_name', label: 'Course Name' },
                { name: 'fees', label: 'Fees', type: 'number' },
                { name: 'description', label: 'Description', type: 'textarea', required: false },
                { name: 'duration', label: 'Duration', required: false },
              ]}
              rows={data.courses}
              columns={['course_name', 'fees', 'duration']}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'classes' && (
            <ManagedSection
              type="classes"
              title="Add Class"
              fields={[
                { name: 'course_id', label: 'Course', type: 'select', options: optionSets.courses },
                { name: 'staff_id', label: 'Staff', type: 'select', options: optionSets.staff },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches },
                { name: 'day_of_week', label: 'Day of Week' },
                { name: 'start_time', label: 'Start Time', type: 'time' },
                { name: 'end_time', label: 'End Time', type: 'time' },
              ]}
              rows={data.classes}
              columns={['course_name', 'staff_name', 'branch_name', 'day_of_week', 'start_time', 'end_time']}
              filters={[
                { name: 'branch_id', label: 'Branch', options: optionSets.branches },
                { name: 'course_id', label: 'Course', options: optionSets.courses },
                { name: 'staff_id', label: 'Staff', options: optionSets.staff },
              ]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'media' && (
            <MediaManager data={data} optionSets={optionSets} addRecord={addRecord} updateRecord={updateRecord} deleteRecord={deleteRecord} />
          )}

          {activePage === 'programs' && (
            <ManagedSection
              type="programs"
              title="Add Non-Exam Program"
              fields={[
                { name: 'program_name', label: 'Program Name' },
                { name: 'description', label: 'Description', type: 'textarea', required: false },
                { name: 'duration', label: 'Duration' },
                { name: 'fees', label: 'Fees', type: 'number' },
              ]}
              rows={data.programs}
              columns={['program_name', 'description', 'duration', 'fees']}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'grades' && (
            <ManagedSection
              type="grade_levels"
              title="Add Grade Level"
              fields={[
                { name: 'grade_name', label: 'Grade Name' },
                { name: 'level_order', label: 'Order', type: 'number' },
                { name: 'description', label: 'Description', type: 'textarea', required: false },
              ]}
              rows={data.grade_levels}
              columns={['grade_name', 'level_order', 'description']}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'university' && (
            <ManagedSection
              type="university_programs"
              title="Add University Program"
              fields={[
                { name: 'program_name', label: 'Program Name' },
                { name: 'university_name', label: 'University Name' },
                { name: 'duration', label: 'Duration' },
                { name: 'fees', label: 'Fees', type: 'number' },
              ]}
              rows={data.university_programs}
              columns={['program_name', 'university_name', 'duration', 'fees']}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'exams' && (
            <div className="dashboard-grid">
              <ManagedSection
                type="grade_exams"
                title="Add Grade Exam"
                fields={[
                  { name: 'grade_id', label: 'Grade Level', type: 'select', options: optionSets.grades },
                  { name: 'exam_date', label: 'Exam Date', type: 'date' },
                ]}
                rows={data.grade_exams}
                columns={['grade_name', 'exam_date']}
                addRecord={addRecord}
                updateRecord={updateRecord}
                deleteRecord={deleteRecord}
              />
              <ManagedSection
                type="university_exams"
                title="Add University Exam"
                fields={[
                  { name: 'university_program_id', label: 'University Program', type: 'select', options: optionSets.universityPrograms },
                  { name: 'exam_name', label: 'Exam Name' },
                  { name: 'exam_date', label: 'Exam Date', type: 'date' },
                ]}
                rows={data.university_exams}
                columns={['university_program_name', 'exam_name', 'exam_date']}
                addRecord={addRecord}
                updateRecord={updateRecord}
                deleteRecord={deleteRecord}
              />
            </div>
          )}

          {activePage === 'results' && (
            <ManagedSection
              type="academic_results"
              title="Add Academic Result"
              fields={[
                { name: 'student_id', label: 'Student', type: 'select', options: optionSets.students },
                { name: 'grade_exam_id', label: 'Grade Exam', type: 'select', options: optionSets.gradeExams, required: false },
                { name: 'university_exam_id', label: 'University Exam', type: 'select', options: optionSets.universityExams, required: false },
                { name: 'marks', label: 'Marks', type: 'number' },
                { name: 'grade', label: 'Grade' },
                { name: 'result_status', label: 'Result Status', type: 'select', options: optionSets.resultStatuses },
              ]}
              rows={data.academic_results}
              columns={['student_name', 'grade_name', 'exam_name', 'university_program_name', 'marks', 'grade', 'result_status']}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'fees' && (
            <FeesView data={data} optionSets={optionSets} />
          )}

          {activePage === 'payments' && (
            <ManagedSection
              type="payments"
              title="Add Payment"
              fields={[
                { name: 'fee_id', label: 'Fee', type: 'select', options: optionSets.fees },
                { name: 'amount', label: 'Amount', type: 'number' },
                { name: 'payment_date', label: 'Payment Date', type: 'date' },
              ]}
              rows={data.payments}
              columns={['student_name', 'fee_type', 'amount', 'payment_date']}
              filters={[{ name: 'fee_id', label: 'Fee', options: optionSets.fees }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'attendance' && (
            <AttendanceView data={data} />
          )}

          {activePage === 'enquiries' && (
            <DataSection title="Enquiries" rows={data.enquiries} columns={['name', 'phone', 'email', 'course_interested', 'message']} />
          )}
        </section>
      </div>
    </DashboardFrame>
  )
}
