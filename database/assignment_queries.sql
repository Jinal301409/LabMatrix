-- =====================================================================
-- LabMatrix  -  assignment_queries.sql   (DBMS lab assignment: Sections A, B, C)
-- Run schema.sql, then seed_large.sql, then run this file one block at a time
-- in MySQL Workbench (select a block, press the lightning bolt).
--
-- HOW TO NOTE EXECUTION TIME in Workbench:
--   look at the "Action Output" panel at the bottom: the "Duration / Fetch"
--   column shows the time for each statement. Run every query 3 times and
--   write down the average, because the first run is usually slower.
-- Workbench only fetches 1000 rows by default, so for big results the
-- Duration is the query time and Fetch is the time to download the rows.
-- =====================================================================
USE LabMatrix;

-- =====================================================================
-- SECTION A  -  eight queries, run them BEFORE creating the Section B indexes
-- =====================================================================

-- ---------------------------------------------------------------
-- A1. Display all data from one main table
-- ---------------------------------------------------------------
SELECT * FROM computer;

-- ---------------------------------------------------------------
-- A2. Insert data into several tables, keeping integrity constraints
--     (parents first, then children, so every foreign key is valid).
--     Re-running this block fails on the UNIQUE columns, which is the
--     constraint doing its job. Delete the rows first to run it again.
-- ---------------------------------------------------------------
INSERT INTO batch (batch_name, branch, semester)
VALUES ('CSE-7-A1', 'CSE', 7);

INSERT INTO lab (lab_name, building, floor, capacity, lab_type, in_charge_faculty_id)
VALUES ('Lab 41', 'CSE Block', 2, 60, 'Computer', (SELECT MIN(user_id) FROM faculty));

INSERT INTO computer (lab_id, asset_number, processor, ram_gb, storage_gb,
                      operating_system, purchase_date, warranty_expiry)
VALUES ((SELECT lab_id FROM lab WHERE lab_name = 'Lab 41'), 'PC-90001', 'Intel Core i7', 16, 512, 'Ubuntu 24.04', '2026-01-15', '2029-01-15'),
       ((SELECT lab_id FROM lab WHERE lab_name = 'Lab 41'), 'PC-90002', 'AMD Ryzen 5', 8, 256, 'Windows 11', '2026-01-15', '2029-01-15');

INSERT INTO software (software_name, version, vendor, license_type, total_licenses, license_expiry)
VALUES ('Docker Desktop', '4.35', 'Docker Inc', 'Educational', 50, '2027-06-30');

INSERT INTO software_installation (computer_id, software_id)
VALUES ((SELECT computer_id FROM computer WHERE asset_number = 'PC-90001'),
        (SELECT software_id FROM software WHERE software_name = 'Docker Desktop' AND version = '4.35'));

-- a student needs TWO rows: the login (app_user) first, then the student row
INSERT INTO app_user (full_name, email, password_hash, role, phone)
VALUES ('Aarav Shah', 'aarav.shah@labmatrix.edu',
        '$2b$10$PFPgEdSb67EDJs5Jdt7zLO9mmWKCXyOV97LJR83J3mAVWWHc4XIrK', 'Student', '9876543210');
INSERT INTO student (user_id, enrollment_no, batch_id)
VALUES (LAST_INSERT_ID(), 'U900001', (SELECT batch_id FROM batch WHERE batch_name = 'CSE-7-A1'));

INSERT INTO lab_booking (lab_id, faculty_id, start_datetime, end_datetime, purpose)
VALUES ((SELECT lab_id FROM lab WHERE lab_name = 'Lab 41'), (SELECT MIN(user_id) FROM faculty),
        '2027-03-10 09:00:00', '2027-03-10 12:00:00', 'DBMS practical exam');

-- Integrity demos: each of these MUST fail. Run one at a time and copy the error.
-- (a) foreign key: lab 9999 does not exist
-- INSERT INTO computer (lab_id, asset_number, ram_gb) VALUES (9999, 'PC-90003', 8);
-- (b) unique key: asset number already used
-- INSERT INTO computer (lab_id, asset_number, ram_gb) VALUES (1, 'PC-90001', 8);
-- (c) check constraint: RAM must be above 0
-- INSERT INTO computer (lab_id, asset_number, ram_gb) VALUES (1, 'PC-90004', 0);

