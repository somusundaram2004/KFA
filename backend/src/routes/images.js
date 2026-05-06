import { Router } from 'express'
import { cloudinary, uploadGallery, uploadStaff, uploadStudents } from '../config/cloudinary.js'
import { query } from '../db.js'
import { asyncHandler } from '../utils.js'

const router = Router()

function imagePayload(file) {
  return {
    image_url: file.path || file.secure_url,
    public_id: file.filename || file.public_id,
  }
}

function requireImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' })
  }
  next()
}

async function destroyImage(publicId) {
  if (publicId) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
  }
}

function deleteExistingImage(tableName) {
  return asyncHandler(async (req, res, next) => {
    const rows = await query(`SELECT public_id FROM ${tableName} WHERE id = ?`, [req.params.id])
    if (!rows.length) {
      return res.status(404).json({ message: `${tableName} record not found` })
    }

    req.existingPublicId = rows[0]?.public_id
    await destroyImage(req.existingPublicId)
    next()
  })
}

router.post('/gallery', uploadGallery.single('image'), requireImage, asyncHandler(async (req, res) => {
  const { title = null } = req.body
  const { image_url, public_id } = imagePayload(req.file)
  const result = await query(
    'INSERT INTO gallery (image_url, public_id, title) VALUES (?, ?, ?)',
    [image_url, public_id, title],
  )

  res.status(201).json({ id: result.insertId, image_url, public_id, title })
}))

router.get('/gallery', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM gallery ORDER BY created_at DESC'))
}))

router.delete('/gallery/:id', asyncHandler(async (req, res) => {
  const rows = await query('SELECT public_id FROM gallery WHERE id = ?', [req.params.id])
  if (!rows.length) {
    return res.status(404).json({ message: 'Gallery image not found' })
  }

  await destroyImage(rows[0].public_id)
  await query('DELETE FROM gallery WHERE id = ?', [req.params.id])
  res.json({ message: 'Gallery image deleted' })
}))

router.put('/staff/:id/image', deleteExistingImage('staff'), uploadStaff.single('image'), requireImage, asyncHandler(async (req, res) => {
  const { image_url, public_id } = imagePayload(req.file)
  const result = await query(
    'UPDATE staff SET image_url = ?, public_id = ? WHERE id = ?',
    [image_url, public_id, req.params.id],
  )
  if (!result.affectedRows) {
    await destroyImage(public_id)
    return res.status(404).json({ message: 'Staff record not found' })
  }

  res.json({ id: Number(req.params.id), image_url, public_id })
}))

router.get('/staff', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT s.*, u.name, u.email, u.phone, b.branch_name
     FROM staff s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN branches b ON b.id = s.branch_id
     ORDER BY s.id DESC`,
  ))
}))

router.put('/students/:id/image', deleteExistingImage('students'), uploadStudents.single('image'), requireImage, asyncHandler(async (req, res) => {
  const { image_url, public_id } = imagePayload(req.file)
  const result = await query(
    'UPDATE students SET image_url = ?, public_id = ? WHERE id = ?',
    [image_url, public_id, req.params.id],
  )
  if (!result.affectedRows) {
    await destroyImage(public_id)
    return res.status(404).json({ message: 'Student record not found' })
  }

  res.json({ id: Number(req.params.id), image_url, public_id })
}))

router.get('/students', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT s.*, u.name, u.email, u.phone, b.branch_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN branches b ON b.id = s.branch_id
     ORDER BY s.id DESC`,
  ))
}))

export default router
