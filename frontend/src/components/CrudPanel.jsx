import { useMemo, useState } from 'react'

export default function CrudPanel({ title, fields, onSubmit }) {
  const initial = useMemo(() => Object.fromEntries(fields.map((field) => [field, field === 'date' ? new Date().toISOString().slice(0, 10) : ''])), [fields])
  const [form, setForm] = useState(initial)
  return (
    <form className="panel form-grid" onSubmit={(event) => {
      event.preventDefault()
      onSubmit(form)
      setForm(initial)
    }}>
      <h3>{title}</h3>
      {fields.map((field) => (
        <input key={field} required placeholder={field.replaceAll('_', ' ')} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
      ))}
      <button className="primary">Save</button>
    </form>
  )
}
