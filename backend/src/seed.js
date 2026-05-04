import bcrypt from 'bcryptjs'
import { pool, query } from './db.js'
import { dobToPassword } from './utils.js'

async function createUser({ name, dob, role, email, phone }) {
  const password = await bcrypt.hash(dobToPassword(dob), 10)
  const result = await query(
    'INSERT INTO users (name, dob, password, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [name, dob, password, role, email, phone],
  )
  return result.insertId
}

async function createPlainUser({ name, dob, password, role, email, phone }) {
  const result = await query(
    'INSERT INTO users (name, dob, password, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [name, dob, password, role, email, phone],
  )
  return result.insertId
}

async function seed() {
  await query('DELETE FROM user_notifications')
  await query('DELETE FROM academic_results')
  await query('DELETE FROM university_exams')
  await query('DELETE FROM grade_exams')
  await query('DELETE FROM student_academics')
  await query('DELETE FROM notifications')
  await query('DELETE FROM class_media')
  await query('DELETE FROM enquiries')
  await query('DELETE FROM fees')
  await query('DELETE FROM attendance')
  await query('DELETE FROM enrollments')
  await query('DELETE FROM classes')
  await query('DELETE FROM university_programs')
  await query('DELETE FROM grade_levels')
  await query('DELETE FROM programs')
  await query('DELETE FROM courses')
  await query('DELETE FROM students')
  await query('DELETE FROM staff')
  await query('DELETE FROM users')

  const adminId = await createPlainUser({ name: 'Admin', dob: '1980-01-01', password: '01011980', role: 'admin', email: 'admin@academy.com', phone: null })
  const staffUserId = await createUser({ name: 'Ananya Rao', dob: '1992-05-12', role: 'staff', email: 'ananya@kfa.test', phone: '9000000002' })
  const studentUserId = await createUser({ name: 'Rahul Nair', dob: '2005-05-20', role: 'student', email: 'rahul@kfa.test', phone: '9000000003' })

  const staffResult = await query('INSERT INTO staff (user_id, specialization, salary) VALUES (?, ?, ?)', [staffUserId, 'Vocals and Keyboard', 42000])
  const studentResult = await query('INSERT INTO students (user_id, admission_date, parent_name) VALUES (?, ?, ?)', [studentUserId, '2026-04-01', 'Meera Nair'])

  const coursesResult = await query(
    'INSERT INTO courses (course_name, description, duration, fees) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
    [
      'Carnatic Vocals', 'Foundations, varnams, kritis, performance training', '12 months', 18000,
      'Keyboard and Piano', 'Notation, scales, harmony, stage practice', '10 months', 22000,
      'Guitar', 'Chords, rhythm, lead guitar, ensemble sessions', '9 months', 20000,
      'Classical Dance', 'Adavus, expression, repertoire, recital preparation', '12 months', 24000,
    ],
  )
  const carnaticCourseId = coursesResult.insertId
  const keyboardCourseId = coursesResult.insertId + 1

  const programsResult = await query(
    'INSERT INTO programs (program_name, description, duration, fees) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
    [
      'Crayons', 'Creative foundation program for young learners', '3 months', 4500,
      'Oil Pastels', 'Color blending and artwork development program', '4 months', 6000,
    ],
  )
  const crayonsProgramId = programsResult.insertId

  const gradesResult = await query(
    'INSERT INTO grade_levels (grade_name, level_order, description) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
    [
      'Pre-Grade', 0, 'Introductory foundation level',
      'Grade 1', 1, 'First formal grade level',
      'Grade 2', 2, 'Intermediate grade level',
    ],
  )
  const preGradeId = gradesResult.insertId
  const gradeOneId = gradesResult.insertId + 1

  const universityResult = await query(
    'INSERT INTO university_programs (program_name, university_name, duration, fees) VALUES (?, ?, ?, ?)',
    ['Diploma in Music', 'Music University', '1 year', 28000],
  )
  const diplomaProgramId = universityResult.insertId

  const classesResult = await query('INSERT INTO classes (course_id, staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)', [
    carnaticCourseId, staffResult.insertId, 'Monday', '17:00', '18:00',
    keyboardCourseId, staffResult.insertId, 'Wednesday', '18:00', '19:00',
  ])
  const carnaticClassId = classesResult.insertId
  const keyboardClassId = classesResult.insertId + 1

  await query('INSERT INTO enrollments (student_id, course_id, enrollment_date) VALUES (?, ?, ?)', [studentResult.insertId, carnaticCourseId, '2026-04-01'])
  await query(
    'INSERT INTO student_academics (student_id, program_id, grade_id, university_program_id, start_date, status) VALUES (?, ?, ?, ?, ?, ?)',
    [studentResult.insertId, crayonsProgramId, preGradeId, null, '2026-04-01', 'active'],
  )
  const gradeExamResult = await query('INSERT INTO grade_exams (grade_id, exam_date) VALUES (?, ?)', [gradeOneId, '2026-08-15'])
  const universityExamResult = await query('INSERT INTO university_exams (university_program_id, exam_name, exam_date) VALUES (?, ?, ?)', [diplomaProgramId, 'Diploma Term 1', '2026-09-10'])
  await query(
    'INSERT INTO academic_results (student_id, grade_exam_id, university_exam_id, marks, grade, result_status) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
    [
      studentResult.insertId, gradeExamResult.insertId, null, 86, 'A', 'pass',
      studentResult.insertId, null, universityExamResult.insertId, 78, 'B+', 'pass',
    ],
  )
  await query('INSERT INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?)', [
    studentResult.insertId, carnaticClassId, '2026-04-22', 'present',
    studentResult.insertId, carnaticClassId, '2026-04-24', 'absent',
  ])
  await query('INSERT INTO fees (student_id, amount, payment_date, status) VALUES (?, ?, ?, ?)', [studentResult.insertId, 18000, '2026-04-10', 'pending'])
  await query('INSERT INTO notifications (title, message, role) VALUES (?, ?, ?)', ['May batch timetable', 'Updated evening practice slots are live.', 'all'])
  console.log('Seed complete')
  console.log('Admin login: Admin / 01011980')
  console.log('Staff login: Ananya Rao / 12051992')
  console.log('Student login: Rahul Nair / 20052005')
  console.log(`Admin user id: ${adminId}`)
  await pool.end()
}

seed().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