-- ---------------------------------------------------------------
-- A3. ONE aggregate function result from one main table
-- ---------------------------------------------------------------
SELECT AVG(ram_gb) AS average_ram_gb FROM computer;
-- other aggregates you can swap in for the frontend dropdown:
-- SELECT COUNT(*) FROM computer;       SELECT SUM(storage_gb) FROM computer;
-- SELECT MIN(purchase_date) FROM computer;   SELECT MAX(ram_gb) FROM computer;

-- ---------------------------------------------------------------
-- A4. Display data using a condition
-- ---------------------------------------------------------------
SELECT computer_id, asset_number, operating_system, ram_gb, status
FROM computer
WHERE operating_system = 'Ubuntu 24.04' AND ram_gb >= 16;

-- ---------------------------------------------------------------
-- A5. JOIN on two tables
-- ---------------------------------------------------------------
SELECT c.asset_number, c.ram_gb, c.status, l.lab_name, l.building
FROM computer c
INNER JOIN lab l ON l.lab_id = c.lab_id;
-- other join types for the dropdown: LEFT JOIN (shows labs with no computers too),
-- RIGHT JOIN, CROSS JOIN. MySQL has no FULL JOIN; use LEFT JOIN UNION RIGHT JOIN.

-- ---------------------------------------------------------------
-- A6. SUBQUERY over more than one table (3 tables: student, attendance, lab_session)
--     "Students who were absent in any session of the last 30 days"
-- ---------------------------------------------------------------
SELECT s.enrollment_no, s.batch_id
FROM student s
WHERE s.user_id IN (
        SELECT a.student_id
        FROM attendance a
        WHERE a.status = 'Absent'
          AND a.session_id IN (SELECT ls.session_id
                               FROM lab_session ls
                               WHERE ls.session_date >= CURDATE() - INTERVAL 30 DAY));

-- ---------------------------------------------------------------
-- A7. CORRELATED query over two tables (lab, computer)
--     The inner query is re-run for every lab (it uses l.lab_id from the outer query).
--     "Labs that have no computer at all"
-- ---------------------------------------------------------------
SELECT l.lab_name, l.building, l.lab_type
FROM lab l
WHERE NOT EXISTS (SELECT 1 FROM computer c WHERE c.lab_id = l.lab_id);

-- A second correlated example: labs with more than 900 working computers
-- SELECT l.lab_name FROM lab l
-- WHERE (SELECT COUNT(*) FROM computer c WHERE c.lab_id = l.lab_id AND c.status = 'Working') > 900;

-- ---------------------------------------------------------------
-- A8. UPDATE one table
-- ---------------------------------------------------------------
SELECT operating_system, COUNT(*) AS total FROM computer
WHERE operating_system IN ('Ubuntu 22.04', 'Ubuntu 24.04') GROUP BY operating_system;   -- before

UPDATE computer SET operating_system = 'Ubuntu 24.04'
WHERE operating_system = 'Ubuntu 22.04' AND ram_gb = 4;

SELECT operating_system, COUNT(*) AS total FROM computer
WHERE operating_system IN ('Ubuntu 22.04', 'Ubuntu 24.04') GROUP BY operating_system;   -- after

-- =====================================================================
-- SECTION B  -  indexes. Re-run A1 to A8 AFTER creating them and compare times.
-- =====================================================================
-- An index is like the index at the back of a book: instead of reading every
-- page (row) MySQL jumps straight to the right ones.
--
-- See which plan MySQL uses (look at the "key" and "rows" columns):
--     EXPLAIN SELECT ... ;               -- the plan only
--     EXPLAIN ANALYZE SELECT ... ;       -- runs the query and shows real times
--
-- Note: InnoDB already indexes every foreign-key column (lab_id, batch_id...),
-- so the JOIN in A5 and the correlated query in A7 were already using an index.

CREATE INDEX idx_computer_os_ram ON computer (operating_system, ram_gb);   -- helps A4 and A8
CREATE INDEX idx_computer_ram    ON computer (ram_gb);                     -- helps A3 (covering index)
CREATE INDEX idx_session_date    ON lab_session (session_date);            -- helps A6

