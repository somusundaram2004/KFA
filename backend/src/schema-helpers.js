import { query } from './db.js'

let personPhotoColumnsReady
let siteContentTableReady
let eventProgramTablesReady
let attendanceDetailColumnsReady
let galleryTableReady
let academicDetailColumnsReady
let batchTablesReady

async function hasColumn(table, column) {
  const rows = await query('SELECT COUNT(*) total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [table, column])
  return rows[0].total > 0
}

export async function ensurePersonPhotoColumns() {
  if (!personPhotoColumnsReady) {
    personPhotoColumnsReady = (async () => {
      if (!(await hasColumn('users', 'branch_id'))) {
        await query('ALTER TABLE users ADD COLUMN branch_id INT NULL')
      }
      if (!(await hasColumn('students', 'branch_id'))) {
        await query('ALTER TABLE students ADD COLUMN branch_id INT NULL')
      }
      if (!(await hasColumn('staff', 'branch_id'))) {
        await query('ALTER TABLE staff ADD COLUMN branch_id INT NULL')
      }
      if (!(await hasColumn('students', 'photo_url'))) {
        await query('ALTER TABLE students ADD COLUMN photo_url VARCHAR(500) NULL')
      }
      if (!(await hasColumn('students', 'account_status'))) {
        await query("ALTER TABLE students ADD COLUMN account_status VARCHAR(20) DEFAULT 'active'")
      }
      if (!(await hasColumn('staff', 'photo_url'))) {
        await query('ALTER TABLE staff ADD COLUMN photo_url VARCHAR(500) NULL')
      }
      if (!(await hasColumn('staff', 'account_status'))) {
        await query("ALTER TABLE staff ADD COLUMN account_status VARCHAR(20) DEFAULT 'active'")
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

export async function ensureGalleryTable() {
  if (!galleryTableReady) {
    galleryTableReady = query(`CREATE TABLE IF NOT EXISTS gallery (
      id INT PRIMARY KEY AUTO_INCREMENT,
      image_url VARCHAR(500) NOT NULL,
      public_id VARCHAR(255),
      title VARCHAR(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`)
  }
  return galleryTableReady
}

export async function ensureFeeScheduleColumns() {
  if (!(await hasColumn('fees', 'fee_frequency'))) {
    await query("ALTER TABLE fees ADD COLUMN fee_frequency VARCHAR(20) DEFAULT 'monthly'")
  }
  if (!(await hasColumn('fees', 'billing_day'))) {
    await query('ALTER TABLE fees ADD COLUMN billing_day INT NULL')
  }
  if (!(await hasColumn('fees', 'due_day'))) {
    await query('ALTER TABLE fees ADD COLUMN due_day INT NULL')
  }
}

export async function ensureAttendanceDetailColumns() {
  if (!attendanceDetailColumnsReady) {
    attendanceDetailColumnsReady = (async () => {
      if (!(await hasColumn('attendance', 'day_of_week'))) {
        await query('ALTER TABLE attendance ADD COLUMN day_of_week VARCHAR(20) NULL')
      }
      if (!(await hasColumn('attendance', 'attendance_time'))) {
        await query('ALTER TABLE attendance ADD COLUMN attendance_time TIME NULL')
      }
    })()
  }
  return attendanceDetailColumnsReady
}

export async function ensureAcademicDetailColumns() {
  if (!academicDetailColumnsReady) {
    academicDetailColumnsReady = (async () => {
      if (!(await hasColumn('student_academics', 'academic_track'))) {
        await query("ALTER TABLE student_academics ADD COLUMN academic_track VARCHAR(40) DEFAULT 'regular'")
      }
      if (!(await hasColumn('student_academics', 'other_exam_name'))) {
        await query('ALTER TABLE student_academics ADD COLUMN other_exam_name VARCHAR(150) NULL')
      }
      await query(`CREATE TABLE IF NOT EXISTS exam_boards (
        id INT PRIMARY KEY AUTO_INCREMENT,
        board_name VARCHAR(150) NOT NULL,
        board_type VARCHAR(30) DEFAULT 'grade',
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`)
      if (!(await hasColumn('grade_exams', 'exam_board_id'))) {
        await query('ALTER TABLE grade_exams ADD COLUMN exam_board_id INT NULL')
      }
      if (!(await hasColumn('grade_exams', 'exam_board'))) {
        await query('ALTER TABLE grade_exams ADD COLUMN exam_board VARCHAR(80) NULL')
      }
      if (!(await hasColumn('grade_exams', 'exam_name'))) {
        await query('ALTER TABLE grade_exams ADD COLUMN exam_name VARCHAR(120) NULL')
      }
      if (!(await hasColumn('university_exams', 'exam_board_id'))) {
        await query('ALTER TABLE university_exams ADD COLUMN exam_board_id INT NULL')
      }
      if (!(await hasColumn('university_exams', 'exam_board'))) {
        await query('ALTER TABLE university_exams ADD COLUMN exam_board VARCHAR(80) NULL')
      }
    })()
  }
  return academicDetailColumnsReady
}

export async function ensureBatchTables() {
  if (!batchTablesReady) {
    batchTablesReady = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS batches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        batch_name VARCHAR(120) NOT NULL,
        batch_type VARCHAR(20) DEFAULT 'weekday',
        start_time TIME NULL,
        end_time TIME NULL,
        staff_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`)
      await query(`CREATE TABLE IF NOT EXISTS batch_students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        batch_id INT NOT NULL,
        student_id INT NOT NULL,
        enrollment_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`)
      if (!(await hasColumn('attendance', 'batch_id'))) {
        await query('ALTER TABLE attendance ADD COLUMN batch_id INT NULL')
      }
    })()
  }
  return batchTablesReady
}

export async function ensureEventProgramTables() {
  if (!eventProgramTablesReady) {
    eventProgramTablesReady = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS event_programs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        program_name VARCHAR(150) NOT NULL,
        event_date DATE NULL,
        event_time VARCHAR(50) NULL,
        venue VARCHAR(200) NULL,
        branch_id INT NULL,
        description TEXT NULL,
        status VARCHAR(30) DEFAULT 'planning',
        base_fee DECIMAL(10,2) DEFAULT 0,
        vehicle_charge DECIMAL(10,2) DEFAULT 0,
        extra_charge DECIMAL(10,2) DEFAULT 0,
        charge_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`)
      await query(`CREATE TABLE IF NOT EXISTS event_program_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        event_program_id INT NOT NULL,
        category VARCHAR(80) NULL,
        item_title VARCHAR(180) NOT NULL,
        item_notes TEXT NULL,
        display_order INT DEFAULT 0
      )`)
      await query(`CREATE TABLE IF NOT EXISTS event_program_teams (
        id INT PRIMARY KEY AUTO_INCREMENT,
        event_program_id INT NOT NULL,
        team_name VARCHAR(120) NOT NULL,
        staff_id INT NULL,
        team_notes TEXT NULL
      )`)
      await query(`CREATE TABLE IF NOT EXISTS event_program_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        event_program_id INT NOT NULL,
        student_id INT NOT NULL,
        team_id INT NULL,
        class_id INT NULL,
        branch_id INT NULL,
        grade_id INT NULL,
        role_name VARCHAR(120) NULL,
        participation_status VARCHAR(30) DEFAULT 'selected',
        notes TEXT NULL
      )`)
      await query(`CREATE TABLE IF NOT EXISTS event_program_charges (
        id INT PRIMARY KEY AUTO_INCREMENT,
        event_program_id INT NOT NULL,
        participant_id INT NULL,
        student_id INT NOT NULL,
        branch_id INT NULL,
        charge_type VARCHAR(80) NOT NULL,
        amount DECIMAL(10,2) DEFAULT 0,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        due_amount DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'pending',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`)
    })()
  }
  return eventProgramTablesReady
}
