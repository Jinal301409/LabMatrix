USE LabMatrix;
SET @pw = '$2b$10$Ip72rqVUFGhkH2SsFOJlye25hATaUDFqzC7OhPWU0YIFl6JF91TC.';

INSERT INTO batch (batch_name, branch, semester) VALUES
 ('CSE-2-A1','CSE',3), ('CSE-2-A2','CSE',3), ('CSE-3-B1','CSE',5), ('ECE-2-A1','ECE',3);

INSERT INTO course (course_code, course_name, semester, credits) VALUES
 ('CS201','Data Structures',3,4), ('CS203','Database Management Systems',4,4),
 ('CS301','Computer Networks',5,3), ('CS305','Operating Systems',5,4),
 ('EC201','Digital Electronics',3,3), ('CS210','Web Technologies',4,3);

INSERT INTO app_user (full_name, email, password_hash, role, phone) VALUES
 ('Lab Admin',        'admin@labmatrix.com',       @pw, 'Admin',      '9000000001'),
 ('Dr. Meera Shah',   'meera.shah@labmatrix.com',  @pw, 'Faculty',    '9000000002'),
 ('Dr. Rajesh Patel', 'rajesh.patel@labmatrix.com',@pw, 'Faculty',    '9000000003'),
 ('Prof. Anita Desai','anita.desai@labmatrix.com', @pw, 'Faculty',    '9000000004'),
 ('Kiran Joshi',      'kiran.joshi@labmatrix.com', @pw, 'Technician', '9000000005'),
 ('Suresh Mehta',     'suresh.mehta@labmatrix.com',@pw, 'Technician', '9000000006');

INSERT INTO faculty (user_id, employee_id, department, designation)
SELECT user_id, CONCAT('F', LPAD(user_id,3,'0')), 'CSE',
       CASE email WHEN 'meera.shah@labmatrix.com' THEN 'Professor' ELSE 'Assistant Professor' END
FROM app_user WHERE role = 'Faculty';

INSERT INTO technician (user_id, employee_id, specialization)
SELECT user_id, CONCAT('T', LPAD(user_id,3,'0')),
       CASE email WHEN 'kiran.joshi@labmatrix.com' THEN 'Hardware' ELSE 'Networking' END
FROM app_user WHERE role = 'Technician';

INSERT INTO app_user (full_name, email, password_hash, role, phone)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 24)
SELECT CONCAT('Student ', LPAD(i,2,'0')), CONCAT('student', LPAD(i,2,'0'), '@labmatrix.com'),
       @pw, 'Student', CONCAT('91000000', LPAD(i,2,'0'))
FROM n;

INSERT INTO student (user_id, enrollment_no, batch_id)
SELECT u.user_id,
       CONCAT('2024CS', LPAD(CAST(SUBSTRING(u.email, 8, 2) AS UNSIGNED), 3, '0')),
       (SELECT batch_id FROM batch WHERE batch_name = IF(CAST(SUBSTRING(u.email, 8, 2) AS UNSIGNED) MOD 2 = 1, 'CSE-2-A1', 'CSE-2-A2'))
FROM app_user u WHERE u.role = 'Student';

INSERT INTO lab (lab_name, building, floor, capacity, lab_type, in_charge_faculty_id) VALUES
 ('Computer Lab 1','CSE Block',1,40,'Computer',(SELECT user_id FROM app_user WHERE email='meera.shah@labmatrix.com')),
 ('Computer Lab 2','CSE Block',1,40,'Computer',(SELECT user_id FROM app_user WHERE email='meera.shah@labmatrix.com')),
 ('Computer Lab 3','CSE Block',2,36,'Computer',(SELECT user_id FROM app_user WHERE email='rajesh.patel@labmatrix.com')),
 ('Computer Lab 4','CSE Block',2,36,'Computer',(SELECT user_id FROM app_user WHERE email='rajesh.patel@labmatrix.com')),
 ('Programming Lab','CSE Block',3,30,'Computer',(SELECT user_id FROM app_user WHERE email='anita.desai@labmatrix.com')),
 ('Network Lab','CSE Block',0,24,'Network',(SELECT user_id FROM app_user WHERE email='anita.desai@labmatrix.com')),
 ('Research Lab','Research Wing',1,16,'Research',(SELECT user_id FROM app_user WHERE email='rajesh.patel@labmatrix.com')),
 ('Electronics Lab 1','ECE Block',0,30,'Electronics',NULL),
 ('Electronics Lab 2','ECE Block',1,30,'Electronics',NULL),
 ('Seminar Room','Main Block',2,60,'General',NULL);

