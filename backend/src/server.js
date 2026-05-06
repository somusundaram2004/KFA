import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import authRoutes from './routes/auth.js'
import crudRoutes from './routes/crud.js'
import imageRoutes from './routes/images.js'
import publicRoutes from './routes/public.js'
import uploadRoutes from './routes/uploads.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'KFA ERP API' }))
app.use('/api/auth', authRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api', imageRoutes)
app.use('/api', crudRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Server error', detail: error.message })
})

app.listen(port, () => {
  console.log(`KFA ERP API running on http://localhost:${port}`)
})
