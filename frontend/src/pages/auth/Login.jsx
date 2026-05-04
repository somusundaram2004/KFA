import { useState } from 'react'

export default function Login({ title, roleScope, onLogin, navigate, admin = false }) {
  const [form, setForm] = useState({ name: '', password: '' })
  return (
    <main className={admin ? 'auth-page admin-auth' : 'auth-page'}>
      <form className="login-panel" onSubmit={(event) => {
        event.preventDefault()
        onLogin({ ...form, roleScope })
      }}>
        <span className="eyebrow">{admin ? 'Administrator access' : 'Secure ERP access'}</span>
        <h1>{title}</h1>
        <p className="auth-note">Login with your name and DOB password without slashes.</p>
        <input required placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required type="password" inputMode="numeric" placeholder="DOB password DDMMYYYY" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <button className="primary">Login</button>
        {!admin && <button type="button" onClick={() => navigate?.('register-student')}>New student registration</button>}
        <p className="hint">{admin ? 'Example: Admin / 01011980' : 'Example: Ravi / 15061990 or Arjun / 20052005'}</p>
      </form>
    </main>
  )
}
