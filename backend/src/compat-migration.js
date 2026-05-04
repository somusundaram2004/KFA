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

  for (const table of ['users', 'students', 'staff', 'classes', 'student_academics', 'fees']) {
    await addColumn(table, 'branch_id', 'INT NULL')
  }
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
