USE kfa;

CREATE TABLE IF NOT EXISTS programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    fees DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS grade_levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_name VARCHAR(50) NOT NULL,
    level_order INT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS university_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    university_name VARCHAR(100),
    duration VARCHAR(50),
    fees DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS student_academics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    program_id INT NULL,
    grade_id INT NULL,
    university_program_id INT NULL,
    start_date DATE,
    status ENUM('active','completed','dropped') DEFAULT 'active',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (university_program_id) REFERENCES university_programs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS grade_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_id INT NOT NULL,
    exam_date DATE,
    FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS university_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    university_program_id INT NOT NULL,
    exam_name VARCHAR(100),
    exam_date DATE,
    FOREIGN KEY (university_program_id) REFERENCES university_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    grade_exam_id INT NULL,
    university_exam_id INT NULL,
    marks DECIMAL(5,2),
    grade VARCHAR(10),
    result_status ENUM('pass','fail'),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (grade_exam_id) REFERENCES grade_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (university_exam_id) REFERENCES university_exams(id) ON DELETE CASCADE
);
