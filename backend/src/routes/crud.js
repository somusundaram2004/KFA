import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { requireAuth, allowRoles } from '../middleware/auth.js'
import { asyncHandler, dobToPassword, pick } from '../utils.js'

const router = Router()

const tables = {
  branches: ['branch_name', 'location', 'phone'],
  users: ['name', 'dob', 'password', 'role', 'email', 'phone', 'branch_id'],
  staff: ['user_id', 'specialization', 'salary', 'branch_id'],
  students: ['user_id', 'admission_date', 'parent_name', 'branch_id'],
  courses: ['course_name', 'description', 'duration', 'fees'],
  classes: ['course_id', 'staff_id', 'branch_id', 'day_of_week', 'start_time', 'end_time'],
  enrollments: ['student_id', 'course_id', 'enrollment_date'],
  attendance: ['student_id', 'class_id', 'date', 'status'],
  fees: ['student_id', 'branch_id', 'fee_type', 'course_id', 'program_id', 'grade_id', 'university_program_id', 'total_amount', 'paid_amount', 'due_amount', 'status'],
  payments: ['fee_id', 'amount', 'payment_date'],
  enquiries: ['name', 'phone', 'email', 'course_interested', 'message'],
  notifications: ['title', 'message', 'role'],
  class_media: ['class_id', 'title', 'media_type', 'media_url', 'thumbnail_url'],
  programs: ['program_name', 'description', 'duration', 'fees'],
  grade_levels: ['grade_name', 'level_order', 'description'],
  university_programs: ['program_name', 'university_name', 'duration', 'fees'],
  student_academics: ['student_id', 'branch_id', 'program_id', 'grade_id', 'university_program_id', 'start_date', 'status'],
  grade_exams: ['grade_id', 'exam_date'],
  university_exams: ['university_program_id', 'exam_name', 'exam_date'],
  academic_results: ['student_id', 'grade_exam_id', 'university_exam_id', 'marks', 'grade', 'result_status'],
}

const adminOnly = allowRoles('admin')

function insertSql(table, fields) {
  return `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`
}

