# KFA Music Academy ERP

Full-stack ERP system for a music academy with a public website, enquiry capture, custom DOB-based login, role dashboards, schedules, notifications, attendance, and fee tracking.

## Project Structure

- `frontend/` - React + Vite frontend
- `backend/` - Node.js + Express.js API
- `backend/schema.sql` - MySQL schema for database `kfa`
- `backend/src/seed.js` - sample admin, staff, student, courses, schedules, attendance, fees, and notifications

## Frontend

The React app works even before the backend is running by using local demo data. When the backend is available, set:

```bash
VITE_API_URL=http://localhost:5000/api
```

Run:

```bash
cd frontend
npm install
npm run dev
```

Demo logins:

- Admin: `Admin` / `01011990`
- Staff: `Ananya Rao` / `12051992`
- Student: `Rahul Nair` / `20052005`

Admin login page:

```text
http://127.0.0.1:5173/#ladmin
```

## Backend

Create/load the MySQL database:

```bash
cd backend
npm install
copy .env.example .env
mysql -u root -p < schema.sql
npm run seed
npm run dev
```

API base URL:

```text
http://localhost:5000/api
```

## Main API Routes

- `POST /api/auth/login`
- `GET /api/public/courses`
- `POST /api/public/enquiries`
- `GET /api/me/dashboard`
- CRUD: `/api/users`, `/api/staff`, `/api/students`, `/api/courses`, `/api/classes`, `/api/enrollments`, `/api/attendance`, `/api/fees`, `/api/enquiries`, `/api/notifications`
- Class photos/videos: `/api/class_media` and public `/api/public/class-media`
- Upload staff/admin materials: `POST /api/uploads/materials`

All internal routes use JWT authentication and role-based middleware.
