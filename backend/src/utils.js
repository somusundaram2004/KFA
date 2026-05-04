export function dobToPassword(dateValue) {
  const date = new Date(dateValue)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}${month}${year}`
}

export function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? null]))
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}
