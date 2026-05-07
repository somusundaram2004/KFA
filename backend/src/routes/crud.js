import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { query } from '../db.js'
import { requireAuth, allowRoles } from '../middleware/auth.js'
import { ensureAcademicDetailColumns, ensureAttendanceDetailColumns, ensureEventProgramTables, ensureFeeScheduleColumns, ensurePersonPhotoColumns, ensureSiteContentTable } from '../schema-helpers.js'
import { asyncHandler, dobToPassword, pick } from '../utils.js'

const router = Router()
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const tables = {
  branches: ['branch_name', 'location', 'phone'],
  users: ['name', 'dob', 'password', 'role', 'email', 'phone', 'branch_id'],
  staff: ['user_id', 'specialization', 'salary', 'branch_id', 'photo_url', 'bio', 'account_status'],
  students: ['user_id', 'admission_date', 'parent_name', 'branch_id', 'photo_url', 'account_status'],
  courses: ['course_name', 'description', 'duration', 'fees'],
  classes: ['course_id', 'staff_id', 'branch_id', 'day_of_week', 'start_time', 'end_time'],
  enrollments: ['student_id', 'course_id', 'enrollment_date'],
  attendance: ['student_id', 'class_id', 'date', 'day_of_week', 'attendance_time', 'status'],
  fees: ['student_id', 'branch_id', 'fee_type', 'course_id', 'program_id', 'grade_id', 'university_program_id', 'total_amount', 'paid_amount', 'due_amount', 'status', 'fee_frequency', 'billing_day', 'due_day'],
  payments: ['fee_id', 'amount', 'payment_date'],
  enquiries: ['name', 'phone', 'email', 'course_interested', 'message'],
  notifications: ['title', 'message', 'role'],
  class_media: ['class_id', 'title', 'media_type', 'media_url', 'thumbnail_url'],
  programs: ['program_name', 'description', 'duration', 'fees'],
  grade_levels: ['grade_name', 'level_order', 'description'],
  university_programs: ['program_name', 'university_name', 'duration', 'fees'],
  exam_boards: ['board_name', 'board_type', 'description'],
  student_academics: ['student_id', 'branch_id', 'program_id', 'grade_id', 'university_program_id', 'academic_track', 'other_exam_name', 'start_date', 'status'],
  grade_exams: ['grade_id', 'exam_board_id', 'exam_name', 'exam_date'],
  university_exams: ['university_program_id', 'exam_board_id', 'exam_name', 'exam_date'],
  academic_results: ['student_id', 'grade_exam_id', 'university_exam_id', 'marks', 'grade', 'result_status'],
  event_programs: ['program_name', 'event_date', 'event_time', 'venue', 'branch_id', 'description', 'status', 'base_fee', 'vehicle_charge', 'extra_charge', 'charge_notes'],
  event_program_items: ['event_program_id', 'category', 'item_title', 'item_notes', 'display_order'],
  event_program_teams: ['event_program_id', 'team_name', 'staff_id', 'team_notes'],
  event_program_participants: ['event_program_id', 'student_id', 'team_id', 'class_id', 'branch_id', 'grade_id', 'role_name', 'participation_status', 'notes'],
  event_program_charges: ['event_program_id', 'participant_id', 'student_id', 'branch_id', 'charge_type', 'amount', 'paid_amount', 'due_amount', 'status', 'notes'],
}

const adminOnly = allowRoles('admin')

function insertSql(table, fields) {
  return `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`
}

function updateSql(table, fields) {
  return `UPDATE ${table} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`
}

function normalizeImportKey(key) {
  return String(key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function normalizeImportRow(row) {
  const aliases = {
    student_name: 'name',
    full_name: 'name',
    date_of_birth: 'dob',
    birth_date: 'dob',
    mobile: 'phone',
    mobile_number: 'phone',
    parent: 'parent_name',
    father_name: 'parent_name',
    mother_name: 'parent_name',
    branch: 'branch_name',
    login_access: 'account_status',
    student_status: 'account_status',
    academic_status: 'status',
  }
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    const normalized = normalizeImportKey(key)
    return [aliases[normalized] || normalized, typeof value === 'string' ? value.trim() : value]
  }))
}

function parseCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
  const rows = []
  let current = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      current.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      current.push(cell)
      if (current.some((value) => value.trim())) rows.push(current)
      current = []
      cell = ''
    } else {
      cell += char
    }
  }
  current.push(cell)
  if (current.some((value) => value.trim())) rows.push(current)
  const headers = rows.shift()?.map(normalizeImportKey) || []
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
}

async function parseStudentImport(file) {
  const extension = file.originalname.split('.').pop()?.toLowerCase()
  if (extension === 'csv') return parseCsv(file.buffer)
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  } catch (error) {
    throw new Error(`Excel parser is not installed. Run npm install in backend and try again. ${error.message}`)
  }
}

