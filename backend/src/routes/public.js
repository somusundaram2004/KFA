import { Router } from 'express'
import { query } from '../db.js'
import { ensureEventProgramTables, ensureGalleryTable, ensurePersonPhotoColumns, ensureSiteContentTable } from '../schema-helpers.js'
import { asyncHandler } from '../utils.js'

const router = Router()

router.get('/courses', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM courses ORDER BY course_name'))
}))

router.get('/branches', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM branches ORDER BY id DESC'))
}))

router.get('/classes', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT c.*, co.course_name, b.branch_name
     FROM classes c
     JOIN courses co ON co.id = c.course_id
     LEFT JOIN branches b ON b.id = c.branch_id
     ORDER BY c.id DESC`,
  ))
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

router.get('/staff', asyncHandler(async (_req, res) => {
  await ensurePersonPhotoColumns()
  res.json(await query(
    `SELECT st.id, st.specialization, st.branch_id, st.photo_url, st.bio, u.name, b.branch_name
     FROM staff st
     JOIN users u ON u.id = st.user_id
     LEFT JOIN branches b ON b.id = st.branch_id
     ORDER BY st.id DESC`,
  ))
}))

router.get('/gallery', asyncHandler(async (_req, res) => {
  await ensureGalleryTable()
  res.json(await query("SELECT id, image_url media_url, title, created_at, 'photo' media_type FROM gallery ORDER BY created_at DESC, id DESC LIMIT 24"))
}))

router.get('/announcements', asyncHandler(async (_req, res) => {
  res.json(await query("SELECT id, title, message, created_at FROM notifications WHERE role IN ('all', 'student') ORDER BY created_at DESC, id DESC LIMIT 5"))
}))

router.get('/events', asyncHandler(async (_req, res) => {
  await ensureEventProgramTables()
  res.json(await query(
    `SELECT ep.*, b.branch_name
     FROM event_programs ep
     LEFT JOIN branches b ON b.id = ep.branch_id
     WHERE COALESCE(ep.status, 'planning') <> 'cancelled'
     ORDER BY ep.event_date IS NULL, ep.event_date ASC, ep.id DESC
     LIMIT 6`,
  ))
}))

router.get('/site-content', asyncHandler(async (_req, res) => {
  await ensureSiteContentTable()
  const rows = await query('SELECT content_value FROM site_content WHERE content_key = ?', ['homepage'])
  res.json(rows[0]?.content_value || {})
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
