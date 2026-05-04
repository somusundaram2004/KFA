import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { requireAuth, allowRoles } from '../middleware/auth.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const router = Router()

function createUpload(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `kfa/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webp'],
      resource_type: 'auto',
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
    url: req.file.path,
  })
}

router.post('/materials', requireAuth, allowRoles('admin', 'staff'), materialUpload.single('file'), uploadResponse)
router.post('/gallery', galleryUpload.single('file'), uploadResponse)
router.post('/staff-photos', requireAuth, allowRoles('admin'), staffPhotoUpload.single('file'), uploadResponse)
router.post('/student-photos', requireAuth, allowRoles('admin'), studentPhotoUpload.single('file'), uploadResponse)

export default router