function excelSerialToDate(value) {
  const date = new Date(Math.round((Number(value) - 25569) * 86400 * 1000))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function normalizeDateValue(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') return excelSerialToDate(value)
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

async function branchIdFromRow(row, branches) {
  if (row.branch_id) return row.branch_id
  if (!row.branch_name) return null
  const match = branches.find((branch) => branch.branch_name?.toLowerCase() === String(row.branch_name).toLowerCase())
  return match?.id || null
}

async function previewStudentRows(file) {
  await ensurePersonPhotoColumns()
  const rawRows = await parseStudentImport(file)
  const branches = await query('SELECT id, branch_name FROM branches')
  const rows = []
  let valid = 0
  let invalid = 0

  for (const [index, rawRow] of rawRows.entries()) {
    const rowNumber = index + 2
    const row = normalizeImportRow(rawRow)
    const name = row.name || ''
    const dob = normalizeDateValue(row.dob)
    const admissionDate = normalizeDateValue(row.admission_date) || new Date().toISOString().slice(0, 10)
    const branchId = await branchIdFromRow(row, branches)
    const branch = branches.find((item) => Number(item.id) === Number(branchId))
    let status = 'ready'
    let reason = ''

    if (!name || !dob) {
      status = 'error'
      reason = 'Missing name or dob'
    } else {
      const existing = await query('SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND dob = ? LIMIT 1', [name, dob])
      if (existing[0]) {
        status = 'duplicate'
        reason = 'Student already exists'
      }
    }

    if (status === 'ready') valid += 1
    else invalid += 1

    rows.push({
      row: rowNumber,
      status,
      reason,
      name,
      dob,
      phone: row.phone || '',
      email: row.email || '',
      parent_name: row.parent_name || '',
      branch_id: branchId,
      branch_name: branch?.branch_name || row.branch_name || '',
      admission_date: admissionDate,
      account_status: row.account_status || 'active',
      photo_url: row.photo_url || '',
    })
  }

  return { total: rows.length, valid, invalid, rows }
}

router.post('/class_media', asyncHandler(async (req, res) => {
  const fields = tables.class_media
  const body = pick(req.body, fields)
  const result = await query(insertSql('class_media', fields), fields.map((field) => body[field]))
  res.status(201).json({ id: result.insertId, ...body })
}))

router.put('/class_media/:id', asyncHandler(async (req, res) => {
  const fields = tables.class_media
  const body = pick(req.body, fields)
  await query(updateSql('class_media', fields), [...fields.map((field) => body[field]), req.params.id])
  res.json({ id: Number(req.params.id), ...body })
}))

router.delete('/class_media/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM class_media WHERE id = ?', [req.params.id])
  res.json({ message: 'Deleted' })
}))

router.use(requireAuth)

router.use(asyncHandler(async (_req, _res, next) => {
  await ensureEventProgramTables()
  await ensureAttendanceDetailColumns()
  await ensureAcademicDetailColumns()
  next()
}))

router.get('/summary', allowRoles('admin'), asyncHandler(async (_req, res) => {
  const [[students], [staff], [courses], [enquiries]] = await Promise.all([
    query('SELECT COUNT(*) total FROM students'),
    query('SELECT COUNT(*) total FROM staff'),
    query('SELECT COUNT(*) total FROM courses'),
    query('SELECT COUNT(*) total FROM enquiries'),
  ])
  res.json({ students: students.total, staff: staff.total, courses: courses.total, enquiries: enquiries.total })
}))