-- To undo an experiment:
-- DROP INDEX idx_computer_os_ram ON computer;
-- DROP INDEX idx_computer_ram ON computer;
-- DROP INDEX idx_session_date ON lab_session;

-- =====================================================================
-- SECTION C  -  view, procedures, trigger
-- =====================================================================

-- C. A view built from TWO tables with a condition (only CSE-branch students)
CREATE OR REPLACE VIEW v_cse_students AS
SELECT s.user_id, s.enrollment_no, s.batch_id, b.batch_name, b.semester
FROM student s
JOIN batch b ON b.batch_id = s.batch_id
WHERE b.branch = 'CSE'
WITH CHECK OPTION;       -- rows added through the view must still satisfy branch = 'CSE'

SELECT * FROM v_cse_students LIMIT 20;

DELIMITER $$

-- C.1  Saved procedure that INSERTS: adds the login row and the student row together
CREATE PROCEDURE sp_add_student(IN p_name VARCHAR(100), IN p_email VARCHAR(120),
                                IN p_enroll VARCHAR(20), IN p_batch_id INT)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;          -- if either insert fails, undo both
    RESIGNAL;          -- and pass the error on
  END;
  START TRANSACTION;
  INSERT INTO app_user (full_name, email, password_hash, role)
  VALUES (p_name, p_email, '$2b$10$PFPgEdSb67EDJs5Jdt7zLO9mmWKCXyOV97LJR83J3mAVWWHc4XIrK', 'Student');
  INSERT INTO student (user_id, enrollment_no, batch_id)
  VALUES (LAST_INSERT_ID(), p_enroll, p_batch_id);
  COMMIT;
END$$

-- C.1  Saved procedure that DISPLAYS data from the view
CREATE PROCEDURE sp_show_cse_students(IN p_semester TINYINT)
BEGIN
  SELECT * FROM v_cse_students WHERE semester = p_semester ORDER BY enrollment_no LIMIT 50;
END$$

-- C.2  Validation trigger. MySQL does NOT allow a trigger on a view, so it goes on
--      the base table (student). Anything inserted through the view or the
--      procedure passes through it.
CREATE TRIGGER trg_student_validate
BEFORE INSERT ON student
FOR EACH ROW
BEGIN
  IF NEW.enrollment_no NOT REGEXP '^U[0-9]{6}$' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Enrollment number must be U followed by 6 digits, e.g. U123456';
  END IF;
END$$

DELIMITER ;

-- Execute the procedures
CALL sp_add_student('Diya Patel', 'diya.patel@labmatrix.edu', 'U900002',
                    (SELECT batch_id FROM batch WHERE batch_name = 'CSE-7-A1'));
CALL sp_show_cse_students(7);

-- Trigger analysis. Run each line and note what happens:
-- 1) Bad enrollment number: the trigger blocks it and the whole procedure is rolled back
-- CALL sp_add_student('Bad Format', 'bad.format@labmatrix.edu', 'ABC123', (SELECT batch_id FROM batch WHERE batch_name = 'CSE-7-A1'));
-- 2) Insert straight through the VIEW with a valid CSE batch: allowed, and the row appears in the view
-- INSERT INTO app_user (full_name, email, password_hash, role) VALUES ('Via View', 'via.view@labmatrix.edu', 'x', 'Student');
-- INSERT INTO v_cse_students (user_id, enrollment_no, batch_id) VALUES (LAST_INSERT_ID(), 'U900003', (SELECT batch_id FROM batch WHERE batch_name = 'CSE-7-A1'));
-- 3) Insert through the view into an ECE batch: WITH CHECK OPTION rejects it
-- INSERT INTO app_user (full_name, email, password_hash, role) VALUES ('Wrong Branch', 'wrong.branch@labmatrix.edu', 'x', 'Student');
-- INSERT INTO v_cse_students (user_id, enrollment_no, batch_id) VALUES (LAST_INSERT_ID(), 'U900004', (SELECT batch_id FROM batch WHERE batch_name = 'ECE-3-A1'));
-- 4) Prove that a trigger on a view is not possible (this gives an error):
-- CREATE TRIGGER trg_on_view BEFORE INSERT ON v_cse_students FOR EACH ROW SET NEW.enrollment_no = NEW.enrollment_no;
