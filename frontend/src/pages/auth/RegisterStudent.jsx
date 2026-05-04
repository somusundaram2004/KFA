import { useState } from 'react'

export default function RegisterStudent({ branches, onRegister, navigate }) {
  const [form, setForm] = useState({ name: '', dob: '', email: '', phone: '', parent_name: '', branch_id: '' })

  return (
    <main className="auth-page">
      <form className="login-panel register-panel" onSubmit={(event) => {
        event.preventDefault()
        onRegister(form)
      }}>
        <span className="eyebrow">Student registration</span>
        <h1>Create Student Account</h1>
        <p className="auth-note">After registration, admin must activate your account. Then login with student name and DOB password in DDMMYYYY format.</p>
        <input required placeholder="Student Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required type="date" value={form.dob} onChange={(event) => setForm({ ...form, dob: event.target.value })} />
        <input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <input placeholder="Parent Name" value={form.parent_name} onChange={(event) => setForm({ ...form, parent_name: event.target.value })} />
        <select value={form.branch_id} onChange={(event) => setForm({ ...form, branch_id: event.target.value })}>
          <option value="">Select Branch</option>
          {(branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
        </select>
        <button className="primary">Register</button>
        <button type="button" onClick={() => navigate('login')}>Already registered? Login</button>
      </form>
    </main>
  )
}
