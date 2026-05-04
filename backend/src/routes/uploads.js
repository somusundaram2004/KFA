import { Router } from 'express'
import multer from 'multer'
import { requireAuth, allowRoles } from '../middleware/auth.js'

const router = Router()

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, done) => {
    done(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
  },
})

const upload = multer({ storage })

router.post('/materials', requireAuth, allowRoles('admin', 'staff'), upload.single('file'), (req, res) => {
  res.status(201).json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
  })
})

router.post('/gallery', upload.single('file'), (req, res) => {
  res.status(201).json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
  })
})

export default router
