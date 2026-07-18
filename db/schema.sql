CREATE DATABASE IF NOT EXISTS cmms_db;
USE cmms_db;

CREATE TABLE IF NOT EXISTS Students ( 
    student_id INT PRIMARY KEY AUTO_INCREMENT, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL, 
    password VARCHAR(100) NOT NULL, 
    department VARCHAR(100) NOT NULL
); 

CREATE TABLE IF NOT EXISTS Administrators ( 
    admin_id INT PRIMARY KEY AUTO_INCREMENT, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL, 
    password VARCHAR(100) NOT NULL
); 

CREATE TABLE IF NOT EXISTS Maintenance_Staff ( 
    staff_id INT PRIMARY KEY AUTO_INCREMENT, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL, 
    phone VARCHAR(20) NOT NULL
); 

CREATE TABLE IF NOT EXISTS Complaints ( 
    complaint_id INT PRIMARY KEY AUTO_INCREMENT, 
    student_id INT NOT NULL, 
    category VARCHAR(50) NOT NULL, 
    location VARCHAR(100) NOT NULL, 
    description TEXT NOT NULL, 
    status VARCHAR(50) DEFAULT 'Pending', 
    date_submitted DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
); 

CREATE TABLE IF NOT EXISTS Assignments ( 
    assignment_id INT PRIMARY KEY AUTO_INCREMENT, 
    complaint_id INT NOT NULL, 
    staff_id INT NOT NULL, 
    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (complaint_id) REFERENCES Complaints(complaint_id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES Maintenance_Staff(staff_id) ON DELETE CASCADE
);

-- ==========================================
-- Starter Seed Data (For testing local dev)
-- ==========================================
INSERT IGNORE INTO Administrators (admin_id, name, email, password) VALUES (1, 'Admin', 'admin@campus.edu', '123');
INSERT IGNORE INTO Maintenance_Staff (staff_id, name, email, password, department, phone) VALUES 
(1, 'Mike', 'mike@campus.edu', '123', 'Electrical', '9874563210'),
(2, 'Sarah', 'sarah@campus.edu', '123', 'Plumbing', '8569741230'),
(3, 'David', 'david@campus.edu', '123', 'IT', '7845963210');
