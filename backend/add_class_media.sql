USE kfa;

CREATE TABLE IF NOT EXISTS class_media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT,
    title VARCHAR(150),
    media_type ENUM('photo','video') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);
