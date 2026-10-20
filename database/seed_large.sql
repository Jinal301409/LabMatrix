-- =====================================================================
-- LabMatrix  -  seed_large.sql   (BIG data set for the index experiment, MySQL 8)
-- Use this INSTEAD of seed.sql (both create admin@labmatrix.com, so load only one).
-- Run it ONCE, straight after schema.sql, on a fresh database:
--     mysql -u root -p -e "source database/schema.sql"
--     mysql -u root -p -e "source database/seed_large.sql"
--
-- What you get (enough rows to make index timing meaningful):
--   12 batches, 12 courses, 40 labs, 1 admin, 12 faculty, 6 technicians,
--   1200 students, 20,000 computers (only in the 24 Computer/Network/Research
--   labs, so 16 labs have none), 200 equipment, 15 software,
--   ~70,000 software installations, 1500 lab sessions,
--   ~150,000 attendance rows, 1500 bookings,
--   400 fault reports and the repair jobs for them.
--
-- Every demo user logs in with the password:  Password@123
--   admin@labmatrix.com | faculty1@labmatrix.edu | tech1@labmatrix.edu
--   student1@labmatrix.edu ... student1200@labmatrix.edu
-- (the hash below is the bcrypt hash of that password)
-- =====================================================================
USE LabMatrix;

-- "Recursive" queries below count 1,2,3... to generate rows. This raises
-- MySQL's safety limit on how many rounds they may run.
SET SESSION cte_max_recursion_depth = 1000000;
SET @pw = '$2b$10$PFPgEdSb67EDJs5Jdt7zLO9mmWKCXyOV97LJR83J3mAVWWHc4XIrK';


-- ---------------------------------------------------------------------
-- 1. Batches and courses
-- ---------------------------------------------------------------------
INSERT INTO batch (batch_name, branch, semester) VALUES
 ('CSE-3-A1','CSE',3), ('CSE-3-A2','CSE',3), ('CSE-5-A1','CSE',5), ('CSE-5-A2','CSE',5),
 ('IT-3-A1','IT',3),   ('IT-5-A1','IT',5),   ('ECE-3-A1','ECE',3), ('ECE-5-A1','ECE',5),
 ('EE-3-A1','EE',3),   ('EE-5-A1','EE',5),   ('ME-3-A1','ME',3),   ('CE-3-A1','CE',3);

INSERT INTO course (course_code, course_name, semester, credits) VALUES
 ('CS201','Data Structures',3,4),        ('CS203','Database Management Systems',4,4),
 ('CS205','Operating Systems',5,4),      ('CS207','Computer Networks',5,3),
 ('CS209','Software Engineering',6,3),   ('IT301','Web Technologies',5,3),
 ('EC201','Digital Electronics',3,4),    ('EC301','Embedded Systems',5,4),
 ('EE201','Circuit Analysis',3,3),       ('ME201','Thermodynamics',3,3),
 ('CE201','Surveying',3,3),              ('CS401','Machine Learning',7,4);

-- ---------------------------------------------------------------------
-- 2. Users: ids are handed out in this order, so each role gets a block
-- ---------------------------------------------------------------------
INSERT INTO app_user (full_name, email, password_hash, role, phone)
VALUES ('Lab Admin', 'admin@labmatrix.com', @pw, 'Admin', '9000000000');

INSERT INTO app_user (full_name, email, password_hash, role, phone)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 12)
SELECT CONCAT('Faculty Member ', i), CONCAT('faculty', i, '@labmatrix.edu'), @pw, 'Faculty',
       CONCAT('91000000', LPAD(i, 2, '0'))
FROM n;

INSERT INTO app_user (full_name, email, password_hash, role, phone)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 6)
SELECT CONCAT('Technician ', i), CONCAT('tech', i, '@labmatrix.edu'), @pw, 'Technician',
       CONCAT('92000000', LPAD(i, 2, '0'))
FROM n;

INSERT INTO app_user (full_name, email, password_hash, role, phone)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 1200)
SELECT CONCAT('Student ', i), CONCAT('student', i, '@labmatrix.edu'), @pw, 'Student',
       CONCAT('93', LPAD(i, 8, '0'))
FROM n;