router.get('/me/dashboard', asyncHandler(async (req, res) => {
  const role = req.user.role
  if (role === 'admin') {
    await ensurePersonPhotoColumns()
    await ensureFeeScheduleColumns()
    const [
      branches,
      students,
      staff,
      courses,
      classes,
      enquiries,
      attendance,
      fees,
      notifications,
      class_media,
      programs,
      grade_levels,
      university_programs,
      exam_boards,
      student_academics,
      grade_exams,
      university_exams,
      academic_results,
      payments,
      event_programs,
      event_program_items,
      event_program_teams,
      event_program_participants,
      event_program_charges,
    ] = await Promise.all([
      query('SELECT * FROM branches ORDER BY id DESC'),
      query(`SELECT s.*, u.name, u.dob, u.email, u.phone, b.branch_name, sa.program_id, sa.grade_id, sa.university_program_id, sa.academic_track, sa.other_exam_name, sa.start_date, sa.status, p.program_name, gl.grade_name, up.program_name university_program_name
        FROM students s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = s.branch_id
        LEFT JOIN student_academics sa ON sa.id = (SELECT MAX(sa2.id) FROM student_academics sa2 WHERE sa2.student_id = s.id)
        LEFT JOIN programs p ON p.id = sa.program_id
        LEFT JOIN grade_levels gl ON gl.id = sa.grade_id
        LEFT JOIN university_programs up ON up.id = sa.university_program_id
        ORDER BY s.id DESC`),
      query('SELECT st.*, u.name, u.dob, u.email, u.phone, b.branch_name FROM staff st JOIN users u ON u.id = st.user_id LEFT JOIN branches b ON b.id = st.branch_id ORDER BY st.id DESC'),
      query('SELECT * FROM courses ORDER BY id DESC'),
      query('SELECT c.*, co.course_name, u.name staff_name, b.branch_name FROM classes c JOIN courses co ON co.id = c.course_id LEFT JOIN staff st ON st.id = c.staff_id LEFT JOIN users u ON u.id = st.user_id LEFT JOIN branches b ON b.id = c.branch_id ORDER BY c.id DESC'),
      query('SELECT * FROM enquiries ORDER BY created_at DESC'),
      query('SELECT a.*, u.name student_name, co.course_name, b.branch_name FROM attendance a JOIN students s ON s.id = a.student_id JOIN users u ON u.id = s.user_id JOIN classes c ON c.id = a.class_id JOIN courses co ON co.id = c.course_id LEFT JOIN branches b ON b.id = c.branch_id ORDER BY a.date DESC'),
      query(`SELECT f.*, u.name student_name, b.branch_name, co.course_name, p.program_name, gl.grade_name, up.program_name university_program_name
        FROM fees f
        JOIN students s ON s.id = f.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = f.branch_id
        LEFT JOIN courses co ON co.id = f.course_id
        LEFT JOIN programs p ON p.id = f.program_id
        LEFT JOIN grade_levels gl ON gl.id = f.grade_id
        LEFT JOIN university_programs up ON up.id = f.university_program_id
        ORDER BY f.id DESC`),
      query('SELECT * FROM notifications ORDER BY created_at DESC'),
      query('SELECT * FROM class_media ORDER BY id DESC'),
      query('SELECT * FROM programs ORDER BY id DESC'),
      query('SELECT * FROM grade_levels ORDER BY level_order, id'),
      query('SELECT * FROM university_programs ORDER BY id DESC'),
      query('SELECT * FROM exam_boards ORDER BY id DESC'),
      query(`SELECT sa.*, u.name student_name, b.branch_name, p.program_name, gl.grade_name, up.program_name university_program_name
        FROM student_academics sa
        JOIN students s ON s.id = sa.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = sa.branch_id
        LEFT JOIN programs p ON p.id = sa.program_id
        LEFT JOIN grade_levels gl ON gl.id = sa.grade_id
        LEFT JOIN university_programs up ON up.id = sa.university_program_id
        ORDER BY sa.id DESC`),
      query(`SELECT ge.*, COALESCE(eb.board_name, ge.exam_board, 'Grade Board') exam_board_name, COALESCE(eb.board_type, 'grade') exam_board_type, gl.grade_name
        FROM grade_exams ge
        JOIN grade_levels gl ON gl.id = ge.grade_id
        LEFT JOIN exam_boards eb ON eb.id = ge.exam_board_id
        ORDER BY ge.exam_date DESC, ge.id DESC`),
      query(`SELECT ue.*, COALESCE(eb.board_name, ue.exam_board, 'University Board') exam_board_name, COALESCE(eb.board_type, 'university') exam_board_type, up.program_name university_program_name
        FROM university_exams ue
        JOIN university_programs up ON up.id = ue.university_program_id
        LEFT JOIN exam_boards eb ON eb.id = ue.exam_board_id
        ORDER BY ue.exam_date DESC, ue.id DESC`),
      query(`SELECT ar.*, u.name student_name, gl.grade_name, COALESCE(geb.board_name, ge.exam_board, 'Grade Board') grade_exam_board, ue.exam_name, COALESCE(ueb.board_name, ue.exam_board, 'University Board') university_exam_board, up.program_name university_program_name
        FROM academic_results ar
        JOIN students s ON s.id = ar.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN grade_exams ge ON ge.id = ar.grade_exam_id
        LEFT JOIN grade_levels gl ON gl.id = ge.grade_id
        LEFT JOIN university_exams ue ON ue.id = ar.university_exam_id
        LEFT JOIN university_programs up ON up.id = ue.university_program_id
        LEFT JOIN exam_boards geb ON geb.id = ge.exam_board_id
        LEFT JOIN exam_boards ueb ON ueb.id = ue.exam_board_id
        ORDER BY ar.id DESC`),
      query(`SELECT py.*, u.name student_name, f.fee_type
        FROM payments py
        JOIN fees f ON f.id = py.fee_id
        JOIN students s ON s.id = f.student_id
        JOIN users u ON u.id = s.user_id
        ORDER BY py.payment_date DESC, py.id DESC`),
      query('SELECT ep.*, b.branch_name FROM event_programs ep LEFT JOIN branches b ON b.id = ep.branch_id ORDER BY ep.event_date DESC, ep.id DESC'),
      query('SELECT epi.*, ep.program_name FROM event_program_items epi JOIN event_programs ep ON ep.id = epi.event_program_id ORDER BY epi.display_order, epi.id DESC'),
      query('SELECT ept.*, ep.program_name, u.name staff_name FROM event_program_teams ept JOIN event_programs ep ON ep.id = ept.event_program_id LEFT JOIN staff st ON st.id = ept.staff_id LEFT JOIN users u ON u.id = st.user_id ORDER BY ept.id DESC'),
      query(`SELECT epp.*, ep.program_name, u.name student_name, b.branch_name, co.course_name, gl.grade_name, ept.team_name
        FROM event_program_participants epp
        JOIN event_programs ep ON ep.id = epp.event_program_id
        JOIN students s ON s.id = epp.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = epp.branch_id
        LEFT JOIN classes c ON c.id = epp.class_id
        LEFT JOIN courses co ON co.id = c.course_id
        LEFT JOIN grade_levels gl ON gl.id = epp.grade_id
        LEFT JOIN event_program_teams ept ON ept.id = epp.team_id
        ORDER BY epp.id DESC`),
      query(`SELECT epc.*, ep.program_name, u.name student_name, b.branch_name, ept.team_name, co.course_name, gl.grade_name
        FROM event_program_charges epc
        JOIN event_programs ep ON ep.id = epc.event_program_id
        JOIN students s ON s.id = epc.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = epc.branch_id
        LEFT JOIN event_program_participants epp ON epp.id = epc.participant_id
        LEFT JOIN event_program_teams ept ON ept.id = epp.team_id
        LEFT JOIN classes c ON c.id = epp.class_id
        LEFT JOIN courses co ON co.id = c.course_id
        LEFT JOIN grade_levels gl ON gl.id = epp.grade_id
        ORDER BY epc.id DESC`),
    ])
    return res.json({
      branches,
      students,
      staff,
      courses,
      classes,
      enquiries,
      attendance,
      fees,
      notifications,
      class_media,
      programs,
      grade_levels,
      university_programs,
      student_academics,
      grade_exams,
      university_exams,
      academic_results,
      payments,
      event_programs,
      event_program_items,
      event_program_teams,
      event_program_participants,
      event_program_charges,
    })
  }

  if (role === 'staff') {
    const staffRows = await query('SELECT st.*, u.name, u.email, u.phone, b.branch_name FROM staff st JOIN users u ON u.id = st.user_id LEFT JOIN branches b ON b.id = st.branch_id WHERE st.user_id = ?', [req.user.id])
    const staffId = staffRows[0]?.id
    const [classes, students, enrollments, attendance, notifications, event_programs, event_program_items, event_program_teams, event_program_participants] = await Promise.all([
      query('SELECT c.*, co.course_name, b.branch_name FROM classes c JOIN courses co ON co.id = c.course_id LEFT JOIN branches b ON b.id = c.branch_id WHERE c.staff_id = ?', [staffId]),
      query('SELECT s.*, u.name, u.email, u.phone FROM students s JOIN users u ON u.id = s.user_id ORDER BY u.name'),
      query(`SELECT e.*, u.name student_name, co.course_name
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN users u ON u.id = s.user_id
        JOIN courses co ON co.id = e.course_id
        WHERE e.course_id IN (SELECT course_id FROM classes WHERE staff_id = ?)
        ORDER BY u.name`, [staffId]),
      query(`SELECT a.*, u.name student_name, co.course_name, b.branch_name
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        JOIN users u ON u.id = s.user_id
        JOIN classes c ON c.id = a.class_id
        JOIN courses co ON co.id = c.course_id
        LEFT JOIN branches b ON b.id = c.branch_id
        WHERE c.staff_id = ?
        ORDER BY a.date DESC, a.id DESC`, [staffId]),
      query("SELECT * FROM notifications WHERE role IN ('staff', 'all') ORDER BY created_at DESC"),
      query(`SELECT DISTINCT ep.*, b.branch_name
        FROM event_programs ep
        LEFT JOIN branches b ON b.id = ep.branch_id
        LEFT JOIN event_program_teams ept ON ept.event_program_id = ep.id
        WHERE ept.staff_id = ? OR ep.branch_id IN (SELECT branch_id FROM staff WHERE id = ?)
        ORDER BY ep.event_date DESC, ep.id DESC`, [staffId, staffId]),
      query('SELECT epi.*, ep.program_name FROM event_program_items epi JOIN event_programs ep ON ep.id = epi.event_program_id ORDER BY epi.display_order, epi.id DESC'),
      query('SELECT ept.*, ep.program_name, u.name staff_name FROM event_program_teams ept JOIN event_programs ep ON ep.id = ept.event_program_id LEFT JOIN staff st ON st.id = ept.staff_id LEFT JOIN users u ON u.id = st.user_id WHERE ept.staff_id = ? ORDER BY ept.id DESC', [staffId]),
      query(`SELECT epp.*, ep.program_name, u.name student_name, b.branch_name, co.course_name, gl.grade_name, ept.team_name
        FROM event_program_participants epp
        JOIN event_programs ep ON ep.id = epp.event_program_id
        JOIN students s ON s.id = epp.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = epp.branch_id
        LEFT JOIN classes c ON c.id = epp.class_id
        LEFT JOIN courses co ON co.id = c.course_id
        LEFT JOIN grade_levels gl ON gl.id = epp.grade_id
        LEFT JOIN event_program_teams ept ON ept.id = epp.team_id
        WHERE ept.staff_id = ? OR epp.branch_id IN (SELECT branch_id FROM staff WHERE id = ?)
        ORDER BY epp.id DESC`, [staffId, staffId]),
    ])
    return res.json({ staff: staffRows, classes, students, enrollments, attendance, notifications, event_programs, event_program_items, event_program_teams, event_program_participants })
  }

  const studentRows = await query(`SELECT s.*, u.name, u.dob, u.email, u.phone, b.branch_name
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN branches b ON b.id = s.branch_id
    WHERE s.user_id = ?
    LIMIT 1`, [req.user.id])
  const studentId = studentRows[0]?.id
  await ensureFeeScheduleColumns()
  if (!studentId) {
    const notifications = await query("SELECT * FROM notifications WHERE role IN ('student', 'all') ORDER BY created_at DESC")
    return res.json({
      students: studentRows,
      student_academics: [],
      academic_results: [],
      enrollments: [],
      schedule: [],
      attendance: [],
      fees: [],
      payments: [],
      notifications,
      event_programs: [],
      event_program_items: [],
      event_program_participants: [],
      event_program_charges: [],
    })
  }
  const [notifications, programs, grade_levels, university_programs, academics] = await Promise.all([
    query("SELECT * FROM notifications WHERE role IN ('student', 'all') ORDER BY created_at DESC"),
    query('SELECT * FROM programs ORDER BY id DESC'),
    query('SELECT * FROM grade_levels ORDER BY level_order, id'),
    query('SELECT * FROM university_programs ORDER BY id DESC'),
    query(`SELECT sa.*, u.name student_name, b.branch_name, p.program_name, gl.grade_name, up.program_name university_program_name
      FROM student_academics sa
      JOIN students s ON s.id = sa.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN branches b ON b.id = sa.branch_id
      LEFT JOIN programs p ON p.id = sa.program_id
      LEFT JOIN grade_levels gl ON gl.id = sa.grade_id
      LEFT JOIN university_programs up ON up.id = sa.university_program_id
      WHERE sa.student_id = ?
      ORDER BY sa.id DESC`, [studentId]),
  ])
  const academicDetailsComplete = Boolean(academics[0]?.program_id || academics[0]?.grade_id || academics[0]?.university_program_id || academics[0]?.academic_track)

  if (!academicDetailsComplete) {
    return res.json({
      students: studentRows,
      student_academics: academics,
      academic_results: [],
      enrollments: [],
      schedule: [],
      attendance: [],
      fees: [],
      payments: [],
      notifications,
      programs,
      grade_levels,
      university_programs,
      exam_boards,
      event_programs: [],
      event_program_items: [],
      event_program_participants: [],
      event_program_charges: [],
    })
  }

  const [enrollments, schedule, attendance, fees, payments, event_programs, event_program_items, event_program_participants, event_program_charges] = await Promise.all([
    query('SELECT e.*, co.course_name FROM enrollments e JOIN courses co ON co.id = e.course_id WHERE e.student_id = ?', [studentId]),
    query('SELECT c.*, co.course_name, b.branch_name FROM classes c JOIN courses co ON co.id = c.course_id JOIN enrollments e ON e.course_id = c.course_id LEFT JOIN branches b ON b.id = c.branch_id WHERE e.student_id = ?', [studentId]),
    query('SELECT a.*, co.course_name, b.branch_name FROM attendance a JOIN classes c ON c.id = a.class_id JOIN courses co ON co.id = c.course_id LEFT JOIN branches b ON b.id = c.branch_id WHERE a.student_id = ?', [studentId]),
    query(`SELECT f.*, u.name student_name, b.branch_name, co.course_name, p.program_name, gl.grade_name, up.program_name university_program_name
      FROM fees f
      JOIN students s ON s.id = f.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN branches b ON b.id = f.branch_id
      LEFT JOIN courses co ON co.id = f.course_id
      LEFT JOIN programs p ON p.id = f.program_id
      LEFT JOIN grade_levels gl ON gl.id = f.grade_id
      LEFT JOIN university_programs up ON up.id = f.university_program_id
      WHERE f.student_id = ?
      ORDER BY f.id DESC`, [studentId]),
    query(`SELECT py.*, f.fee_type
      FROM payments py
      JOIN fees f ON f.id = py.fee_id
      WHERE f.student_id = ?
      ORDER BY py.payment_date DESC, py.id DESC`, [studentId]),
    query(`SELECT ep.*, b.branch_name
      FROM event_programs ep
      JOIN event_program_participants epp ON epp.event_program_id = ep.id
      LEFT JOIN branches b ON b.id = ep.branch_id
      WHERE epp.student_id = ?
      ORDER BY ep.event_date DESC, ep.id DESC`, [studentId]),
    query(`SELECT epi.*, ep.program_name
      FROM event_program_items epi
      JOIN event_programs ep ON ep.id = epi.event_program_id
      JOIN event_program_participants epp ON epp.event_program_id = ep.id
      WHERE epp.student_id = ?
      ORDER BY epi.display_order, epi.id DESC`, [studentId]),
    query(`SELECT epp.*, ep.program_name, u.name student_name, b.branch_name, co.course_name, gl.grade_name, ept.team_name
      FROM event_program_participants epp
      JOIN event_programs ep ON ep.id = epp.event_program_id
      JOIN students s ON s.id = epp.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN branches b ON b.id = epp.branch_id
      LEFT JOIN classes c ON c.id = epp.class_id
      LEFT JOIN courses co ON co.id = c.course_id
      LEFT JOIN grade_levels gl ON gl.id = epp.grade_id
      LEFT JOIN event_program_teams ept ON ept.id = epp.team_id
      WHERE epp.student_id = ?
      ORDER BY epp.id DESC`, [studentId]),
    query('SELECT epc.*, ep.program_name FROM event_program_charges epc JOIN event_programs ep ON ep.id = epc.event_program_id WHERE epc.student_id = ? ORDER BY epc.id DESC', [studentId]),
  ])
  const results = await query(`SELECT ar.*, u.name student_name, gl.grade_name, COALESCE(geb.board_name, ge.exam_board, 'Grade Board') grade_exam_board, ue.exam_name, COALESCE(ueb.board_name, ue.exam_board, 'University Board') university_exam_board, up.program_name university_program_name
    FROM academic_results ar
    JOIN students s ON s.id = ar.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN grade_exams ge ON ge.id = ar.grade_exam_id
    LEFT JOIN grade_levels gl ON gl.id = ge.grade_id
    LEFT JOIN university_exams ue ON ue.id = ar.university_exam_id
    LEFT JOIN university_programs up ON up.id = ue.university_program_id
    LEFT JOIN exam_boards geb ON geb.id = ge.exam_board_id
    LEFT JOIN exam_boards ueb ON ueb.id = ue.exam_board_id
    WHERE ar.student_id = ?
    ORDER BY ar.id DESC`, [studentId])
  res.json({ students: studentRows, student_academics: academics, academic_results: results, enrollments, schedule, attendance, fees, payments, notifications, programs, grade_levels, university_programs, event_programs, event_program_items, event_program_participants, event_program_charges })
}))

