import { useState } from 'react'

export default function InlineEnquiry({ onSubmit }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', course_interested: '', message: '' })
  return (
    <form className="panel form-grid" onSubmit={(event) => {
      event.preventDefault()
      onSubmit(form)
      setForm({ name: '', phone: '', email: '', course_interested: '', message: '' })
    }}>
      <h3>Quick enquiry</h3>
      {['name', 'phone', 'email', 'course_interested'].map((field) => (
        <input key={field} required placeholder={field.replace('_', ' ')} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
      ))}
      <textarea required placeholder="Message" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
      <button className="primary">Submit</button>
    </form>
  )
}