-- Subtype rows: same user_id as app_user (shared primary key)
INSERT INTO faculty (user_id, employee_id, department, designation)
SELECT user_id, CONCAT('FAC', LPAD(user_id, 3, '0')),
       ELT(1 + MOD(user_id, 4), 'CSE', 'IT', 'ECE', 'EE'),
       ELT(1 + MOD(user_id, 3), 'Professor', 'Associate Professor', 'Assistant Professor')
FROM app_user WHERE role = 'Faculty';

INSERT INTO technician (user_id, employee_id, specialization)
SELECT user_id, CONCAT('TEC', LPAD(user_id, 3, '0')),
       ELT(1 + MOD(user_id, 3), 'Hardware', 'Networking', 'Electronics')
FROM app_user WHERE role = 'Technician';

-- Helper lookup tables: number the batches / faculty / technicians 0,1,2...
-- so rows can be spread evenly over them (MySQL's LIMIT cannot take a formula).
CREATE TEMPORARY TABLE tmp_batch AS SELECT batch_id AS id, ROW_NUMBER() OVER (ORDER BY batch_id) - 1 AS k FROM batch;
CREATE TEMPORARY TABLE tmp_fac  AS SELECT user_id AS id, ROW_NUMBER() OVER (ORDER BY user_id) - 1 AS k FROM faculty;
CREATE TEMPORARY TABLE tmp_tech AS SELECT user_id AS id, ROW_NUMBER() OVER (ORDER BY user_id) - 1 AS k FROM technician;

-- 1200 students spread evenly over the 12 batches
INSERT INTO student (user_id, enrollment_no, batch_id)
SELECT u.user_id, CONCAT('U', LPAD(u.user_id, 6, '0')), b.id
FROM app_user u JOIN tmp_batch b ON b.k = MOD(u.user_id, 12)
WHERE u.role = 'Student';

-- ---------------------------------------------------------------------
-- 3. Labs (40), each with a faculty in-charge
-- ---------------------------------------------------------------------
INSERT INTO lab (lab_name, building, floor, capacity, lab_type, in_charge_faculty_id)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 40)
SELECT CONCAT('Lab ', LPAD(i, 2, '0')),
       ELT(1 + MOD(i, 4), 'CSE Block', 'Electronics Block', 'Main Building', 'Research Wing'),
       MOD(i, 4),
       50 + MOD(i * 7, 60),                                   -- 50 to 109 seats
       ELT(1 + MOD(i, 5), 'Computer', 'Electronics', 'Network', 'Research', 'General'),
       f.id
FROM n JOIN tmp_fac f ON f.k = MOD(i, 12);

-- ---------------------------------------------------------------------
-- 4. Computers (20,000) and equipment (200)
-- ---------------------------------------------------------------------
-- the labs that actually hold computers (Computer, Network, Research types)
CREATE TEMPORARY TABLE tmp_complab AS
  SELECT lab_id AS id, ROW_NUMBER() OVER (ORDER BY lab_id) - 1 AS k
  FROM lab WHERE lab_type IN ('Computer', 'Network', 'Research');

-- Processor, RAM and OS use different "mod" cycles, so the combinations vary
INSERT INTO computer (lab_id, asset_number, processor, ram_gb, storage_gb,
                      operating_system, status, purchase_date, warranty_expiry)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 20000)
SELECT cl.id,
       CONCAT('PC-', LPAD(i, 5, '0')),
       ELT(1 + MOD(i, 3), 'Intel Core i5', 'Intel Core i7', 'AMD Ryzen 5'),
       ELT(1 + MOD(i, 4), 4, 8, 16, 32),
       ELT(1 + MOD(i, 5), 256, 512, 1024, 512, 256),
       ELT(1 + MOD(i, 5), 'Windows 11', 'Ubuntu 24.04', 'Windows 10', 'Ubuntu 22.04', 'Windows 11'),
       IF(MOD(i, 20) = 0, 'Retired', 'Working'),
       DATE_SUB(CURDATE(), INTERVAL 200 + MOD(i, 1500) DAY),
       DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 200 + MOD(i, 1500) DAY), INTERVAL 3 YEAR)
FROM n JOIN tmp_complab cl ON cl.k = MOD(i, 24);

INSERT INTO equipment (lab_id, asset_number, equipment_name, equipment_type, status,
                       purchase_date, warranty_expiry)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 200)
