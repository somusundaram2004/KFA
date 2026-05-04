import { Router } from 'express'
import { mkdirSync } from 'fs'
import multer from 'multer'
import { requireAuth, allowRoles } from '../middleware/auth.js'

const router = Router()

function createUpload(folder) {
  const storage = multer.diskStorage({
    destination: (_req, _file, done) => {
      const destination = `uploads/${folder}`
      mkdirSync(destination, { recursive: true })
      done(null, destination)
    },
    filename: (_req, file, done) => {
      done(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
    },
  })

  return multer({ storage })
}

const materialUpload = createUpload('materials')
const galleryUpload = createUpload('gallery')
const staffPhotoUpload = createUpload('staff')
const studentPhotoUpload = createUpload('students')

function uploadResponse(req, res) {
  res.status(201).json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/${req.file.path.replaceAll('\\', '/')}`,
  })
}

router.post('/materials', requireAuth, allowRoles('admin', 'staff'), materialUpload.single('file'), uploadResponse)

router.post('/gallery', galleryUpload.single('file'), uploadResponse)

router.post('/staff-photos', requireAuth, allowRoles('admin'), staffPhotoUpload.single('file'), uploadResponse)

router.post('/student-photos', requireAuth, allowRoles('admin'), studentPhotoUpload.single('file'), uploadResponse)

export default router
