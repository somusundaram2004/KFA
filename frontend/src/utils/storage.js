import { seed } from '../data/seed'

const demoGalleryTitles = new Set([
  'Vocal practice session',
  'Keyboard class training',
  'Performance video',
  'Carnatic vocal practice',
  'Keyboard class session',
  'Student performance reel',
])

function cleanDemoGalleryItems(store) {
  if (!Array.isArray(store.class_media)) return store
  return {
    ...store,
    class_media: store.class_media.filter((item) => !demoGalleryTitles.has(item.title)),
  }
}

export function getStore() {
  const existing = localStorage.getItem('kfa_erp_demo')
  if (existing) {
    const parsed = cleanDemoGalleryItems(JSON.parse(existing))
    const next = Object.fromEntries(Object.entries(seed).map(([key, value]) => [key, parsed[key] || value]))
    localStorage.setItem('kfa_erp_demo', JSON.stringify(next))
    return next
  }
  localStorage.setItem('kfa_erp_demo', JSON.stringify(seed))
  return seed
}

export function saveStore(next) {
  localStorage.setItem('kfa_erp_demo', JSON.stringify(next))
}
