CREATE TABLE IF NOT EXISTS event_programs (
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
);

CREATE TABLE IF NOT EXISTS event_program_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_program_id INT NOT NULL,
  category VARCHAR(80) NULL,
  item_title VARCHAR(180) NOT NULL,
  item_notes TEXT NULL,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_program_teams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_program_id INT NOT NULL,
  team_name VARCHAR(120) NOT NULL,
  staff_id INT NULL,
  team_notes TEXT NULL
);

CREATE TABLE IF NOT EXISTS event_program_participants (
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
);

CREATE TABLE IF NOT EXISTS event_program_charges (
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
);
