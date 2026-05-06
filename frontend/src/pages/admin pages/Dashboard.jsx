import { useMemo, useRef, useState } from 'react'
import DashboardFrame from '../../components/DashboardFrame'
import DataSection from '../../components/DataSection'
import StatGrid from '../../components/StatGrid'
import { API_ORIGIN, api } from '../../utils/api'
import { downloadReceipt, feeReceiptData, openReceipt, whatsappReceiptUrl } from '../../utils/receipts'
import { defaultSiteContent } from '../public/Landing'

function cleanRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value === '' ? null : value]))
}

function mediaSrc(url) {
  if (!url) return ''
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`
  if (url.startsWith('uploads/')) return `${API_ORIGIN}/${url}`
  if (url.startsWith('http://localhost:5000')) return url.replace('http://localhost:5000', API_ORIGIN)
  return url
}

function AdminForm({ title, fields, initialRecord, onSubmit, onCancel }) {
  const blank = useMemo(() => Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || ''])), [fields])
  const [form, setForm] = useState(initialRecord ? { ...blank, ...initialRecord } : blank)
  const [uploadingField, setUploadingField] = useState('')

  async function uploadFieldFile(field, file) {
    if (!file) return
    const token = localStorage.getItem('kfa_token') || localStorage.getItem('token')
    if (!token) {
      window.dispatchEvent(new CustomEvent('kfa:auth-expired'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setUploadingField(field.name)
    try {
      const uploaded = await api(field.uploadPath || '/uploads/materials', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        loadingMessage: 'Uploading image...',
      })
      setForm((current) => ({ ...current, [field.name]: uploaded.url }))
    } catch (error) {
      console.warn('[ADMIN] File upload failed', error)
    } finally {
      setUploadingField('')
    }
  }

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
          ) : field.type === 'file' ? (
            <>
              <input type="file" accept={field.accept || 'image/*'} required={field.required !== false && !form[field.name]} onChange={(event) => uploadFieldFile(field, event.target.files?.[0])} />
              {uploadingField === field.name && <small>Uploading...</small>}
              {form[field.name] && (
                <div className="upload-preview">
                  <img src={mediaSrc(form[field.name])} alt={`${field.label} preview`} />
                  <span>Photo ready</span>
                </div>
              )}
            </>
          ) : (
            <input type={field.type || 'text'} required={field.required !== false} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
          )}
        </label>
      ))}
      <button className="primary" disabled={Boolean(uploadingField)}>{uploadingField ? 'Uploading...' : initialRecord ? 'Update' : 'Save'}</button>
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
      {!!visibleRows.length && (
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
        </section>
      )}
    </>
  )
}

function AccessManager({ title, rows, roleLabel, updateRecord }) {
  async function setAccess(row, accountStatus) {
    await updateRecord(roleLabel === 'Student' ? 'students' : 'staff', row.id, {
      ...row,
      account_status: accountStatus,
    })
  }

  if (!rows.length) return null

  return (
    <section className="table-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{roleLabel}</th>
              <th>Phone</th>
              <th>Branch</th>
              <th>Login Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = row.account_status === 'active'
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.phone || '-'}</td>
                  <td>{row.branch_name || '-'}</td>
                  <td><span className={active ? 'access-pill active' : 'access-pill inactive'}>{active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className={active ? '' : 'primary'} onClick={() => setAccess(row, 'active')}>Activate</button>
                      <button type="button" onClick={() => setAccess(row, 'inactive')}>Inactivate</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StudentImportPanel({ importStudents, previewStudentImport }) {
  const [file, setFile] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [summary, setSummary] = useState(null)

  async function previewFile(event) {
    event.preventDefault()
    if (!file) return
    setPreviewing(true)
    setSummary(null)
    try {
      setPreview(await previewStudentImport(file))
    } finally {
      setPreviewing(false)
    }
  }

  async function confirmImport() {
    if (!file || !preview?.valid) return
    setImporting(true)
    try {
      const result = await importStudents(file)
      setSummary(result)
      setPreview(null)
      setFile(null)
    } finally {
      setImporting(false)
    }
  }

  return (
    <form className="panel student-import-panel" onSubmit={previewFile}>
      <div>
        <span className="eyebrow">Bulk Import</span>
        <h3>Add Students From Excel</h3>
        <p className="hint">Use columns like name, dob, phone, email, parent_name, branch_name, admission_date, account_status.</p>
      </div>
      <label className="field-control">
        <span>Excel / CSV File</span>
        <input name="studentFile" type="file" accept=".xlsx,.xls,.csv" required value="" onChange={(event) => {
          setFile(event.target.files?.[0] || null)
          setPreview(null)
          setSummary(null)
        }} />
      </label>
      <button className="primary" disabled={previewing || !file}>{previewing ? 'Reading...' : 'Preview File'}</button>
      {summary && (
        <div className="import-summary">
          <strong>{summary.created} added</strong>
          <span>{summary.skipped} skipped from {summary.total} rows</span>
          {!!summary.errors?.length && <small>{summary.errors.slice(0, 3).map((item) => `Row ${item.row}: ${item.reason}`).join(' | ')}</small>}
        </div>
      )}
      {preview && (
        <div className="import-preview">
          <div className="import-summary">
            <strong>{preview.valid} ready</strong>
            <span>{preview.invalid} need checking from {preview.total} rows</span>
            <button type="button" className="primary" onClick={confirmImport} disabled={importing || !preview.valid}>{importing ? 'Importing...' : `Import ${preview.valid} Students`}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['row', 'status', 'reason', 'name', 'dob', 'phone', 'parent_name', 'branch_name', 'admission_date', 'account_status'].map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 25).map((row) => (
                  <tr key={row.row} className={row.status === 'ready' ? 'preview-ready' : 'preview-warning'}>
                    {['row', 'status', 'reason', 'name', 'dob', 'phone', 'parent_name', 'branch_name', 'admission_date', 'account_status'].map((column) => <td key={column}>{String(row[column] || '-')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 25 && <p className="hint">Showing first 25 rows only. All ready rows will be imported.</p>}
        </div>
      )}
    </form>
  )
}

const siteContentGroups = [
  {
    title: 'Theme Studio',
    hint: 'Change the public homepage colors, spacing, and size rhythm.',
    fields: [
      ['sitePrimaryColor', 'Primary Color', 'color'], ['siteSecondaryColor', 'Secondary Color', 'color'],
      ['siteDarkColor', 'Dark Text / Panels', 'color'], ['siteLightColor', 'Page Background', 'color'],
      ['siteSurfaceColor', 'Card Surface', 'color'], ['heroTitleSize', 'Hero Title Size'],
      ['sectionSpacing', 'Section Spacing'], ['cardRadius', 'Card Radius'], ['animationStrength', 'Animation Strength'],
    ],
  },
  {
    title: 'Hero',
    hint: 'Top section text, buttons, and trust badges.',
    fields: [
      ['heroEyebrow', 'Hero Eyebrow'], ['heroTitle', 'Hero Title'], ['heroText', 'Hero Text', 'textarea'],
      ['heroPrimaryButton', 'Hero Primary Button'], ['heroSecondaryButton', 'Hero Secondary Button'],
      ['trustOne', 'Trust Item 1'], ['trustTwo', 'Trust Item 2'], ['trustThree', 'Trust Item 3'],
      ['heroStatNumber', 'Hero Stat Number'], ['heroStatLabel', 'Hero Stat Label'],
    ],
  },
  {
    title: 'About And Highlights',
    hint: 'Intro copy and the four dark highlight cards.',
    fields: [
      ['aboutLabel', 'About Label'], ['aboutTitle', 'About Title'], ['aboutText', 'About Text', 'textarea'],
      ['highlightOneTitle', 'Highlight 1 Title'], ['highlightOneText', 'Highlight 1 Text'],
      ['highlightTwoTitle', 'Highlight 2 Title'], ['highlightTwoText', 'Highlight 2 Text'],
      ['highlightThreeTitle', 'Highlight 3 Title'], ['highlightThreeText', 'Highlight 3 Text'],
      ['highlightFourTitle', 'Highlight 4 Title'], ['highlightFourText', 'Highlight 4 Text'],
    ],
  },
  {
    title: 'Section Headings And Timings',
    hint: 'Labels, titles, and public batch timing cards.',
    fields: [
      ['coursesLabel', 'Courses Label'], ['coursesTitle', 'Courses Title'],
      ['branchCoursesLabel', 'Branch Courses Label'], ['branchCoursesTitle', 'Branch Courses Title'],
      ['timingLabel', 'Timing Label'], ['timingTitle', 'Timing Title'],
      ['weekdayTitle', 'Weekday Title'], ['weekdaySubtitle', 'Weekday Subtitle'], ['weekdayTime', 'Weekday Time'],
      ['weekendTitle', 'Weekend Title'], ['weekendSubtitle', 'Weekend Subtitle'], ['weekendTime', 'Weekend Time'],
      ['galleryLabel', 'Gallery Label'], ['galleryTitle', 'Gallery Title'],
      ['facultyLabel', 'Faculty Label'], ['facultyTitle', 'Faculty Title'],
      ['branchesLabel', 'Branches Label'], ['branchesTitle', 'Branches Title'],
    ],
  },
  {
    title: 'Testimonials And Events',
    hint: 'Homepage social proof and event highlight cards.',
    fields: [
      ['testimonialsLabel', 'Testimonials Label'], ['testimonialsTitle', 'Testimonials Title'],
      ['testimonialOneQuote', 'Testimonial 1 Quote', 'textarea'], ['testimonialOneName', 'Testimonial 1 Name'],
      ['testimonialTwoQuote', 'Testimonial 2 Quote', 'textarea'], ['testimonialTwoName', 'Testimonial 2 Name'],
      ['testimonialThreeQuote', 'Testimonial 3 Quote', 'textarea'], ['testimonialThreeName', 'Testimonial 3 Name'],
      ['eventsLabel', 'Events Label'], ['eventsTitle', 'Events Title'],
      ['eventOneTitle', 'Event 1 Title'], ['eventOneText', 'Event 1 Text', 'textarea'],
      ['eventTwoTitle', 'Event 2 Title'], ['eventTwoText', 'Event 2 Text', 'textarea'],
      ['eventThreeTitle', 'Event 3 Title'], ['eventThreeText', 'Event 3 Text', 'textarea'],
    ],
  },
  {
    title: 'CTA And Contact',
    hint: 'Admission banner, footer contact strip, and WhatsApp button.',
    fields: [
      ['admissionEyebrow', 'Admission Eyebrow'], ['admissionTitle', 'Admission Title'], ['admissionButton', 'Admission Button'],
      ['contactPhoneDisplay', 'Contact Phone Display'], ['contactWhatsappNumber', 'WhatsApp Number'],
      ['contactEmail', 'Contact Email'], ['contactHours', 'Contact Hours'], ['whatsappMessage', 'WhatsApp Message', 'textarea'],
    ],
  },
]

function SiteContentManager({ siteContent, updateSiteContent }) {
  const savedContent = typeof siteContent === 'string' ? JSON.parse(siteContent || '{}') : siteContent || {}
  const [form, setForm] = useState({ ...defaultSiteContent, ...savedContent })

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form className="panel form-grid site-content-form" onSubmit={(event) => {
      event.preventDefault()
      updateSiteContent(cleanRecord(form))
    }}>
      <div className="site-content-hero">
        <div>
          <span className="eyebrow">Design Studio</span>
          <h3>Website Site Content</h3>
          <p>Control public homepage text, colors, spacing, card radius, contact details, and section titles from one place.</p>
        </div>
        <button type="button" onClick={() => setForm(defaultSiteContent)}>Reset Defaults</button>
      </div>
      <div className="site-content-preview" style={{
        '--preview-primary': form.sitePrimaryColor,
        '--preview-secondary': form.siteSecondaryColor,
        '--preview-dark': form.siteDarkColor,
        '--preview-light': form.siteLightColor,
        '--preview-radius': form.cardRadius,
      }}>
        <div>
          <span>{form.heroEyebrow}</span>
          <strong>{form.heroTitle}</strong>
          <small>{form.heroPrimaryButton}</small>
        </div>
      </div>
      <p className="empty">Courses, branches, classes, gallery, staff, and student records are managed from their own admin pages. This panel controls the remaining website copy and theme.</p>
      {siteContentGroups.map((group) => (
        <section className="site-content-group" key={group.title}>
          <div className="site-content-group-head">
            <div>
              <h4>{group.title}</h4>
              <p>{group.hint}</p>
            </div>
          </div>
          <div className="site-content-grid">
            {group.fields.map(([name, label, type]) => (
              <label className={`field-control${type === 'color' ? ' color-control' : ''}`} key={name}>
                <span>{label}</span>
                {type === 'textarea' ? (
                  <textarea value={form[name] || ''} onChange={(event) => updateField(name, event.target.value)} />
                ) : (
                  <input type={type || 'text'} value={form[name] || ''} onChange={(event) => updateField(name, event.target.value)} />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
      <button className="primary">Save Website Content</button>
    </form>
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
        <DataSection compact title="Selected Date" rows={rows} columns={['student_name', 'course_name', 'branch_name', 'date', 'day_of_week', 'attendance_time', 'status']} />
        <DataSection compact title="Previous Attendance" rows={previousRows} columns={['student_name', 'course_name', 'branch_name', 'date', 'day_of_week', 'attendance_time', 'status']} />
      </section>
    </>
  )
}

function FeesView({ data, optionSets, addRecord, updateRecord, deleteRecord }) {
  const filters = { branch_id: '', student_id: '', status: '', fee_type: '' }
  const rows = data.fees.filter((fee) => Object.entries(filters).every(([key, value]) => !value || String(fee[key] ?? '') === String(value)))
  const paidCount = rows.filter((fee) => fee.status === 'paid').length
  const unpaidCount = rows.filter((fee) => fee.status !== 'paid').length
  const receiptRows = rows
    .filter((fee) => Number(fee.paid_amount || 0) > 0 || fee.status === 'paid' || data.payments?.some((payment) => Number(payment.fee_id) === Number(fee.id)))
    .map((fee) => {
      const student = data.students.find((item) => Number(item.id) === Number(fee.student_id))
      const payment = data.payments?.find((item) => Number(item.fee_id) === Number(fee.id))
      return feeReceiptData({ fee, student, payment })
    })

  return (
    <>
      <ManagedSection
        type="fees"
        title="Add Fee"
        fields={[
          { name: 'student_id', label: 'Student', type: 'select', options: optionSets.students },
          { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches, required: false },
          { name: 'fee_type', label: 'Fee Type', type: 'select', options: optionSets.feeTypes },
          { name: 'course_id', label: 'Course', type: 'select', options: optionSets.courses, required: false },
          { name: 'program_id', label: 'Program', type: 'select', options: optionSets.programs, required: false },
          { name: 'grade_id', label: 'Grade', type: 'select', options: optionSets.grades, required: false },
          { name: 'university_program_id', label: 'University Program', type: 'select', options: optionSets.universityPrograms, required: false },
          { name: 'total_amount', label: 'Total Amount', type: 'number' },
          { name: 'paid_amount', label: 'Paid Amount', type: 'number', required: false },
          { name: 'due_amount', label: 'Due Amount', type: 'number', required: false },
          { name: 'fee_frequency', label: 'Frequency', type: 'select', options: optionSets.feeFrequencies, required: false },
          { name: 'billing_day', label: 'Monthly Fee Show Day', type: 'number', required: false },
          { name: 'due_day', label: 'Monthly Due Day', type: 'number', required: false },
          { name: 'status', label: 'Status', type: 'select', options: optionSets.feeStatuses, required: false },
        ]}
        rows={data.fees}
        columns={['student_name', 'branch_name', 'fee_type', 'total_amount', 'paid_amount', 'due_amount', 'fee_frequency', 'billing_day', 'due_day', 'status']}
        filters={[
          { name: 'branch_id', label: 'Branch', options: optionSets.branches },
          { name: 'student_id', label: 'Student', options: optionSets.students },
          { name: 'fee_type', label: 'Fee Type', options: optionSets.feeTypes },
          { name: 'status', label: 'Status', options: optionSets.feeStatuses },
        ]}
        addRecord={addRecord}
        updateRecord={updateRecord}
        deleteRecord={deleteRecord}
      />
      <section className="table-section">
        <div className="fee-summary">
          <article><strong>{paidCount}</strong><span>Paid</span></article>
          <article><strong>{unpaidCount}</strong><span>Not Paid / Partial</span></article>
        </div>
        <DataSection compact title="Student Fee Details" rows={rows} columns={['student_name', 'branch_name', 'fee_type', 'course_name', 'program_name', 'grade_name', 'university_program_name', 'total_amount', 'paid_amount', 'due_amount', 'fee_frequency', 'billing_day', 'due_day', 'status']} />
        {!!receiptRows.length && (
          <div className="receipt-admin-panel">
            <h3>Receipt Actions</h3>
            <div className="receipt-grid">
              {receiptRows.map((receipt) => (
                <article className="receipt-card" key={receipt.receiptNo}>
                  <span>{receipt.studentName}</span>
                  <strong>{receipt.receiptNo}</strong>
                  <p>{receipt.item} - Paid Rs. {Number(receipt.paidAmount || 0).toLocaleString('en-IN')}</p>
                  <div className="row-actions">
                    <button type="button" onClick={() => openReceipt(receipt)}>View</button>
                    <button type="button" onClick={() => downloadReceipt(receipt)}>Download</button>
                    <a className="button-link" href={whatsappReceiptUrl(receipt)} target="_blank" rel="noreferrer">WhatsApp</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function PaymentsView({ data, optionSets, addRecord, updateRecord, deleteRecord }) {
  const paymentReceipts = (data.payments || []).map((payment) => {
    const fee = data.fees.find((item) => Number(item.id) === Number(payment.fee_id))
    const student = data.students.find((item) => Number(item.id) === Number(fee?.student_id))
    return feeReceiptData({ fee, student, payment })
  })

  return (
    <>
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
      {!!paymentReceipts.length && (
        <section className="table-section">
          <h3>Payment Receipts</h3>
          <div className="receipt-grid">
            {paymentReceipts.map((receipt) => (
              <article className="receipt-card" key={receipt.receiptNo}>
                <span>{receipt.studentName}</span>
                <strong>{receipt.receiptNo}</strong>
                <p>{receipt.item} - Paid Rs. {Number(receipt.paidAmount || 0).toLocaleString('en-IN')}</p>
                <div className="row-actions">
                  <button type="button" onClick={() => openReceipt(receipt)}>View</button>
                  <button type="button" onClick={() => downloadReceipt(receipt)}>Download</button>
                  <a className="button-link" href={whatsappReceiptUrl(receipt)} target="_blank" rel="noreferrer">WhatsApp</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function EventProgramReport({ data, optionSets }) {
  const [filters, setFilters] = useState({ event_program_id: '', branch_id: '', class_id: '', grade_id: '', status: '' })
  const rows = (data.event_program_charges || []).filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row[key] ?? '') === String(value)))
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const paid = rows.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0)
  const due = rows.reduce((sum, row) => sum + Number(row.due_amount || 0), 0)

  return (
    <section className="table-section">
      <div className="fee-summary">
        <article><strong>Rs. {total.toLocaleString('en-IN')}</strong><span>Total Charges</span></article>
        <article><strong>Rs. {paid.toLocaleString('en-IN')}</strong><span>Paid</span></article>
        <article><strong>Rs. {due.toLocaleString('en-IN')}</strong><span>Due</span></article>
      </div>
      <div className="filter-bar">
        {[
          { name: 'event_program_id', label: 'Program', options: optionSets.eventPrograms },
          { name: 'branch_id', label: 'Branch', options: optionSets.branches },
          { name: 'class_id', label: 'Class', options: optionSets.classes },
          { name: 'grade_id', label: 'Grade', options: optionSets.grades },
          { name: 'status', label: 'Payment Status', options: optionSets.feeStatuses },
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
      <DataSection
        title="Program Fee / Charge Report"
        rows={rows}
        columns={['program_name', 'student_name', 'branch_name', 'course_name', 'grade_name', 'team_name', 'charge_type', 'amount', 'paid_amount', 'due_amount', 'status', 'notes']}
      />
    </section>
  )
}

function escapeHtml(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function openPrintableReport({ title, subtitle, meta = [], sections = [] }) {
  const sectionHtml = sections.map((section) => `
    <section>
      <h2>${escapeHtml(section.title)}</h2>
      ${section.rows.length ? `
        <table>
          <thead><tr>${section.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
          <tbody>
            ${section.rows.map((row, index) => `
              <tr>${section.columns.map((column) => `<td>${escapeHtml(column.render ? column.render(row, index) : row[column.key])}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p class="empty">No records available for this selection.</p>'}
    </section>
  `).join('')

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f0ea; color: #171141; font-family: Arial, sans-serif; }
      .actions { position: sticky; top: 0; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #171141; }
      button { border: 0; border-radius: 6px; background: #ed0012; color: #fff; padding: 10px 14px; font-weight: 800; cursor: pointer; }
      main { width: min(1120px, calc(100% - 32px)); margin: 22px auto; background: #fff; border: 1px solid #ded8ec; border-radius: 10px; overflow: hidden; }
      header { display: flex; align-items: center; gap: 16px; padding: 18px 22px; background: linear-gradient(135deg, #171141, #2f2482); color: #fff; }
      header img { width: 72px; height: 72px; object-fit: contain; background: #fff; border-radius: 50%; padding: 6px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 24px; }
      header p { margin-top: 5px; color: #ffced2; font-weight: 700; }
      .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; padding: 16px 22px; background: #f8f5ef; border-bottom: 1px solid #ded8ec; }
      .meta div { display: grid; gap: 4px; padding: 10px; border: 1px solid #e3ddeb; border-radius: 8px; background: #fff; }
      .meta span { color: #625b74; font-size: 11px; font-weight: 900; text-transform: uppercase; }
      .meta strong { font-size: 14px; }
      section { padding: 18px 22px; }
      section + section { border-top: 1px solid #ece7f3; }
      h2 { margin-bottom: 12px; color: #2f2482; font-size: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #171141; color: #fff; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: .02em; }
      th, td { border: 1px solid #ded8ec; padding: 8px; vertical-align: top; }
      tbody tr:nth-child(even) { background: #faf8f4; }
      .empty { color: #625b74; font-weight: 700; }
      footer { padding: 12px 22px 18px; color: #625b74; font-size: 11px; text-align: center; }
      @media print {
        body { background: #fff; }
        .actions { display: none; }
        main { width: 100%; margin: 0; border: 0; border-radius: 0; }
        section { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
    <main>
      <header>
        <img src="/kfa-logo.png" alt="KFA logo">
        <div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
      </header>
      <div class="meta">
        ${meta.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
        <div><span>Generated</span><strong>${escapeHtml(new Date().toLocaleString('en-IN'))}</strong></div>
      </div>
      ${sectionHtml}
      <footer>KFA Music Academy | Computer-generated report</footer>
    </main>
  </body>
  </html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

function PrintReportsView({ data, optionSets }) {
  const [gradeExamId, setGradeExamId] = useState(data.grade_exams[0]?.id || '')
  const [classId, setClassId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [eventProgramId, setEventProgramId] = useState((data.event_programs || [])[0]?.id || '')
  const selectedExam = data.grade_exams.find((exam) => String(exam.id) === String(gradeExamId))
  const selectedClass = data.classes.find((item) => String(item.id) === String(classId))
  const selectedBranch = data.branches.find((item) => String(item.id) === String(branchId))
  const selectedProgram = (data.event_programs || []).find((item) => String(item.id) === String(eventProgramId))

  const gradeRows = (data.student_academics || [])
    .filter((row) => !selectedExam || Number(row.grade_id) === Number(selectedExam.grade_id))
    .filter((row) => !branchId || Number(row.branch_id) === Number(branchId))
    .filter((row) => {
      if (!selectedClass) return true
      return (data.enrollments || []).some((enrollment) => Number(enrollment.student_id) === Number(row.student_id) && Number(enrollment.course_id) === Number(selectedClass.course_id))
    })
    .map((row) => {
      const student = data.students.find((item) => Number(item.id) === Number(row.student_id))
      const result = (data.academic_results || []).find((item) => Number(item.student_id) === Number(row.student_id) && Number(item.grade_exam_id) === Number(gradeExamId))
      return { ...row, student_name: student?.name || row.student_name, phone: student?.phone, parent_name: student?.parent_name, marks: result?.marks, result_grade: result?.grade, result_status: result?.result_status }
    })

  function printGradeExam() {
    openPrintableReport({
      title: 'Grade Exam Student List',
      subtitle: 'Students allocated for selected grade exam',
      meta: [
        { label: 'Grade', value: selectedExam?.grade_name || 'All grade exams' },
        { label: 'Exam Date', value: selectedExam?.exam_date || '-' },
        { label: 'Class', value: selectedClass ? `${selectedClass.course_name} | ${selectedClass.day_of_week}` : 'All classes' },
        { label: 'Branch', value: selectedBranch?.branch_name || 'All branches' },
        { label: 'Total Students', value: gradeRows.length },
      ],
      sections: [{
        title: 'Student List',
        rows: gradeRows,
        columns: [
          { label: 'S.No', render: (_row, index) => index + 1 },
          { label: 'Student Name', key: 'student_name' },
          { label: 'Parent', key: 'parent_name' },
          { label: 'Phone', key: 'phone' },
          { label: 'Branch', key: 'branch_name' },
          { label: 'Program', key: 'program_name' },
          { label: 'Grade', key: 'grade_name' },
          { label: 'Marks', key: 'marks' },
          { label: 'Result Grade', key: 'result_grade' },
          { label: 'Status', key: 'result_status' },
        ],
      }],
    })
  }

  function printProgramDetails() {
    const participants = (data.event_program_participants || []).filter((row) => Number(row.event_program_id) === Number(eventProgramId))
    const items = (data.event_program_items || []).filter((row) => Number(row.event_program_id) === Number(eventProgramId))
    const teams = (data.event_program_teams || []).filter((row) => Number(row.event_program_id) === Number(eventProgramId))
    const charges = (data.event_program_charges || []).filter((row) => Number(row.event_program_id) === Number(eventProgramId))
    openPrintableReport({
      title: 'Program Details Report',
      subtitle: selectedProgram?.program_name || 'Selected event program',
      meta: [
        { label: 'Program', value: selectedProgram?.program_name || '-' },
        { label: 'Date', value: selectedProgram?.event_date || '-' },
        { label: 'Time', value: selectedProgram?.event_time || '-' },
        { label: 'Venue', value: selectedProgram?.venue || '-' },
        { label: 'Branch', value: selectedProgram?.branch_name || '-' },
        { label: 'Status', value: selectedProgram?.status || '-' },
      ],
      sections: [
        {
          title: 'Program Items / Songs',
          rows: items,
          columns: [{ label: 'Order', key: 'display_order' }, { label: 'Category', key: 'category' }, { label: 'Item / Song', key: 'item_title' }, { label: 'Notes', key: 'item_notes' }],
        },
        {
          title: 'Teams',
          rows: teams,
          columns: [{ label: 'Team', key: 'team_name' }, { label: 'Staff Incharge', key: 'staff_name' }, { label: 'Notes', key: 'team_notes' }],
        },
        {
          title: 'Participants',
          rows: participants,
          columns: [{ label: 'S.No', render: (_row, index) => index + 1 }, { label: 'Student', key: 'student_name' }, { label: 'Team', key: 'team_name' }, { label: 'Class', key: 'course_name' }, { label: 'Branch', key: 'branch_name' }, { label: 'Grade', key: 'grade_name' }, { label: 'Role', key: 'role_name' }, { label: 'Status', key: 'participation_status' }],
        },
        {
          title: 'Charges',
          rows: charges,
          columns: [{ label: 'Student', key: 'student_name' }, { label: 'Charge Type', key: 'charge_type' }, { label: 'Amount', key: 'amount' }, { label: 'Paid', key: 'paid_amount' }, { label: 'Due', key: 'due_amount' }, { label: 'Status', key: 'status' }, { label: 'Notes', key: 'notes' }],
        },
      ],
    })
  }

  return (
    <div className="dashboard-grid">
      <section className="panel form-grid">
        <h3>Grade Exam Print / PDF</h3>
        <label className="field-control">
          <span>Grade Exam</span>
          <select value={gradeExamId} onChange={(event) => setGradeExamId(event.target.value)}>
            <option value="">All Grade Exams</option>
            {optionSets.gradeExams.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="field-control">
          <span>Class</span>
          <select value={classId} onChange={(event) => setClassId(event.target.value)}>
            <option value="">All Classes</option>
            {optionSets.classes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="field-control">
          <span>Branch</span>
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">All Branches</option>
            {optionSets.branches.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" className="primary" onClick={printGradeExam}>Print / Save PDF</button>
        <p className="hint">{gradeRows.length} students found for this selection.</p>
      </section>
      <section className="panel form-grid">
        <h3>Program Details Print / PDF</h3>
        <label className="field-control">
          <span>Program</span>
          <select value={eventProgramId} onChange={(event) => setEventProgramId(event.target.value)}>
            <option value="">Select Program</option>
            {optionSets.eventPrograms.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" className="primary" onClick={printProgramDetails} disabled={!eventProgramId}>Print / Save PDF</button>
        <p className="hint">Includes program info, items, teams, participants, and charges.</p>
      </section>
      <DataSection compact title="Grade Exam Preview" rows={gradeRows} columns={['student_name', 'parent_name', 'phone', 'branch_name', 'program_name', 'grade_name', 'marks', 'result_grade', 'result_status']} />
    </div>
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

export default function AdminDashboard({ data, addRecord, updateRecord, deleteRecord, updateSiteContent, importStudents, previewStudentImport, sidebarOpen, setSidebarOpen }) {
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
    ['Event Programs', (data.event_programs || []).length],
    ['Program Charges', (data.event_program_charges || []).length],
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
    eventPrograms: (data.event_programs || []).map((program) => ({ value: program.id, label: program.program_name })),
    eventTeams: (data.event_program_teams || []).map((team) => ({ value: team.id, label: `${team.team_name}${team.program_name ? ` - ${team.program_name}` : ''}` })),
    eventParticipants: (data.event_program_participants || []).map((item) => ({ value: item.id, label: `${item.student_name || 'Student'} - ${item.program_name || 'Program'}` })),
    statuses: ['active', 'completed', 'dropped'].map((status) => ({ value: status, label: status })),
    eventStatuses: ['planning', 'confirmed', 'completed', 'cancelled'].map((status) => ({ value: status, label: status })),
    participationStatuses: ['selected', 'confirmed', 'practice', 'completed', 'dropped'].map((status) => ({ value: status, label: status })),
    resultStatuses: ['pass', 'fail'].map((status) => ({ value: status, label: status })),
    attendanceStatuses: ['present', 'absent'].map((status) => ({ value: status, label: status })),
    feeTypes: ['course', 'program', 'grade', 'university', 'monthly'].map((type) => ({ value: type, label: type })),
    feeFrequencies: ['monthly', 'one-time'].map((type) => ({ value: type, label: type })),
    chargeTypes: ['program fee', 'vehicle charge', 'costume charge', 'food charge', 'specific charge', 'other'].map((type) => ({ value: type, label: type })),
    feeStatuses: ['pending', 'partial', 'paid'].map((status) => ({ value: status, label: status })),
    studentAccountStatuses: ['pending', 'active', 'inactive'].map((status) => ({ value: status, label: status })),
    notificationRoles: ['all', 'admin', 'staff', 'student'].map((role) => ({ value: role, label: role })),
  }

  const adminPages = useMemo(() => [
    { id: 'overview', label: 'Overview', detail: 'Today summary' },
    { id: 'site-content', label: 'Site Content', detail: 'Homepage text' },
    { id: 'branches', label: 'Branches', detail: 'Locations' },
    { id: 'students', label: 'Students', detail: 'Student details' },
    { id: 'manage-students', label: 'Manage Students', detail: 'Activate login' },
    { id: 'staff', label: 'Staff', detail: 'Faculty details' },
    { id: 'manage-staff', label: 'Manage Staff', detail: 'Staff login access' },
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
    { id: 'event-programs', label: 'Event Programs', detail: 'Sudden programs' },
    { id: 'event-items', label: 'Program Items', detail: 'Songs and lists' },
    { id: 'event-teams', label: 'Program Teams', detail: 'Team planning' },
    { id: 'event-participants', label: 'Participants', detail: 'Student teams' },
    { id: 'event-charges', label: 'Program Charges', detail: 'Fees and vehicle' },
    { id: 'event-reports', label: 'Program Reports', detail: 'Filtered dues' },
    { id: 'print-reports', label: 'Print Reports', detail: 'Exam and program PDF' },
    { id: 'attendance', label: 'Attendance', detail: 'Class attendance' },
    { id: 'notifications', label: 'Notifications', detail: 'Messages' },
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
        <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Admin work areas">
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

          {activePage === 'site-content' && (
            <SiteContentManager siteContent={data.site_content} updateSiteContent={updateSiteContent} />
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
            <>
              <StudentImportPanel importStudents={importStudents} previewStudentImport={previewStudentImport} />
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
                  { name: 'photo_url', label: 'Student Photo', type: 'file', uploadPath: '/uploads/student-photos', required: false },
                  { name: 'account_status', label: 'Login Access', type: 'select', options: optionSets.studentAccountStatuses, required: false },
                  { name: 'program_id', label: 'Non-Exam Program', type: 'select', options: optionSets.programs, required: false },
                  { name: 'grade_id', label: 'Grade Level', type: 'select', options: optionSets.grades, required: false },
                  { name: 'university_program_id', label: 'University Program', type: 'select', options: optionSets.universityPrograms, required: false },
                  { name: 'start_date', label: 'Academic Start Date', type: 'date', required: false },
                  { name: 'status', label: 'Academic Status', type: 'select', options: optionSets.statuses, required: false },
                ]}
                rows={data.students}
                columns={['name', 'branch_name', 'dob', 'email', 'phone', 'account_status', 'admission_date', 'parent_name', 'photo_url', 'program_name', 'grade_name', 'university_program_name', 'status']}
                filters={[{ name: 'branch_id', label: 'Branch', options: optionSets.branches }, { name: 'account_status', label: 'Login Access', options: optionSets.studentAccountStatuses }]}
                addRecord={addRecord}
                updateRecord={updateRecord}
                deleteRecord={deleteRecord}
              />
            </>
          )}

          {activePage === 'manage-students' && (
            <AccessManager
              title="Manage Student Login Access"
              rows={data.students}
              roleLabel="Student"
              updateRecord={updateRecord}
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
                { name: 'bio', label: 'Degree / Studies / Staff Details', type: 'textarea', required: false },
                { name: 'salary', label: 'Salary', type: 'number' },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches },
                { name: 'photo_url', label: 'Teacher Photo', type: 'file', uploadPath: '/uploads/staff-photos', required: false },
                { name: 'account_status', label: 'Login Access', type: 'select', options: optionSets.studentAccountStatuses, required: false },
              ]}
              rows={data.staff}
              columns={['name', 'branch_name', 'specialization', 'bio', 'salary', 'email', 'phone', 'account_status', 'photo_url']}
              filters={[{ name: 'branch_id', label: 'Branch', options: optionSets.branches }, { name: 'account_status', label: 'Login Access', options: optionSets.studentAccountStatuses }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'manage-staff' && (
            <AccessManager
              title="Manage Staff Login Access"
              rows={data.staff}
              roleLabel="Staff"
              updateRecord={updateRecord}
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
            <FeesView data={data} optionSets={optionSets} addRecord={addRecord} updateRecord={updateRecord} deleteRecord={deleteRecord} />
          )}

          {activePage === 'payments' && (
            <PaymentsView
              data={data}
              optionSets={optionSets}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'event-programs' && (
            <ManagedSection
              type="event_programs"
              title="Add Event Program"
              fields={[
                { name: 'program_name', label: 'Program Name' },
                { name: 'event_date', label: 'Event Date', type: 'date', required: false },
                { name: 'event_time', label: 'Event Time', required: false },
                { name: 'venue', label: 'Venue', required: false },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches, required: false },
                { name: 'description', label: 'Discussion / Description', type: 'textarea', required: false },
                { name: 'status', label: 'Status', type: 'select', options: optionSets.eventStatuses, required: false },
                { name: 'base_fee', label: 'Program Fee', type: 'number', required: false },
                { name: 'vehicle_charge', label: 'Vehicle Charge', type: 'number', required: false },
                { name: 'extra_charge', label: 'Specific / Extra Charge', type: 'number', required: false },
                { name: 'charge_notes', label: 'Charge Notes', type: 'textarea', required: false },
              ]}
              rows={data.event_programs || []}
              columns={['program_name', 'event_date', 'event_time', 'venue', 'branch_name', 'status', 'base_fee', 'vehicle_charge', 'extra_charge']}
              filters={[{ name: 'branch_id', label: 'Branch', options: optionSets.branches }, { name: 'status', label: 'Status', options: optionSets.eventStatuses }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'event-items' && (
            <ManagedSection
              type="event_program_items"
              title="Add Program Item / Song"
              fields={[
                { name: 'event_program_id', label: 'Program', type: 'select', options: optionSets.eventPrograms },
                { name: 'category', label: 'Category', required: false },
                { name: 'item_title', label: 'Song / Item Title' },
                { name: 'item_notes', label: 'Notes / Lyrics / List', type: 'textarea', required: false },
                { name: 'display_order', label: 'Order', type: 'number', required: false },
              ]}
              rows={data.event_program_items || []}
              columns={['program_name', 'category', 'item_title', 'item_notes', 'display_order']}
              filters={[{ name: 'event_program_id', label: 'Program', options: optionSets.eventPrograms }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'event-teams' && (
            <ManagedSection
              type="event_program_teams"
              title="Add Program Team"
              fields={[
                { name: 'event_program_id', label: 'Program', type: 'select', options: optionSets.eventPrograms },
                { name: 'team_name', label: 'Team Name' },
                { name: 'staff_id', label: 'Staff Incharge', type: 'select', options: optionSets.staff, required: false },
                { name: 'team_notes', label: 'Team Notes', type: 'textarea', required: false },
              ]}
              rows={data.event_program_teams || []}
              columns={['program_name', 'team_name', 'staff_name', 'team_notes']}
              filters={[{ name: 'event_program_id', label: 'Program', options: optionSets.eventPrograms }, { name: 'staff_id', label: 'Staff', options: optionSets.staff }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'event-participants' && (
            <ManagedSection
              type="event_program_participants"
              title="Add Program Participant"
              fields={[
                { name: 'event_program_id', label: 'Program', type: 'select', options: optionSets.eventPrograms },
                { name: 'student_id', label: 'Student', type: 'select', options: optionSets.students },
                { name: 'team_id', label: 'Team', type: 'select', options: optionSets.eventTeams, required: false },
                { name: 'class_id', label: 'Class', type: 'select', options: optionSets.classes, required: false },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches, required: false },
                { name: 'grade_id', label: 'Grade', type: 'select', options: optionSets.grades, required: false },
                { name: 'role_name', label: 'Role / Part', required: false },
                { name: 'participation_status', label: 'Status', type: 'select', options: optionSets.participationStatuses, required: false },
                { name: 'notes', label: 'Notes', type: 'textarea', required: false },
              ]}
              rows={data.event_program_participants || []}
              columns={['program_name', 'student_name', 'team_name', 'course_name', 'branch_name', 'grade_name', 'role_name', 'participation_status', 'notes']}
              filters={[
                { name: 'event_program_id', label: 'Program', options: optionSets.eventPrograms },
                { name: 'branch_id', label: 'Branch', options: optionSets.branches },
                { name: 'class_id', label: 'Class', options: optionSets.classes },
                { name: 'grade_id', label: 'Grade', options: optionSets.grades },
                { name: 'team_id', label: 'Team', options: optionSets.eventTeams },
              ]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'event-charges' && (
            <ManagedSection
              type="event_program_charges"
              title="Add Program Charge"
              fields={[
                { name: 'event_program_id', label: 'Program', type: 'select', options: optionSets.eventPrograms },
                { name: 'participant_id', label: 'Participant', type: 'select', options: optionSets.eventParticipants, required: false },
                { name: 'student_id', label: 'Student', type: 'select', options: optionSets.students },
                { name: 'branch_id', label: 'Branch', type: 'select', options: optionSets.branches, required: false },
                { name: 'charge_type', label: 'Charge Type', type: 'select', options: optionSets.chargeTypes },
                { name: 'amount', label: 'Amount', type: 'number' },
                { name: 'paid_amount', label: 'Paid Amount', type: 'number', required: false },
                { name: 'due_amount', label: 'Due Amount', type: 'number', required: false },
                { name: 'status', label: 'Status', type: 'select', options: optionSets.feeStatuses, required: false },
                { name: 'notes', label: 'Manual Correction Notes', type: 'textarea', required: false },
              ]}
              rows={data.event_program_charges || []}
              columns={['program_name', 'student_name', 'branch_name', 'team_name', 'course_name', 'grade_name', 'charge_type', 'amount', 'paid_amount', 'due_amount', 'status', 'notes']}
              filters={[
                { name: 'event_program_id', label: 'Program', options: optionSets.eventPrograms },
                { name: 'branch_id', label: 'Branch', options: optionSets.branches },
                { name: 'status', label: 'Status', options: optionSets.feeStatuses },
                { name: 'charge_type', label: 'Charge Type', options: optionSets.chargeTypes },
              ]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'event-reports' && (
            <EventProgramReport data={data} optionSets={optionSets} />
          )}

          {activePage === 'print-reports' && (
            <PrintReportsView data={data} optionSets={optionSets} />
          )}

          {activePage === 'attendance' && (
            <AttendanceView data={data} />
          )}

          {activePage === 'notifications' && (
            <ManagedSection
              type="notifications"
              title="Add Notification"
              fields={[
                { name: 'title', label: 'Title' },
                { name: 'message', label: 'Message', type: 'textarea' },
                { name: 'role', label: 'Send To', type: 'select', options: optionSets.notificationRoles },
              ]}
              rows={data.notifications}
              columns={['title', 'message', 'role', 'created_at']}
              filters={[{ name: 'role', label: 'Send To', options: optionSets.notificationRoles }]}
              addRecord={addRecord}
              updateRecord={updateRecord}
              deleteRecord={deleteRecord}
            />
          )}

          {activePage === 'enquiries' && (
            <DataSection title="Enquiries" rows={data.enquiries} columns={['name', 'phone', 'email', 'course_interested', 'message']} />
          )}
        </section>
      </div>
    </DashboardFrame>
  )
}