SELECT 1 + MOD(i, 40),
       CONCAT('EQ-', LPAD(i, 4, '0')),
       CONCAT(ELT(1 + MOD(i, 7), 'Projector', 'Printer', 'Router', 'Switch', 'Oscilloscope', 'UPS', 'Scanner'), ' ', i),
       ELT(1 + MOD(i, 7), 'Projector', 'Printer', 'Router', 'Switch', 'Oscilloscope', 'UPS', 'Other'),
       'Working',
       DATE_SUB(CURDATE(), INTERVAL 100 + MOD(i, 900) DAY),
       DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 100 + MOD(i, 900) DAY), INTERVAL 2 YEAR)
FROM n;

-- ---------------------------------------------------------------------
-- 5. Software (ids 1-10 unlimited seats, 11-15 limited) and installations
-- ---------------------------------------------------------------------
INSERT INTO software (software_name, version, vendor, license_type, total_licenses, license_expiry) VALUES
 ('Visual Studio Code','1.95','Microsoft','Open Source',NULL,NULL),
 ('Python','3.12','PSF','Open Source',NULL,NULL),
 ('MySQL Server','8.0','Oracle','Educational',NULL,NULL),
 ('MySQL Workbench','8.0','Oracle','Educational',NULL,NULL),
 ('Node.js','22','OpenJS','Open Source',NULL,NULL),
 ('Git','2.47','Git SCM','Open Source',NULL,NULL),
 ('Google Chrome','130','Google','Open Source',NULL,NULL),
 ('Wireshark','4.4','Wireshark Foundation','Open Source',NULL,NULL),
 ('GCC','13','GNU','Open Source',NULL,NULL),
 ('LibreOffice','24.8','TDF','Open Source',NULL,NULL),
 ('MATLAB','R2024b','MathWorks','Site License',200,DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
 ('AutoCAD','2025','Autodesk','Educational',200,DATE_ADD(CURDATE(), INTERVAL 45 DAY)),
 ('Cisco Packet Tracer','8.2','Cisco','Educational',200,DATE_ADD(CURDATE(), INTERVAL 200 DAY)),
 ('Xilinx Vivado','2024.1','AMD','Commercial',200,DATE_ADD(CURDATE(), INTERVAL 20 DAY)),
 ('Windows 11 Education','23H2','Microsoft','Site License',200,DATE_ADD(CURDATE(), INTERVAL 365 DAY));

-- Unlimited software on about a third of the computers each
INSERT INTO software_installation (computer_id, software_id, install_date)
SELECT c.computer_id, s.software_id,
       DATE_SUB(CURDATE(), INTERVAL MOD(c.computer_id, 150) DAY)
FROM computer c JOIN software s ON s.software_id <= 10
WHERE MOD(c.computer_id + s.software_id, 3) = 0;

-- Limited software: 150 computers each (under the 200-seat limit)
INSERT INTO software_installation (computer_id, software_id, install_date)
SELECT c.computer_id, s.software_id, DATE_SUB(CURDATE(), INTERVAL MOD(c.computer_id, 90) DAY)
FROM computer c JOIN software s ON s.software_id BETWEEN 11 AND 15
WHERE c.computer_id <= 150;

-- ---------------------------------------------------------------------
-- 6. Lab sessions (1500) and attendance (about 150,000 rows)
-- ---------------------------------------------------------------------
INSERT INTO lab_session (lab_id, faculty_id, course_id, batch_id, session_date,
                         start_time, end_time, topic)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 1500)
SELECT 1 + MOD(i, 40),
       f.id,
       1 + MOD(i, 12),
       1 + MOD(i, 12),
       DATE_SUB(CURDATE(), INTERVAL MOD(i, 240) DAY),
       MAKETIME(9 + MOD(i, 6), 0, 0),
       MAKETIME(11 + MOD(i, 6), 0, 0),
       CONCAT('Practical ', i)
FROM n JOIN tmp_fac f ON f.k = MOD(i, 12);

-- every student of the session's batch gets a row: mostly Present, some Late/Absent
INSERT INTO attendance (student_id, session_id, status)
SELECT st.user_id, ls.session_id,
       CASE WHEN MOD(ls.session_id * 7 + st.user_id * 13, 10) < 8 THEN 'Present'
            WHEN MOD(ls.session_id * 7 + st.user_id * 13, 10) = 8 THEN 'Late'
            ELSE 'Absent' END
FROM lab_session ls
JOIN student st ON st.batch_id = ls.batch_id;