-- 120 computers: 20 in each Computer lab, 10 each in Network and Research labs
INSERT INTO computer (lab_id, asset_number, processor, ram_gb, storage_gb, operating_system, status, purchase_date, warranty_expiry)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 20)
SELECT l.lab_id, CONCAT('PC-', LPAD(l.lab_id,2,'0'), '-', LPAD(n.i,3,'0')),
       IF(l.lab_id IN (5,7), 'Intel Core i7-12700', 'Intel Core i5-12400'),
       IF(l.lab_id IN (5,7), 32, 16), IF(l.lab_id IN (5,7), 1024, 512),
       IF(n.i MOD 4 = 0, 'Ubuntu 22.04', 'Windows 11'),
       'Working', '2023-07-01', '2028-07-01'
FROM lab l JOIN n
WHERE (l.lab_type = 'Computer' AND n.i <= 20) OR (l.lab_type IN ('Network','Research') AND n.i <= 10);

INSERT INTO equipment (lab_id, asset_number, equipment_name, equipment_type, status, purchase_date, warranty_expiry) VALUES
 (1,'EQ-PRJ-001','Epson Projector','Projector','Working','2023-07-01','2026-07-01'),
 (2,'EQ-PRJ-002','Epson Projector','Projector','Working','2023-07-01','2026-07-01'),
 (3,'EQ-PRN-001','HP LaserJet Printer','Printer','Working','2022-01-10','2027-01-10'),
 (6,'EQ-RTR-001','Cisco Router 2901','Router','Working','2023-02-15','2028-02-15'),
 (6,'EQ-SWT-001','Cisco Catalyst Switch','Switch','Working','2023-02-15','2028-02-15'),
 (8,'EQ-OSC-001','Tektronix Oscilloscope','Oscilloscope','Working','2021-08-20','2026-08-20'),
 (9,'EQ-OSC-002','Tektronix Oscilloscope','Oscilloscope','Working','2021-08-20','2026-08-20'),
 (1,'EQ-UPS-001','APC UPS 3kVA','UPS','Working','2022-05-05','2027-05-05'),
 (10,'EQ-PRJ-003','BenQ Projector','Projector','Working','2024-01-12','2027-01-12'),
 (7,'EQ-OTH-001','Whiteboard Camera','Other','Working','2024-03-03','2027-03-03');

INSERT INTO software (software_name, version, vendor, license_type, total_licenses, license_expiry) VALUES
 ('Visual Studio Code','1.90','Microsoft','Open Source',NULL,NULL),
 ('MATLAB','R2024a','MathWorks','Educational',30, DATE_ADD(CURDATE(), INTERVAL 25 DAY)),
 ('AutoCAD','2024','Autodesk','Educational',20, DATE_ADD(CURDATE(), INTERVAL 45 DAY)),
 ('MySQL Workbench','8.0','Oracle','Open Source',NULL,NULL),
 ('Cisco Packet Tracer','8.2','Cisco','Educational',40, DATE_ADD(CURDATE(), INTERVAL 300 DAY)),
 ('IntelliJ IDEA','2024.1','JetBrains','Commercial',25, DATE_ADD(CURDATE(), INTERVAL 120 DAY));

INSERT INTO software_installation (computer_id, software_id, install_date)
SELECT c.computer_id, s.software_id, CURDATE()
FROM computer c JOIN software s ON s.software_name = 'Visual Studio Code';

INSERT INTO software_installation (computer_id, software_id, install_date)
SELECT c.computer_id, s.software_id, CURDATE()
FROM computer c JOIN software s ON s.software_name = 'MySQL Workbench'
WHERE c.lab_id IN (1,2,3);

INSERT INTO software_installation (computer_id, software_id, install_date)
SELECT c.computer_id, s.software_id, CURDATE()
FROM computer c JOIN software s ON s.software_name = 'MATLAB'
WHERE c.lab_id = 7;

INSERT INTO software_installation (computer_id, software_id, install_date)
SELECT c.computer_id, s.software_id, CURDATE()
FROM computer c JOIN software s ON s.software_name = 'Cisco Packet Tracer'
WHERE c.lab_id = 6;

INSERT INTO lab_session (lab_id, faculty_id, course_id, batch_id, session_date, start_time, end_time, topic)
SELECT 1, (SELECT user_id FROM app_user WHERE email='meera.shah@labmatrix.com'),
       (SELECT course_id FROM course WHERE course_code='CS203'),
       (SELECT batch_id FROM batch WHERE batch_name='CSE-2-A1'),
       DATE_SUB(CURDATE(), INTERVAL w WEEK), '10:00', '12:00', CONCAT('DBMS lab ', 4 - w)
FROM (SELECT 1 AS w UNION SELECT 2 UNION SELECT 3) weeks;

INSERT INTO lab_session (lab_id, faculty_id, course_id, batch_id, session_date, start_time, end_time, topic)
SELECT 2, (SELECT user_id FROM app_user WHERE email='rajesh.patel@labmatrix.com'),
       (SELECT course_id FROM course WHERE course_code='CS201'),
       (SELECT batch_id FROM batch WHERE batch_name='CSE-2-A2'),
       DATE_SUB(CURDATE(), INTERVAL w WEEK), '14:00', '16:00', CONCAT('Data structures lab ', 4 - w)