router.post('/students/full', adminOnly, asyncHandler(async (req, res) => {
  await ensurePersonPhotoColumns()
  const { name, email, phone, parent_name, branch_id, photo_url, account_status, program_id, grade_id, university_program_id, academic_track, other_exam_name, status } = req.body
  const dob = normalizeDateValue(req.body.dob)
  const admission_date = normalizeDateValue(req.body.admission_date)
  const start_date = normalizeDateValue(req.body.start_date)
  const password = await bcrypt.hash(dobToPassword(dob), 10)
  const userResult = await query(
    'INSERT INTO users (name, dob, password, role, email, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, dob, password, 'student', email, phone, branch_id],
  )
  const studentResult = await query(
    'INSERT INTO students (user_id, admission_date, parent_name, branch_id, photo_url, account_status) VALUES (?, ?, ?, ?, ?, ?)',
    [userResult.insertId, admission_date, parent_name, branch_id, photo_url, account_status || 'active'],
  )
  if (program_id || grade_id || university_program_id || academic_track || other_exam_name) {
    await query(
      'INSERT INTO student_academics (student_id, branch_id, program_id, grade_id, university_program_id, academic_track, other_exam_name, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [studentResult.insertId, branch_id, program_id || null, grade_id || null, university_program_id || null, academic_track || 'regular', other_exam_name || null, start_date || admission_date, status || 'active'],
    )
  }
  res.status(201).json({ id: studentResult.insertId, user_id: userResult.insertId, name, dob, email, phone, admission_date, parent_name, branch_id, photo_url, account_status: account_status || 'active', program_id, grade_id, university_program_id, academic_track, other_exam_name, start_date, status })
}))