-- ---------------------------------------------------------------------
-- 7. Bookings (1500). Approved ones get a different day per lab, so the
--    "no overlapping approved bookings" trigger never fires on seed data.
-- ---------------------------------------------------------------------
INSERT INTO lab_booking (lab_id, faculty_id, start_datetime, end_datetime, purpose,
                         status, approved_by)
WITH RECURSIVE n AS (SELECT 0 AS i UNION ALL SELECT i+1 FROM n WHERE i < 1499)
SELECT 1 + MOD(i, 40),
       f.id,
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL FLOOR(i / 40) - 20 DAY), '09:00:00'),
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL FLOOR(i / 40) - 20 DAY), '12:00:00'),
       CONCAT('Extra practical / workshop ', i),
       ELT(1 + MOD(i, 4), 'Approved', 'Pending', 'Rejected', 'Cancelled'),
       IF(MOD(i, 4) IN (0, 2), 1, NULL)
FROM n JOIN tmp_fac f ON f.k = MOD(i, 12);

-- ---------------------------------------------------------------------
-- 8. Fault reports (400) and repair jobs
--    Inserted as Open first (the trigger marks the item Under Maintenance),
--    then some are resolved (the trigger puts the item back to Working).
-- ---------------------------------------------------------------------
INSERT INTO maintenance_request (computer_id, equipment_id, reported_by, description, priority, status)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 400)
SELECT IF(i <= 300, 1 + MOD(i * 7, 120), NULL),      -- first 120 computers get repeat faults
       IF(i <= 300, NULL, 1 + MOD(i, 200)),
       f.id,
       ELT(1 + MOD(i, 5), 'Does not boot', 'Screen flickering', 'Keyboard not working',
                          'Network not connecting', 'Overheating and shutting down'),
       ELT(1 + MOD(i, 3), 'Low', 'Medium', 'High'),
       'Open'
FROM n JOIN tmp_fac f ON f.k = MOD(i, 12);

UPDATE maintenance_request SET status = 'Resolved' WHERE MOD(request_id, 3) = 0;
UPDATE maintenance_request SET status = 'In Progress' WHERE MOD(request_id, 3) = 1 AND MOD(request_id, 2) = 0;
UPDATE maintenance_request SET status = 'Assigned' WHERE MOD(request_id, 3) = 2 AND MOD(request_id, 2) = 0;

INSERT INTO maintenance (request_id, technician_id, start_date, end_date, cost, status, remarks)
SELECT r.request_id,
       t.id,
       DATE_SUB(CURDATE(), INTERVAL MOD(r.request_id, 60) DAY),
       IF(r.status = 'Resolved', DATE_SUB(CURDATE(), INTERVAL MOD(r.request_id, 60) - 2 DAY), NULL),
       IF(r.status = 'Resolved', 200 + MOD(r.request_id * 37, 4800), 0),
       CASE r.status WHEN 'Resolved' THEN 'Completed' WHEN 'In Progress' THEN 'In Progress' ELSE 'Assigned' END,
       'Seeded repair job'
FROM maintenance_request r
JOIN tmp_tech t ON t.k = MOD(r.request_id, 6)
WHERE r.status IN ('Assigned', 'In Progress', 'Resolved');

-- ---------------------------------------------------------------------
-- Quick check: row count per table
-- ---------------------------------------------------------------------
SELECT 'batch' AS tbl, COUNT(*) AS total_rows FROM batch UNION ALL
SELECT 'course', COUNT(*) FROM course UNION ALL
SELECT 'app_user', COUNT(*) FROM app_user UNION ALL
SELECT 'student', COUNT(*) FROM student UNION ALL
SELECT 'faculty', COUNT(*) FROM faculty UNION ALL
SELECT 'technician', COUNT(*) FROM technician UNION ALL
SELECT 'lab', COUNT(*) FROM lab UNION ALL
SELECT 'computer', COUNT(*) FROM computer UNION ALL
SELECT 'equipment', COUNT(*) FROM equipment UNION ALL
SELECT 'software', COUNT(*) FROM software UNION ALL
SELECT 'software_installation', COUNT(*) FROM software_installation UNION ALL
SELECT 'lab_session', COUNT(*) FROM lab_session UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance UNION ALL
SELECT 'lab_booking', COUNT(*) FROM lab_booking UNION ALL
SELECT 'maintenance_request', COUNT(*) FROM maintenance_request UNION ALL
SELECT 'maintenance', COUNT(*) FROM maintenance;
