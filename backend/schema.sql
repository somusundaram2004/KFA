CREATE DATABASE IF NOT EXISTS kfa;
USE kfa;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_notifications;
DROP TABLE IF EXISTS academic_results;
DROP TABLE IF EXISTS university_exams;
DROP TABLE IF EXISTS grade_exams;
DROP TABLE IF EXISTS student_academics;
DROP TABLE IF EXISTS university_programs;
DROP TABLE IF EXISTS grade_levels;
DROP TABLE IF EXISTS programs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS class_media;
DROP TABLE IF EXISTS enquiries;
DROP TABLE IF EXISTS fees;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff', 'student') NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    specialization VARCHAR(100),
    salary DECIMAL(10,2),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    admission_date DATE,
    parent_name VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_name VARCHAR(100) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    fees DECIMAL(10,2)
);

CREATE TABLE programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    fees DECIMAL(10,2)
);

CREATE TABLE grade_levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_name VARCHAR(50) NOT NULL,
    level_order INT NOT NULL,
    description TEXT
);

CREATE TABLE university_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    university_name VARCHAR(100),
    duration VARCHAR(50),
    fees DECIMAL(10,2)
);

CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    staff_id INT,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    start_time TIME,
    end_time TIME,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_date DATE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE student_academics (
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

CREATE TABLE grade_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_id INT NOT NULL,
    exam_date DATE,
    FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE CASCADE
);

CREATE TABLE university_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    university_program_id INT NOT NULL,
    exam_name VARCHAR(100),
    exam_date DATE,
    FOREIGN KEY (university_program_id) REFERENCES university_programs(id) ON DELETE CASCADE
);

CREATE TABLE academic_results (
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

CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    date DATE,
    status ENUM('present', 'absent'),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE fees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    amount DECIMAL(10,2),
    payment_date DATE,
    status ENUM('paid', 'pending'),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE enquiries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    course_interested VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    message TEXT,
    role ENUM('admin','staff','student','all'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE class_media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT,
    title VARCHAR(150),
    media_type ENUM('photo','video') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE TABLE user_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_id INT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);
