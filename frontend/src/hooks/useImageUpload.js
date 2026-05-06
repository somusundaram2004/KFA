const API_URL =
  import.meta.env.REACT_APP_API_URL ||
  import.meta.env.VITE_API_URL ||
  `${import.meta.env.VITE_API_ORIGIN || 'https://kfa-backend.onrender.com'}/api`

async function parseResponse(response) {
  if (!response.ok) {
    let detail
    try {
      detail = await response.json()
    } catch {
      detail = {}
    }
    throw new Error(detail.message || 'Image request failed')
  }

  return response.json()
}

function withFallbackImage(item) {
  return {
    ...item,
    image_url: item.image_url || '/default-avatar.png',
  }
}

function authHeaders() {
  const token = localStorage.getItem('kfa_token') || localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function useImageUpload(endpoint) {
  const baseEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const collectionEndpoint = baseEndpoint.replace(/\/:id\/image$/, '')

  async function upload(file, extraFields = {}) {
    const formData = new FormData()
    formData.append('image', file)

    Object.entries(extraFields).forEach(([key, value]) => {
      if (!['id', 'method'].includes(key) && value !== undefined && value !== null) {
        formData.append(key, value)
      }
    })

    const method = extraFields.method || (baseEndpoint.includes('/:id') ? 'PUT' : 'POST')
    const targetEndpoint = extraFields.id
      ? baseEndpoint.replace(':id', extraFields.id)
      : baseEndpoint

    return parseResponse(await fetch(`${API_URL}${targetEndpoint}`, {
      method,
      headers: authHeaders(),
      body: formData,
    }))
  }

  async function fetchAll() {
    const rows = await parseResponse(await fetch(`${API_URL}${collectionEndpoint}`, {
      headers: authHeaders(),
    }))
    return Array.isArray(rows) ? rows.map(withFallbackImage) : rows
  }

  async function remove(id) {
    return parseResponse(await fetch(`${API_URL}${collectionEndpoint}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }))
  }

  return { upload, fetchAll, remove }
}
