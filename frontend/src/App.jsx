import { useEffect, useState } from 'react'
import AnimatedBackground from './components/AnimatedBackground'
import Header from './components/Header'
import { API_ORIGIN, api, dobPassword } from './utils/api'
import { getStore, saveStore } from './utils/storage'
import Landing from './pages/public/Landing'
import EnquiryPage from './pages/public/EnquiryPage'
import Login from './pages/auth/Login'
import RegisterStudent from './pages/auth/RegisterStudent'
import AdminDashboard from './pages/admin pages/Dashboard'
import StaffDashboard from './pages/staff pages/Dashboard'
import StudentDashboard from './pages/student pages/Dashboard'
import AccessDenied from './pages/AccessDenied'
import './App.css'

function App() {
  const [page, setPage] = useState(location.hash.replace('#', '') || 'home')
  const [data, setData] = useState(getStore)
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('kfa_session') || 'null'))
  const [toast, setToast] = useState('')
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  useEffect(() => {
    const onHash = () => setPage(location.hash.replace('#', '') || 'home')
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    Promise.all([
      api('/public/courses'),
      api('/public/branches'),
      api('/public/classes'),
      api('/public/class-media'),
      api('/public/staff'),
      api('/public/site-content'),
    ])
      .then(([courses, branches, classes, classMedia, staff, siteContent]) => {
        updateData((current) => ({ ...current, courses, branches, classes, class_media: classMedia, staff, site_content: siteContent }))
      })
      .catch(() => {})
  }, [])

  function navigate(next) {
    setAdminMenuOpen(false)
    location.hash = next
    setPage(next)
    scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateData(updater) {
    setData((current) => {
      const next = updater(current)
      saveStore(next)
      return next
    })
  }

  function notify(message) {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  async function refreshDashboardData() {
    const dashboard = await api('/me/dashboard')
    updateData((current) => ({ ...current, ...dashboard }))
  }

  function withDisplayFields(record, source) {
    const branch = source.branches?.find((item) => Number(item.id) === Number(record.branch_id))
    const student = source.students?.find((item) => Number(item.id) === Number(record.student_id))
    const staff = source.staff?.find((item) => Number(item.id) === Number(record.staff_id))
    const course = source.courses?.find((item) => Number(item.id) === Number(record.course_id))
    const program = source.programs?.find((item) => Number(item.id) === Number(record.program_id))
    const grade = source.grade_levels?.find((item) => Number(item.id) === Number(record.grade_id))
    const universityProgram = source.university_programs?.find((item) => Number(item.id) === Number(record.university_program_id))
    const classRow = source.classes?.find((item) => Number(item.id) === Number(record.class_id))
    const fee = source.fees?.find((item) => Number(item.id) === Number(record.fee_id))
    const gradeExam = source.grade_exams?.find((item) => Number(item.id) === Number(record.grade_exam_id))
    const universityExam = source.university_exams?.find((item) => Number(item.id) === Number(record.university_exam_id))
    const eventProgram = source.event_programs?.find((item) => Number(item.id) === Number(record.event_program_id))
    const eventTeam = source.event_program_teams?.find((item) => Number(item.id) === Number(record.team_id))
    const eventParticipant = source.event_program_participants?.find((item) => Number(item.id) === Number(record.participant_id))

    const next = { ...record }
    if (branch) next.branch_name = branch.branch_name
    if (student) next.student_name = student.name || student.student_name
    if (staff) next.staff_name = staff.name || staff.staff_name
    if (course) next.course_name = course.course_name
    if (program) next.program_name = program.program_name
    if (grade) next.grade_name = grade.grade_name
    if (universityProgram) next.university_program_name = universityProgram.program_name
    if (classRow) {
      next.course_name ||= classRow.course_name
      next.branch_name ||= classRow.branch_name
    }
    if (fee) {
      next.student_name ||= fee.student_name
      next.fee_type ||= fee.fee_type
    }
    if (gradeExam) next.grade_name ||= gradeExam.grade_name
    if (universityExam) {
      next.exam_name ||= universityExam.exam_name
      next.university_program_name ||= universityExam.university_program_name
    }
    if (eventProgram) next.program_name = eventProgram.program_name
    if (eventTeam) next.team_name = eventTeam.team_name
    if (eventParticipant) {
      next.student_name ||= eventParticipant.student_name
      next.class_id ||= eventParticipant.class_id
      next.course_name ||= eventParticipant.course_name
      next.grade_name ||= eventParticipant.grade_name
      next.team_name ||= eventParticipant.team_name
    }
    return next
  }

  async function handleEnquiry(form) {
    const record = { id: Date.now(), ...form, created_at: new Date().toISOString() }
    try {
      await api('/public/enquiries', { method: 'POST', body: JSON.stringify(form) })
    } catch {
      updateData((current) => ({ ...current, enquiries: [record, ...current.enquiries] }))
    }
    notify('Enquiry submitted. Admin can view it in the ERP.')
  }

  async function handleStudentRegister(form) {
    try {
      await api('/auth/register-student', { method: 'POST', body: JSON.stringify(form) })
      notify('Registered successfully. Admin must activate your login.')
      navigate('login')
    } catch (error) {
      console.warn('[APP] Student registration failed', error)
      notify('Registration failed. Student may already exist.')
    }
  }

  async function handleLogin({ name, password, roleScope }) {
    console.log('[LOGIN UI] Submit', { name, roleScope, passwordLength: password.length })
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) })
      console.log('[LOGIN UI] API login success', result.user)
      if (roleScope === 'admin' && result.user.role !== 'admin') {
        notify('This page is only for admin login.')
        console.warn('[LOGIN UI] Non-admin tried admin login page', result.user)
        return
      }
      if (roleScope === 'portal' && result.user.role === 'admin') {
        notify('Admin must login from the admin page.')
        console.warn('[LOGIN UI] Admin tried staff/student page')
        return
      }
      localStorage.setItem('kfa_token', result.token)
      localStorage.setItem('kfa_session', JSON.stringify(result.user))
      setSession(result.user)
      try {
        await refreshDashboardData()
      } catch (dashboardError) {
        console.warn('[LOGIN UI] Dashboard fetch failed, keeping local data', dashboardError)
      }
      navigate(`${result.user.role}-dashboard`)
      return
    } catch (error) {
      if (error.status === 403) {
        notify(error.message || 'Student account is waiting for admin activation.')
        return
      }
      console.warn('[LOGIN UI] API login failed, trying local demo data', error)
      const user = data.users.find((item) => item.name.toLowerCase() === name.toLowerCase() && dobPassword(item.dob) === password)
      if (!user || (roleScope === 'admin' && user.role !== 'admin') || (roleScope === 'portal' && user.role === 'admin')) {
        console.warn('[LOGIN UI] Local demo login failed', { name, roleScope, localUserFound: Boolean(user) })
        notify('Invalid login. Use Name as username and DOB as DDMMYYYY password.')
        return
      }
      console.log('[LOGIN UI] Local demo login success', user)
      localStorage.setItem('kfa_session', JSON.stringify(user))
      setSession(user)
      navigate(`${user.role}-dashboard`)
    }
  }

  function logout() {
    localStorage.removeItem('kfa_session')
    localStorage.removeItem('kfa_token')
    setSession(null)
    navigate('home')
  }

  async function addRecord(type, record) {
    const localRecord = { id: Date.now(), ...record }
    try {
      const path = type === 'students' ? '/students/full' : type === 'staff' ? '/staff/full' : `/${type}`
      const saved = await api(path, { method: 'POST', body: JSON.stringify(record) })
      const savedRecord = withDisplayFields({ ...record, ...saved }, data)
      if (type === 'class_media' && savedRecord.media_url?.startsWith('/uploads')) {
        savedRecord.media_url = `${API_ORIGIN}${savedRecord.media_url}`
      } else if (type === 'class_media' && savedRecord.media_url?.startsWith('http://localhost:5000')) {
        savedRecord.media_url = savedRecord.media_url.replace('http://localhost:5000', API_ORIGIN)
      }
      updateData((current) => ({ ...current, [type]: [savedRecord, ...(current[type] || [])] }))
      try {
        await refreshDashboardData()
      } catch (refreshError) {
        console.warn('[APP] Dashboard refresh failed after save', refreshError)
      }
    } catch (error) {
      console.warn('[APP] API save failed, saving locally', error)
      updateData((current) => ({ ...current, [type]: [withDisplayFields(localRecord, current), ...(current[type] || [])] }))
    }
    notify('Saved successfully.')
  }

  async function updateRecord(type, id, record) {
    try {
      const path = type === 'students' ? `/students/full/${id}` : type === 'staff' ? `/staff/full/${id}` : `/${type}/${id}`
      await api(path, { method: 'PUT', body: JSON.stringify(record) })
      await refreshDashboardData()
    } catch (error) {
      console.warn('[APP] API update failed, updating locally', error)
    }
    updateData((current) => ({
      ...current,
      [type]: (current[type] || []).map((item) => Number(item.id) === Number(id) ? withDisplayFields({ ...item, ...record, id }, current) : item),
    }))
    notify('Updated successfully.')
  }

  async function deleteRecord(type, id) {
    try {
      await api(`/${type}/${id}`, { method: 'DELETE' })
      await refreshDashboardData()
    } catch (error) {
      console.warn('[APP] API delete failed, deleting locally', error)
    }
    updateData((current) => ({
      ...current,
      [type]: (current[type] || []).filter((item) => Number(item.id) !== Number(id)),
    }))
    notify('Deleted successfully.')
  }

  async function updateSiteContent(siteContent) {
    try {
      const saved = await api('/site-content/homepage', { method: 'PUT', body: JSON.stringify(siteContent) })
      updateData((current) => ({ ...current, site_content: saved }))
    } catch (error) {
      console.warn('[APP] Site content save failed, updating locally', error)
      updateData((current) => ({ ...current, site_content: siteContent }))
    }
    notify('Site content updated successfully.')
  }

  async function importStudents(file) {
    const formData = new FormData()
    formData.append('file', file)
    const result = await api('/students/import', { method: 'POST', body: formData })
    await refreshDashboardData()
    notify(`Imported ${result.created} students. Skipped ${result.skipped}.`)
    return result
  }

  function markAttendance(record) {
    const classRow = data.classes.find((item) => Number(item.id) === Number(record.class_id))
    addRecord('attendance', {
      ...record,
      student_name: data.students.find((student) => Number(student.id) === Number(record.student_id))?.name || 'Student',
      course_name: classRow?.course_name || 'Class',
      branch_name: classRow?.branch_name,
      day_of_week: record.day_of_week || classRow?.day_of_week || new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
      attendance_time: record.attendance_time || classRow?.start_time || new Date().toTimeString().slice(0, 5),
    })
  }

  const currentRole = session?.role
  const protectedPage = page.includes('dashboard') && !session
  const visiblePage = protectedPage ? 'login' : page

  return (
    <div className="app-shell">
      <AnimatedBackground />
      {toast && <div className="toast">{toast}</div>}
      <Header
        session={session}
        navigate={navigate}
        logout={logout}
        showAdminMenu={visiblePage === 'admin-dashboard'}
        adminMenuOpen={adminMenuOpen}
        onAdminMenuClick={() => setAdminMenuOpen((open) => !open)}
      />
      {visiblePage === 'home' && <Landing data={data} navigate={navigate} onEnquiry={handleEnquiry} />}
      {visiblePage === 'enquiry' && <EnquiryPage onSubmit={handleEnquiry} />}
      {visiblePage === 'register-student' && <RegisterStudent branches={data.branches} onRegister={handleStudentRegister} navigate={navigate} />}
      {(visiblePage === 'ladmin' || visiblePage === 'admin-login') && <Login title="Admin Login" roleScope="admin" onLogin={handleLogin} navigate={navigate} admin />}
      {visiblePage === 'login' && <Login title="Staff and Student Login" roleScope="portal" onLogin={handleLogin} navigate={navigate} />}
      {visiblePage === 'admin-dashboard' && currentRole === 'admin' && <AdminDashboard data={data} addRecord={addRecord} updateRecord={updateRecord} deleteRecord={deleteRecord} updateSiteContent={updateSiteContent} importStudents={importStudents} sidebarOpen={adminMenuOpen} setSidebarOpen={setAdminMenuOpen} />}
      {visiblePage === 'staff-dashboard' && currentRole === 'staff' && <StaffDashboard data={data} session={session} markAttendance={markAttendance} addRecord={addRecord} updateRecord={updateRecord} />}
      {visiblePage === 'student-dashboard' && currentRole === 'student' && <StudentDashboard data={data} session={session} addRecord={addRecord} />}
      {visiblePage.includes('dashboard') && session && !visiblePage.startsWith(currentRole) && <AccessDenied navigate={navigate} role={currentRole} />}
    </div>
  )
}

export default App
