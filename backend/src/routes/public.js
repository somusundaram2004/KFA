import { Router } from 'express'
import { query } from '../db.js'
import { asyncHandler } from '../utils.js'

const router = Router()

router.get('/courses', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM courses ORDER BY course_name'))
}))

router.get('/class-media', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT *
     FROM class_media
     WHERE title NOT IN (?, ?, ?)
     ORDER BY id DESC`,
    ['Carnatic vocal practice', 'Keyboard class session', 'Student performance reel'],
  ))
}))

router.post('/enquiries', asyncHandler(async (req, res) => {
  const { name, phone, email, course_interested, message } = req.body
  const result = await query(
    'INSERT INTO enquiries (name, phone, email, course_interested, message) VALUES (?, ?, ?, ?, ?)',
    [name, phone, email, course_interested, message],
  )
  res.status(201).json({ id: result.insertId, message: 'Enquiry saved' })
}))

export default router