router.put('/students/full/:id', adminOnly, asyncHandler(async (req, res) => {
  await ensurePersonPhotoColumns()
  const { name, email, phone, parent_name, branch_id, photo_url, account_status, program_id, grade_id, university_program_id, academic_track, other_exam_name, status } = req.body
  const dob = normalizeDateValue(req.body.dob)
  const admission_date = normalizeDateValue(req.body.admission_date)
  const start_date = normalizeDateValue(req.body.start_date)
  const studentRows = await query('SELECT user_id FROM students WHERE id = ?', [req.params.id])
  const userId = studentRows[0]?.user_id
  if (!userId) return res.status(404).json({ message: 'Student not found' })

  await query('UPDATE users SET name = ?, dob = ?, email = ?, phone = ?, branch_id = ? WHERE id = ?', [name, dob, email, phone, branch_id, userId])
  await query('UPDATE students SET admission_date = ?, parent_name = ?, branch_id = ?, photo_url = ?, account_status = ? WHERE id = ?', [admission_date, parent_name, branch_id, photo_url, account_status || 'active', req.params.id])
  const academicRows = await query('SELECT id FROM student_academics WHERE student_id = ? ORDER BY id DESC LIMIT 1', [req.params.id])
  if (program_id || grade_id || university_program_id || academic_track || other_exam_name) {
    if (academicRows[0]) {
      await query(
        'UPDATE student_academics SET branch_id = ?, program_id = ?, grade_id = ?, university_program_id = ?, academic_track = ?, other_exam_name = ?, start_date = ?, status = ? WHERE id = ?',
        [branch_id, program_id || null, grade_id || null, university_program_id || null, academic_track || 'regular', other_exam_name || null, start_date || admission_date, status || 'active', academicRows[0].id],
      )
    } else {
      await query(
        'INSERT INTO student_academics (student_id, branch_id, program_id, grade_id, university_program_id, academic_track, other_exam_name, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.params.id, branch_id, program_id || null, grade_id || null, university_program_id || null, academic_track || 'regular', other_exam_name || null, start_date || admission_date, status || 'active'],
      )
    }
  }
  res.json({ id: Number(req.params.id), user_id: userId, name, dob, email, phone, admission_date, parent_name, branch_id, photo_url, account_status: account_status || 'active', program_id, grade_id, university_program_id, academic_track, other_exam_name, start_date, status })
}))

