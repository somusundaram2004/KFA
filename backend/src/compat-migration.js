import { pool, query } from './db.js'

async function hasTable(table) {
  const rows = await query('SELECT COUNT(*) total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [table])
  return rows[0].total > 0
}

async function hasColumn(table, column) {
  const rows = await query('SELECT COUNT(*) total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [table, column])
  return rows[0].total > 0
}

async function addColumn(table, column, definition) {
  if (await hasTable(table) && !(await hasColumn(table, column))) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

async function migrate() {
  if (!(await hasTable('branches'))) {
    await query('CREATE TABLE branches (id INT PRIMARY KEY AUTO_INCREMENT, branch_name VARCHAR(100), location VARCHAR(150), phone VARCHAR(15))')
  }
  if (!(await hasTable('payments'))) {
    await query('CREATE TABLE payments (id INT PRIMARY KEY AUTO_INCREMENT, fee_id INT, amount DECIMAL(10,2), payment_date DATE)')
  }
  if (!(await hasTable('notifications'))) {
    await query("CREATE TABLE notifications (id INT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(255), message TEXT, role ENUM('admin','staff','student','all'), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
  }
  if (!(await hasTable('enquiries'))) {
    await query('CREATE TABLE enquiries (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), phone VARCHAR(15), email VARCHAR(100), course_interested VARCHAR(100), message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
  }
  if (!(await hasTable('class_media'))) {
    await query("CREATE TABLE class_media (id INT PRIMARY KEY AUTO_INCREMENT, class_id INT NULL, title VARCHAR(150), media_type ENUM('photo','video') NOT NULL, media_url VARCHAR(500) NOT NULL, thumbnail_url VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
  }
  if (!(await hasTable('grade_exams'))) {
    await query('CREATE TABLE grade_exams (id INT PRIMARY KEY AUTO_INCREMENT, grade_id INT NOT NULL, exam_date DATE)')
  }
  if (!(await hasTable('university_exams'))) {
    await query('CREATE TABLE university_exams (id INT PRIMARY KEY AUTO_INCREMENT, university_program_id INT NOT NULL, exam_name VARCHAR(100), exam_date DATE)')
  }
  if (!(await hasTable('academic_results'))) {
    await query("CREATE TABLE academic_results (id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, grade_exam_id INT NULL, university_exam_id INT NULL, marks DECIMAL(5,2), grade VARCHAR(10), result_status ENUM('pass','fail'))")
  }
  if (!(await hasTable('site_content'))) {
    await query('CREATE TABLE site_content (content_key VARCHAR(100) PRIMARY KEY, content_value JSON NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)')
  }
  if (!(await hasTable('event_programs'))) {
    await query("CREATE TABLE event_programs (id INT PRIMARY KEY AUTO_INCREMENT, program_name VARCHAR(150) NOT NULL, event_date DATE NULL, event_time VARCHAR(50) NULL, venue VARCHAR(200) NULL, branch_id INT NULL, description TEXT NULL, status VARCHAR(30) DEFAULT 'planning', base_fee DECIMAL(10,2) DEFAULT 0, vehicle_charge DECIMAL(10,2) DEFAULT 0, extra_charge DECIMAL(10,2) DEFAULT 0, charge_notes TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
  }
  if (!(await hasTable('event_program_items'))) {
    await query('CREATE TABLE event_program_items (id INT PRIMARY KEY AUTO_INCREMENT, event_program_id INT NOT NULL, category VARCHAR(80) NULL, item_title VARCHAR(180) NOT NULL, item_notes TEXT NULL, display_order INT DEFAULT 0)')
  }
  if (!(await hasTable('event_program_teams'))) {
    await query('CREATE TABLE event_program_teams (id INT PRIMARY KEY AUTO_INCREMENT, event_program_id INT NOT NULL, team_name VARCHAR(120) NOT NULL, staff_id INT NULL, team_notes TEXT NULL)')
  }
  if (!(await hasTable('event_program_participants'))) {
    await query("CREATE TABLE event_program_participants (id INT PRIMARY KEY AUTO_INCREMENT, event_program_id INT NOT NULL, student_id INT NOT NULL, team_id INT NULL, class_id INT NULL, branch_id INT NULL, grade_id INT NULL, role_name VARCHAR(120) NULL, participation_status VARCHAR(30) DEFAULT 'selected', notes TEXT NULL)")
  }
  if (!(await hasTable('event_program_charges'))) {
    await query("CREATE TABLE event_program_charges (id INT PRIMARY KEY AUTO_INCREMENT, event_program_id INT NOT NULL, participant_id INT NULL, student_id INT NOT NULL, branch_id INT NULL, charge_type VARCHAR(80) NOT NULL, amount DECIMAL(10,2) DEFAULT 0, paid_amount DECIMAL(10,2) DEFAULT 0, due_amount DECIMAL(10,2) DEFAULT 0, status VARCHAR(30) DEFAULT 'pending', notes TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
  }

  for (const table of ['users', 'students', 'staff', 'classes', 'student_academics', 'fees']) {
    await addColumn(table, 'branch_id', 'INT NULL')
  }
  await addColumn('students', 'photo_url', 'VARCHAR(500) NULL')
  await addColumn('students', 'account_status', "VARCHAR(20) DEFAULT 'active'")
  await addColumn('staff', 'photo_url', 'VARCHAR(500) NULL')
  await addColumn('staff', 'bio', 'TEXT NULL')
  await addColumn('courses', 'description', 'TEXT NULL')
  await addColumn('courses', 'duration', 'VARCHAR(50) NULL')
  await addColumn('programs', 'description', 'TEXT NULL')
  await addColumn('programs', 'duration', 'VARCHAR(50) NULL')
  await addColumn('grade_levels', 'level_order', 'INT NOT NULL DEFAULT 0')
  await addColumn('grade_levels', 'description', 'TEXT NULL')
  await addColumn('university_programs', 'university_name', 'VARCHAR(100) NULL')
  await addColumn('university_programs', 'duration', 'VARCHAR(50) NULL')
  await addColumn('student_academics', 'status', "ENUM('active','completed','dropped') DEFAULT 'active'")
  await addColumn('fees', 'fee_type', 'VARCHAR(20) NULL')
  await addColumn('fees', 'course_id', 'INT NULL')
  await addColumn('fees', 'program_id', 'INT NULL')
  await addColumn('fees', 'grade_id', 'INT NULL')
  await addColumn('fees', 'university_program_id', 'INT NULL')
  await addColumn('fees', 'total_amount', 'DECIMAL(10,2) NULL')
  await addColumn('fees', 'paid_amount', 'DECIMAL(10,2) NULL')
  await addColumn('fees', 'due_amount', 'DECIMAL(10,2) NULL')
  await addColumn('fees', 'fee_frequency', "VARCHAR(20) DEFAULT 'monthly'")
  await addColumn('fees', 'billing_day', 'INT NULL')
  await addColumn('fees', 'due_day', 'INT NULL')
  await addColumn('attendance', 'day_of_week', 'VARCHAR(20) NULL')
  await addColumn('attendance', 'attendance_time', 'TIME NULL')

  await query('ALTER TABLE fees MODIFY status VARCHAR(20) NULL')

  const branchCount = await query('SELECT COUNT(*) total FROM branches')
  if (branchCount[0].total === 0) {
    await query(
      'INSERT INTO branches (branch_name, location, phone) VALUES (?, ?, ?), (?, ?, ?)',
      ['KFA Madambakkam Branch', 'Chennai - Madambakkam', '9999999999', 'KFA Guduvanchery Branch', 'Chennai - Guduvanchery', '8888888888'],
    )
  }

  await query('UPDATE users SET branch_id = 1 WHERE branch_id IS NULL')
  await query('UPDATE students SET branch_id = 1 WHERE branch_id IS NULL')
  await query('UPDATE staff SET branch_id = 1 WHERE branch_id IS NULL')
  await query('UPDATE classes SET branch_id = 1 WHERE branch_id IS NULL')
  console.log('Compatibility migration complete')
}

migrate().finally(() => pool.end())
