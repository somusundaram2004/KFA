import { query } from './db.js'

let personPhotoColumnsReady
let siteContentTableReady

async function hasColumn(table, column) {
  const rows = await query('SELECT COUNT(*) total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [table, column])
  return rows[0].total > 0
}

export async function ensurePersonPhotoColumns() {
  if (!personPhotoColumnsReady) {
    personPhotoColumnsReady = (async () => {
      if (!(await hasColumn('students', 'photo_url'))) {
        await query('ALTER TABLE students ADD COLUMN photo_url VARCHAR(500) NULL')
      }
      if (!(await hasColumn('staff', 'photo_url'))) {
        await query('ALTER TABLE staff ADD COLUMN photo_url VARCHAR(500) NULL')
      }
      if (!(await hasColumn('staff', 'bio'))) {
        await query('ALTER TABLE staff ADD COLUMN bio TEXT NULL')
      }
    })()
  }
  return personPhotoColumnsReady
}

export async function ensureSiteContentTable() {
  if (!siteContentTableReady) {
    siteContentTableReady = query(
      'CREATE TABLE IF NOT EXISTS site_content (content_key VARCHAR(100) PRIMARY KEY, content_value JSON NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
    )
  }
  return siteContentTableReady
}
