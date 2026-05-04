import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Router } from 'express'
import { query } from '../db.js'
import { ensurePersonPhotoColumns } from '../schema-helpers.js'
import { asyncHandler, dobToPassword } from '../utils.js'

const router = Router()

router.post('/login', asyncHandler(async (req, res) => {
  const { name, password } = req.body
  await ensurePersonPhotoColumns()
  console.log('[AUTH] Login request received', {
    name,
    passwordLength: password?.length || 0,
    time: new Date().toISOString(),
  })

  const users = await query(`SELECT u.id, u.name, u.dob, u.password, u.role, u.email, u.phone, s.account_status
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    WHERE LOWER(u.name) = LOWER(?)
    LIMIT 1`, [name])
  const user = users[0]
  console.log('[AUTH] User lookup result', {
    found: Boolean(user),
    id: user?.id,
    role: user?.role,
    storedPasswordLength: user?.password?.length || 0,
  })

  const bcryptMatch = user ? await bcrypt.compare(password, user.password) : false
  const plainTextMatch = user ? password === user.password : false
  console.log('[AUTH] Password comparison', {
    bcryptMatch,
    plainTextMatch,
    expectedFormat: 'DOB as DDMMYYYY',
  })

  if (!user || (!bcryptMatch && !plainTextMatch)) {
    console.log('[AUTH] Login failed', { name, reason: user ? 'password_mismatch' : 'user_not_found' })
    return res.status(401).json({ message: 'Invalid username or password' })
  }

  if (user.role === 'student' && user.account_status !== 'active') {
    console.log('[AUTH] Student login blocked', { id: user.id, accountStatus: user.account_status })
    return res.status(403).json({ message: 'Student account is waiting for admin activation.' })
  }

  if (plainTextMatch) {
    console.warn('[AUTH] Plain text password matched. Hash this user password with bcrypt for production safety.', { userId: user.id })
  }

  const safeUser = { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone }
  const token = jwt.sign(safeUser, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '8h' })
  console.log('[AUTH] Login success', { id: user.id, role: user.role })
  res.json({ token, user: safeUser })
}))

router.post('/register-student', asyncHandler(async (req, res) => {
  const { name, dob, email, phone, parent_name, branch_id } = req.body
  if (!name || !dob) return res.status(400).json({ message: 'Student name and date of birth are required.' })
  await ensurePersonPhotoColumns()
  const existing = await query('SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND dob = ? LIMIT 1', [name, dob])
  if (existing[0]) return res.status(409).json({ message: 'Student already registered. Please login or contact admin.' })

  const password = await bcrypt.hash(dobToPassword(dob), 10)
  const userResult = await query(
    'INSERT INTO users (name, dob, password, role, email, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, dob, password, 'student', email || null, phone || null, branch_id || null],
  )
  const studentResult = await query(
    'INSERT INTO students (user_id, admission_date, parent_name, branch_id, account_status) VALUES (?, CURDATE(), ?, ?, ?)',
    [userResult.insertId, parent_name || null, branch_id || null, 'pending'],
  )
  res.status(201).json({
    id: studentResult.insertId,
    user_id: userResult.insertId,
    name,
    role: 'student',
    message: 'Student registered. Login using name and DOB password DDMMYYYY.',
  })
}))

export default router