router.post('/students/import', adminOnly, importUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Excel file is required.' })
  const preview = await previewStudentRows(req.file)
  const summary = { total: preview.total, created: 0, skipped: 0, errors: [] }

  for (const row of preview.rows) {
    if (row.status !== 'ready') {
      summary.skipped += 1
      summary.errors.push({ row: row.row, reason: row.reason })
      continue
    }

    const password = await bcrypt.hash(dobToPassword(row.dob), 10)
    const userResult = await query(
      'INSERT INTO users (name, dob, password, role, email, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [row.name, row.dob, password, 'student', row.email || null, row.phone || null, row.branch_id || null],
    )
    await query(
      'INSERT INTO students (user_id, admission_date, parent_name, branch_id, photo_url, account_status) VALUES (?, ?, ?, ?, ?, ?)',
      [userResult.insertId, row.admission_date, row.parent_name || null, row.branch_id || null, row.photo_url || null, row.account_status || 'active'],
    )
    summary.created += 1
  }

  res.status(201).json(summary)
}))

router.post('/students/import/preview', adminOnly, importUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Excel file is required.' })
  res.json(await previewStudentRows(req.file))
}))

router.post('/me/academic-details', allowRoles('student'), asyncHandler(async (req, res) => {
  const studentRows = await query('SELECT id, branch_id, admission_date FROM students WHERE user_id = ? LIMIT 1', [req.user.id])
  const student = studentRows[0]
  if (!student) return res.status(404).json({ message: 'Student profile not found.' })

  const programId = req.body.program_id || null
  const gradeId = req.body.grade_id || null
  const universityProgramId = req.body.university_program_id || null
  const academicTrack = req.body.academic_track || 'regular'
  const otherExamName = req.body.other_exam_name || null
  const startDate = normalizeDateValue(req.body.start_date) || student.admission_date || new Date().toISOString().slice(0, 10)

  if (!programId && !gradeId && !universityProgramId && !academicTrack) {
    return res.status(400).json({ message: 'Select regular class or one exam track before opening the dashboard.' })
  }

  const academicRows = await query('SELECT id FROM student_academics WHERE student_id = ? ORDER BY id DESC LIMIT 1', [student.id])
  const values = [student.branch_id || null, programId, gradeId, universityProgramId, academicTrack, otherExamName, startDate, 'active']

  if (academicRows[0]) {
    await query(
      'UPDATE student_academics SET branch_id = ?, program_id = ?, grade_id = ?, university_program_id = ?, academic_track = ?, other_exam_name = ?, start_date = ?, status = ? WHERE id = ?',
      [...values, academicRows[0].id],
    )
    return res.json({ id: academicRows[0].id, student_id: student.id, branch_id: student.branch_id || null, program_id: programId, grade_id: gradeId, university_program_id: universityProgramId, academic_track: academicTrack, other_exam_name: otherExamName, start_date: startDate, status: 'active' })
  }

  const result = await query(
    'INSERT INTO student_academics (student_id, branch_id, program_id, grade_id, university_program_id, academic_track, other_exam_name, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [student.id, ...values],
  )
  res.status(201).json({ id: result.insertId, student_id: student.id, branch_id: student.branch_id || null, program_id: programId, grade_id: gradeId, university_program_id: universityProgramId, academic_track: academicTrack, other_exam_name: otherExamName, start_date: startDate, status: 'active' })
}))