FROM (SELECT 1 AS w UNION SELECT 2 UNION SELECT 3) weeks;

INSERT INTO attendance (student_id, session_id, status)
SELECT st.user_id, ls.session_id,
       CASE WHEN (st.user_id + ls.session_id) MOD 7 = 0 THEN 'Absent'
            WHEN (st.user_id + ls.session_id) MOD 5 = 0 THEN 'Late'
            ELSE 'Present' END
FROM lab_session ls JOIN student st ON st.batch_id = ls.batch_id;

INSERT INTO lab_booking (lab_id, faculty_id, start_datetime, end_datetime, purpose, status, approved_by) VALUES
 (3,(SELECT user_id FROM app_user WHERE email='anita.desai@labmatrix.com'),
    CONCAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY),' 09:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY),' 11:00:00'),
    'Extra practice session','Approved',(SELECT user_id FROM app_user WHERE email='admin@labmatrix.com')),
 (3,(SELECT user_id FROM app_user WHERE email='meera.shah@labmatrix.com'),
    CONCAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY),' 14:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY),' 16:00:00'),
    'Project demo','Pending',NULL),
 (6,(SELECT user_id FROM app_user WHERE email='anita.desai@labmatrix.com'),
    CONCAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY),' 10:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY),' 13:00:00'),
    'Networking workshop','Pending',NULL),
 (5,(SELECT user_id FROM app_user WHERE email='rajesh.patel@labmatrix.com'),
    CONCAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY),' 09:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY),' 10:00:00'),
    'Makeup lab','Rejected',(SELECT user_id FROM app_user WHERE email='admin@labmatrix.com'));

-- fault reports: ids go into variables first (a trigger cannot change a table the same INSERT ... SELECT reads)
SET @c1 = (SELECT computer_id FROM computer WHERE asset_number = 'PC-01-001');
SET @c2 = (SELECT computer_id FROM computer WHERE asset_number = 'PC-02-005');
SET @c3 = (SELECT computer_id FROM computer WHERE asset_number = 'PC-03-007');
SET @e1 = (SELECT equipment_id FROM equipment WHERE asset_number = 'EQ-PRJ-001');
SET @meera = (SELECT user_id FROM app_user WHERE email = 'meera.shah@labmatrix.com');
SET @anita = (SELECT user_id FROM app_user WHERE email = 'anita.desai@labmatrix.com');

INSERT INTO maintenance_request (computer_id, equipment_id, reported_by, description, priority, reported_date, status) VALUES
 (@c1, NULL, @meera, 'Monitor flickering',        'Low',    DATE_SUB(CURDATE(), INTERVAL 40 DAY), 'Open'),
 (@c1, NULL, @meera, 'Keyboard not working',      'Low',    DATE_SUB(CURDATE(), INTERVAL 25 DAY), 'Open'),
 (@c1, NULL, @meera, 'No display after boot',     'Medium', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Open'),
 (@c2, NULL, @meera, 'Does not power on',         'High',   DATE_SUB(CURDATE(), INTERVAL 6 DAY),  'Open'),
 (@c3, NULL, @meera, 'Network card not detected', 'Medium', DATE_SUB(CURDATE(), INTERVAL 4 DAY),  'Open'),
 (NULL, @e1, @anita, 'Projector lamp is dim',     'Medium', DATE_SUB(CURDATE(), INTERVAL 2 DAY),  'Open');

UPDATE maintenance_request SET status = 'Resolved'    WHERE description IN ('Monitor flickering','Keyboard not working');
UPDATE maintenance_request SET status = 'In Progress' WHERE description = 'No display after boot';
UPDATE maintenance_request SET status = 'Assigned'    WHERE description = 'Does not power on';

INSERT INTO maintenance (request_id, technician_id, start_date, end_date, cost, status, remarks)
SELECT request_id, (SELECT user_id FROM app_user WHERE email='kiran.joshi@labmatrix.com'),
       reported_date, DATE_ADD(reported_date, INTERVAL 2 DAY), 350.00, 'Completed', 'Part replaced'
FROM maintenance_request WHERE description IN ('Monitor flickering','Keyboard not working');

INSERT INTO maintenance (request_id, technician_id, start_date, end_date, cost, status, remarks)
SELECT request_id, (SELECT user_id FROM app_user WHERE email='kiran.joshi@labmatrix.com'),
       CURDATE(), NULL, 0, 'In Progress', 'Checking graphics card'
FROM maintenance_request WHERE description = 'No display after boot';

INSERT INTO maintenance (request_id, technician_id, start_date, end_date, cost, status, remarks)
SELECT request_id, (SELECT user_id FROM app_user WHERE email='suresh.mehta@labmatrix.com'),
       CURDATE(), NULL, 0, 'Assigned', NULL
FROM maintenance_request WHERE description = 'Does not power on';