function updateSql(table, fields) {
  return `UPDATE ${table} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`
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
      student_academics,
      grade_exams,
      university_exams,
      academic_results,
      payments,
    ] = await Promise.all([
      query('SELECT * FROM branches ORDER BY id DESC'),
      query(`SELECT s.*, u.name, u.dob, u.email, u.phone, b.branch_name, sa.program_id, sa.grade_id, sa.university_program_id, sa.start_date, sa.status, p.program_name, gl.grade_name, up.program_name university_program_name
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
      query(`SELECT sa.*, u.name student_name, b.branch_name, p.program_name, gl.grade_name, up.program_name university_program_name
        FROM student_academics sa
        JOIN students s ON s.id = sa.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN branches b ON b.id = sa.branch_id
        LEFT JOIN programs p ON p.id = sa.program_id
        LEFT JOIN grade_levels gl ON gl.id = sa.grade_id
        LEFT JOIN university_programs up ON up.id = sa.university_program_id
        ORDER BY sa.id DESC`),
      query(`SELECT ge.*, gl.grade_name
        FROM grade_exams ge
        JOIN grade_levels gl ON gl.id = ge.grade_id
        ORDER BY ge.exam_date DESC, ge.id DESC`),
      query(`SELECT ue.*, up.program_name university_program_name
        FROM university_exams ue
        JOIN university_programs up ON up.id = ue.university_program_id
        ORDER BY ue.exam_date DESC, ue.id DESC`),
      query(`SELECT ar.*, u.name student_name, gl.grade_name, ue.exam_name, up.program_name university_program_name
        FROM academic_results ar
        JOIN students s ON s.id = ar.student_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN grade_exams ge ON ge.id = ar.grade_exam_id
        LEFT JOIN grade_levels gl ON gl.id = ge.grade_id
        LEFT JOIN university_exams ue ON ue.id = ar.university_exam_id
        LEFT JOIN university_programs up ON up.id = ue.university_program_id
        ORDER BY ar.id DESC`),
      query(`SELECT py.*, u.name student_name, f.fee_type
        FROM payments py
        JOIN fees f ON f.id = py.fee_id
        JOIN students s ON s.id = f.student_id
        JOIN users u ON u.id = s.user_id
        ORDER BY py.payment_date DESC, py.id DESC`),
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
    })
  }

  if (role === 'staff') {
    const staffRows = await query('SELECT id FROM staff WHERE user_id = ?', [req.user.id])
    const staffId = staffRows[0]?.id
    const [classes, students, notifications] = await Promise.all([
      query('SELECT c.*, co.course_name FROM classes c JOIN courses co ON co.id = c.course_id WHERE c.staff_id = ?', [staffId]),
      query('SELECT s.*, u.name, u.email, u.phone FROM students s JOIN users u ON u.id = s.user_id ORDER BY u.name'),
      query("SELECT * FROM notifications WHERE role IN ('staff', 'all') ORDER BY created_at DESC"),
    ])
    return res.json({ classes, students, notifications })
  }

  const studentRows = await query('SELECT id FROM students WHERE user_id = ?', [req.user.id])
  const studentId = studentRows[0]?.id
  const [enrollments, schedule, attendance, fees, notifications] = await Promise.all([
    query('SELECT e.*, co.course_name FROM enrollments e JOIN courses co ON co.id = e.course_id WHERE e.student_id = ?', [studentId]),
    query('SELECT c.*, co.course_name FROM classes c JOIN courses co ON co.id = c.course_id JOIN enrollments e ON e.course_id = c.course_id WHERE e.student_id = ?', [studentId]),
    query('SELECT a.*, co.course_name FROM attendance a JOIN classes c ON c.id = a.class_id JOIN courses co ON co.id = c.course_id WHERE a.student_id = ?', [studentId]),
    query('SELECT * FROM fees WHERE student_id = ?', [studentId]),
    query("SELECT * FROM notifications WHERE role IN ('student', 'all') ORDER BY created_at DESC"),
  ])
  res.json({ enrollments, schedule, attendance, fees, notifications })
}))

router.post('/students/full', adminOnly, asyncHandler(async (req, res) => {
  const { name, dob, email, phone, admission_date, parent_name, branch_id, program_id, grade_id, university_program_id, start_date, status } = req.body
  const password = await bcrypt.hash(dobToPassword(dob), 10)
  const userResult = await query(
    'INSERT INTO users (name, dob, password, role, email, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, dob, password, 'student', email, phone, branch_id],
  )
  const studentResult = await query(
    'INSERT INTO students (user_id, admission_date, parent_name, branch_id) VALUES (?, ?, ?, ?)',
    [userResult.insertId, admission_date, parent_name, branch_id],
  )
  if (program_id || grade_id || university_program_id) {
    await query(
      'INSERT INTO student_academics (student_id, branch_id, program_id, grade_id, university_program_id, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [studentResult.insertId, branch_id, program_id || null, grade_id || null, university_program_id || null, start_date || admission_date, status || 'active'],
    )
  }
  res.status(201).json({ id: studentResult.insertId, user_id: userResult.insertId, name, dob, email, phone, admission_date, parent_name, branch_id, program_id, grade_id, university_program_id, start_date, status })
}))

router.put('/students/full/:id', adminOnly, asyncHandler(async (req, res) => {
  const { name, dob, email, phone, admission_date, parent_name, branch_id, program_id, grade_id, university_program_id, start_date, status } = req.body
  const studentRows = await query('SELECT user_id FROM students WHERE id = ?', [req.params.id])
  const userId = studentRows[0]?.user_id
  if (!userId) return res.status(404).json({ message: 'Student not found' })

  await query('UPDATE users SET name = ?, dob = ?, email = ?, phone = ?, branch_id = ? WHERE id = ?', [name, dob, email, phone, branch_id, userId])
  await query('UPDATE students SET admission_date = ?, parent_name = ?, branch_id = ? WHERE id = ?', [admission_date, parent_name, branch_id, req.params.id])
  const academicRows = await query('SELECT id FROM student_academics WHERE student_id = ? ORDER BY id DESC LIMIT 1', [req.params.id])
  if (program_id || grade_id || university_program_id) {
    if (academicRows[0]) {
      await query(
        'UPDATE student_academics SET branch_id = ?, program_id = ?, grade_id = ?, university_program_id = ?, start_date = ?, status = ? WHERE id = ?',
        [branch_id, program_id || null, grade_id || null, university_program_id || null, start_date || admission_date, status || 'active', academicRows[0].id],
      )
    } else {
      await query(
        'INSERT INTO student_academics (student_id, branch_id, program_id, grade_id, university_program_id, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.params.id, branch_id, program_id || null, grade_id || null, university_program_id || null, start_date || admission_date, status || 'active'],
      )
    }
  }
  res.json({ id: Number(req.params.id), user_id: userId, name, dob, email, phone, admission_date, parent_name, branch_id, program_id, grade_id, university_program_id, start_date, status })
}))

router.post('/staff/full', adminOnly, asyncHandler(async (req, res) => {
  const { name, dob, email, phone, specialization, salary, branch_id } = req.body
  const password = await bcrypt.hash(dobToPassword(dob), 10)
  const userResult = await query(
    'INSERT INTO users (name, dob, password, role, email, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, dob, password, 'staff', email, phone, branch_id],
  )
  const staffResult = await query(
    'INSERT INTO staff (user_id, specialization, salary, branch_id) VALUES (?, ?, ?, ?)',
    [userResult.insertId, specialization, salary, branch_id],
  )
  res.status(201).json({ id: staffResult.insertId, user_id: userResult.insertId, name, dob, email, phone, specialization, salary, branch_id })
}))

router.put('/staff/full/:id', adminOnly, asyncHandler(async (req, res) => {
  const { name, dob, email, phone, specialization, salary, branch_id } = req.body
  const staffRows = await query('SELECT user_id FROM staff WHERE id = ?', [req.params.id])
  const userId = staffRows[0]?.user_id
  if (!userId) return res.status(404).json({ message: 'Staff not found' })

  await query('UPDATE users SET name = ?, dob = ?, email = ?, phone = ?, branch_id = ? WHERE id = ?', [name, dob, email, phone, branch_id, userId])
  await query('UPDATE staff SET specialization = ?, salary = ?, branch_id = ? WHERE id = ?', [specialization, salary, branch_id, req.params.id])
  res.json({ id: Number(req.params.id), user_id: userId, name, dob, email, phone, specialization, salary, branch_id })
}))

for (const [table, fields] of Object.entries(tables)) {
  const guard = table === 'attendance' ? allowRoles('admin', 'staff') : table === 'fees' ? allowRoles('admin', 'student') : adminOnly

  router.get(`/${table}`, table === 'notifications' ? allowRoles('admin', 'staff', 'student') : guard, asyncHandler(async (_req, res) => {
    res.json(await query(`SELECT * FROM ${table} ORDER BY id DESC`))
  }))

  router.post(`/${table}`, guard, asyncHandler(async (req, res) => {
    const body = pick(req.body, fields)
    if (table === 'users' && body.password) body.password = await bcrypt.hash(body.password, 10)
    const values = fields.map((field) => body[field])
    const result = await query(insertSql(table, fields), values)
    if (body.password) body.password = undefined
    res.status(201).json({ id: result.insertId, ...body })
  }))

  router.put(`/${table}/:id`, guard, asyncHandler(async (req, res) => {
    const body = pick(req.body, fields)
    if (table === 'users' && body.password) body.password = await bcrypt.hash(body.password, 10)
    await query(updateSql(table, fields), [...fields.map((field) => body[field]), req.params.id])
    if (body.password) body.password = undefined
    res.json({ id: Number(req.params.id), ...body })
  }))

  router.delete(`/${table}/:id`, guard, asyncHandler(async (req, res) => {
    await query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id])
    res.json({ message: 'Deleted' })
  }))
}

export default router