router.post('/staff/full', adminOnly, asyncHandler(async (req, res) => {
  await ensurePersonPhotoColumns()
  const { name, email, phone, specialization, salary, branch_id, photo_url, bio, account_status = 'active' } = req.body
  const dob = normalizeDateValue(req.body.dob)
  const password = await bcrypt.hash(dobToPassword(dob), 10)
  const userResult = await query(
    'INSERT INTO users (name, dob, password, role, email, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, dob, password, 'staff', email, phone, branch_id],
  )
  const staffResult = await query(
    'INSERT INTO staff (user_id, specialization, salary, branch_id, photo_url, bio, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userResult.insertId, specialization, salary, branch_id, photo_url, bio, account_status],
  )
  res.status(201).json({ id: staffResult.insertId, user_id: userResult.insertId, name, dob, email, phone, specialization, salary, branch_id, photo_url, bio, account_status })
}))

router.put('/staff/full/:id', adminOnly, asyncHandler(async (req, res) => {
  await ensurePersonPhotoColumns()
  const { name, email, phone, specialization, salary, branch_id, photo_url, bio, account_status = 'active' } = req.body
  const dob = normalizeDateValue(req.body.dob)
  const staffRows = await query('SELECT user_id FROM staff WHERE id = ?', [req.params.id])
  const userId = staffRows[0]?.user_id
  if (!userId) return res.status(404).json({ message: 'Staff not found' })

  await query('UPDATE users SET name = ?, dob = ?, email = ?, phone = ?, branch_id = ? WHERE id = ?', [name, dob, email, phone, branch_id, userId])
  await query('UPDATE staff SET specialization = ?, salary = ?, branch_id = ?, photo_url = ?, bio = ?, account_status = ? WHERE id = ?', [specialization, salary, branch_id, photo_url, bio, account_status, req.params.id])
  res.json({ id: Number(req.params.id), user_id: userId, name, dob, email, phone, specialization, salary, branch_id, photo_url, bio, account_status })
}))

