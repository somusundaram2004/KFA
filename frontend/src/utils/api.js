export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'https://kfa-backend.onrender.com'
const API_URL = import.meta.env.VITE_API_URL || `${API_ORIGIN}/api`

export async function api(path, options = {}) {
  const token = localStorage.getItem('kfa_token')
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!response.ok) throw new Error('API request failed')
  return response.json()
}

export function dobPassword(dateValue) {
  const [year, month, day] = dateValue.split('-')
  return `${day}${month}${year}`
}
