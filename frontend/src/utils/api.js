export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'https://kfa-backend.onrender.com'
const API_URL = import.meta.env.VITE_API_URL || `${API_ORIGIN}/api`

function emit(name, detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }
}

export async function api(path, options = {}) {
  const { loadingMessage = 'Loading...', silentLoading = false, ...fetchOptions } = options
  const token = localStorage.getItem('kfa_token')
  const isFormData = fetchOptions.body instanceof FormData

  if (!silentLoading) {
    emit('kfa:loading-start', { message: loadingMessage })
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    })
    if (!response.ok) {
      let detail
      try {
        detail = await response.json()
      } catch {
        detail = {}
      }
      const error = new Error(detail.message || 'API request failed')
      error.status = response.status
      if (response.status === 401) {
        localStorage.removeItem('kfa_token')
        localStorage.removeItem('kfa_session')
        emit('kfa:auth-expired')
      }
      throw error
    }

    return response.json()
  } finally {
    if (!silentLoading) {
      emit('kfa:loading-end')
    }
  }
}

export function dobPassword(dateValue) {
  const [year, month, day] = dateValue.split('-')
  return `${day}${month}${year}`
}