router.put('/site-content/homepage', adminOnly, asyncHandler(async (req, res) => {
  await ensureSiteContentTable()
  const content = req.body || {}
  await query(
    'INSERT INTO site_content (content_key, content_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE content_value = VALUES(content_value)',
    ['homepage', JSON.stringify(content)],
  )
  res.json(content)
}))

async function recalculateFee(feeId) {
  const payments = await query('SELECT COALESCE(SUM(amount), 0) paid FROM payments WHERE fee_id = ?', [feeId])
  const fees = await query('SELECT total_amount, amount FROM fees WHERE id = ?', [feeId])
  const total = Number(fees[0]?.total_amount || fees[0]?.amount || 0)
  const paid = Number(payments[0]?.paid || 0)
  const due = Math.max(total - paid, 0)
  const status = due <= 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending'
  await query('UPDATE fees SET paid_amount = ?, due_amount = ?, status = ? WHERE id = ?', [paid, due, status, feeId])
}

function normalizeEventCharge(body) {
  const amount = Number(body.amount || 0)
  const paid = Number(body.paid_amount || 0)
  body.due_amount = Math.max(amount - paid, 0)
  body.status = body.due_amount <= 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : body.status || 'pending'
  return body
}

function normalizeFee(body) {
  const total = Number(body.total_amount || body.amount || 0)
  const paid = Number(body.paid_amount || 0)
  body.due_amount = body.due_amount ?? Math.max(total - paid, 0)
  body.status = body.status || (Number(body.due_amount || 0) <= 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending')
  body.fee_frequency = body.fee_frequency || 'monthly'
  return body
}

for (const [table, fields] of Object.entries(tables)) {
  const guard = table === 'attendance' ? allowRoles('admin', 'staff') : table === 'fees' ? allowRoles('admin', 'student') : adminOnly

  router.get(`/${table}`, table === 'notifications' ? allowRoles('admin', 'staff', 'student') : guard, asyncHandler(async (_req, res) => {
    res.json(await query(`SELECT * FROM ${table} ORDER BY id DESC`))
  }))

  router.post(`/${table}`, guard, asyncHandler(async (req, res) => {
    let body = pick(req.body, fields)
    if (table === 'event_program_charges') body = normalizeEventCharge(body)
    if (table === 'fees') body = normalizeFee(body)
    if (table === 'users' && body.password) body.password = await bcrypt.hash(body.password, 10)
    const values = fields.map((field) => body[field])
    const result = await query(insertSql(table, fields), values)
    if (table === 'payments') await recalculateFee(body.fee_id)
    if (body.password) body.password = undefined
    res.status(201).json({ id: result.insertId, ...body })
  }))

  router.put(`/${table}/:id`, guard, asyncHandler(async (req, res) => {
    let body = pick(req.body, fields)
    if (table === 'event_program_charges') body = normalizeEventCharge(body)
    if (table === 'fees') body = normalizeFee(body)
    if (table === 'users' && body.password) body.password = await bcrypt.hash(body.password, 10)
    await query(updateSql(table, fields), [...fields.map((field) => body[field]), req.params.id])
    if (table === 'payments') await recalculateFee(body.fee_id)
    if (body.password) body.password = undefined
    res.json({ id: Number(req.params.id), ...body })
  }))

  router.delete(`/${table}/:id`, guard, asyncHandler(async (req, res) => {
    let feeId = null
    if (table === 'payments') {
      const paymentRows = await query('SELECT fee_id FROM payments WHERE id = ?', [req.params.id])
      feeId = paymentRows[0]?.fee_id
    }
    await query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id])
    if (table === 'payments' && feeId) await recalculateFee(feeId)
    res.json({ message: 'Deleted' })
  }))
}

export default router
