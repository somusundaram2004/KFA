import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Router } from 'express'
import { query } from '../db.js'
import { asyncHandler } from '../utils.js'

const router = Router()

router.post('/login', asyncHandler(async (req, res) => {
  const { name, password } = req.body
  console.log('[AUTH] Login request received', {
    name,
    passwordLength: password?.length || 0,
    time: new Date().toISOString(),
  })

  const users = await query('SELECT id, name, dob, password, role, email, phone FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1', [name])
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

  if (plainTextMatch) {
    console.warn('[AUTH] Plain text password matched. Hash this user password with bcrypt for production safety.', { userId: user.id })
  }

  const safeUser = { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone }
  const token = jwt.sign(safeUser, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '8h' })
  console.log('[AUTH] Login success', { id: user.id, role: user.role })
  res.json({ token, user: safeUser })
}))

export default router
