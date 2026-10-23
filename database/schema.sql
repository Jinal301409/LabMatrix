-- =====================================================================
-- LabSphere / LabMatrix  -  schema.sql   (MySQL 8.0.16+)
-- Team TriByte | CS203 DBMS Project | SVNIT Surat
-- WARNING: this script DROPS and recreates the database `LabMatrix`.
-- Run once:  mysql -u root -p -e "source database/schema.sql"
-- =====================================================================

DROP DATABASE IF EXISTS LabMatrix;
CREATE DATABASE LabMatrix CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE LabMatrix;

-- ---------------------------------------------------------------------
-- 1. ACADEMIC LOOKUPS
-- ---------------------------------------------------------------------
CREATE TABLE batch (
  batch_id    INT AUTO_INCREMENT PRIMARY KEY,
  batch_name  VARCHAR(30) NOT NULL UNIQUE,
  branch      VARCHAR(50) NOT NULL,
  semester    TINYINT NOT NULL,
  CONSTRAINT chk_batch_sem CHECK (semester BETWEEN 1 AND 8)
);

CREATE TABLE course (
  course_id    INT AUTO_INCREMENT PRIMARY KEY,
  course_code  VARCHAR(15) NOT NULL UNIQUE,
  course_name  VARCHAR(100) NOT NULL,
  semester     TINYINT NOT NULL,
  credits      TINYINT NOT NULL DEFAULT 3,
  CONSTRAINT chk_course_sem CHECK (semester BETWEEN 1 AND 8),
  CONSTRAINT chk_course_credits CHECK (credits > 0)
);

-- ---------------------------------------------------------------------
-- 2. USERS (supertype + 3 subtypes; Admin has no subtype table)
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('Admin','Faculty','Student','Technician') NOT NULL,
  phone          VARCHAR(15) NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_user_email CHECK (email REGEXP '^[^@ ]+@[^@ ]+\\.[^@ ]+$')
);

CREATE TABLE student (
  user_id        INT PRIMARY KEY,
  enrollment_no  VARCHAR(20) NOT NULL UNIQUE,
  batch_id       INT NOT NULL,
  CONSTRAINT fk_student_user  FOREIGN KEY (user_id)  REFERENCES app_user(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_student_batch FOREIGN KEY (batch_id) REFERENCES batch(batch_id)   ON DELETE RESTRICT
);

CREATE TABLE faculty (
  user_id      INT PRIMARY KEY,
  employee_id  VARCHAR(20) NOT NULL UNIQUE,
  department   VARCHAR(60) NOT NULL,
  designation  VARCHAR(50) NULL,
  CONSTRAINT fk_faculty_user FOREIGN KEY (user_id) REFERENCES app_user(user_id) ON DELETE CASCADE
);

CREATE TABLE technician (
  user_id         INT PRIMARY KEY,
  employee_id     VARCHAR(20) NOT NULL UNIQUE,
  specialization  VARCHAR(60) NULL,
  CONSTRAINT fk_tech_user FOREIGN KEY (user_id) REFERENCES app_user(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. LABS AND RESOURCES
-- ---------------------------------------------------------------------
CREATE TABLE lab (
  lab_id                INT AUTO_INCREMENT PRIMARY KEY,
  lab_name              VARCHAR(80) NOT NULL UNIQUE,
  building              VARCHAR(60) NOT NULL,
  floor                 TINYINT NOT NULL DEFAULT 0,
  capacity              SMALLINT NOT NULL,
  lab_type              ENUM('Computer','Electronics','Network','Research','General') NOT NULL DEFAULT 'General',
  in_charge_faculty_id  INT NULL,
  CONSTRAINT chk_lab_capacity CHECK (capacity > 0),
  CONSTRAINT fk_lab_incharge FOREIGN KEY (in_charge_faculty_id) REFERENCES faculty(user_id) ON DELETE SET NULL
);

CREATE TABLE computer (
  computer_id       INT AUTO_INCREMENT PRIMARY KEY,
  lab_id            INT NOT NULL,
  asset_number      VARCHAR(30) NOT NULL UNIQUE,
  processor         VARCHAR(60) NULL,
  ram_gb            SMALLINT NULL,
  storage_gb        INT NULL,
  operating_system  VARCHAR(50) NULL,
  status            ENUM('Working','Under Maintenance','Retired') NOT NULL DEFAULT 'Working',
  purchase_date     DATE NULL,
  warranty_expiry   DATE NULL,
  CONSTRAINT chk_comp_ram  CHECK (ram_gb > 0),
  CONSTRAINT chk_comp_warr CHECK (warranty_expiry >= purchase_date),
  CONSTRAINT fk_comp_lab FOREIGN KEY (lab_id) REFERENCES lab(lab_id) ON DELETE RESTRICT
);

CREATE TABLE equipment (
  equipment_id    INT AUTO_INCREMENT PRIMARY KEY,
  lab_id          INT NOT NULL,
  asset_number    VARCHAR(30) NOT NULL UNIQUE,
  equipment_name  VARCHAR(80) NOT NULL,
  equipment_type  ENUM('Projector','Printer','Router','Switch','Oscilloscope','UPS','Other') NOT NULL DEFAULT 'Other',
  status          ENUM('Working','Under Maintenance','Retired') NOT NULL DEFAULT 'Working',
  purchase_date   DATE NULL,
  warranty_expiry DATE NULL,
  CONSTRAINT chk_eq_warr CHECK (warranty_expiry >= purchase_date),
  CONSTRAINT fk_eq_lab FOREIGN KEY (lab_id) REFERENCES lab(lab_id) ON DELETE RESTRICT
);

CREATE TABLE software (
  software_id     INT AUTO_INCREMENT PRIMARY KEY,
  software_name   VARCHAR(80) NOT NULL,
  version         VARCHAR(30) NOT NULL,
  vendor          VARCHAR(80) NULL,
  license_type    ENUM('Open Source','Educational','Commercial','Site License') NOT NULL DEFAULT 'Open Source',
  total_licenses  INT NULL,            -- NULL = unlimited
  license_expiry  DATE NULL,           -- NULL = perpetual
  UNIQUE KEY uq_software_version (software_name, version),
  CONSTRAINT chk_sw_lic CHECK (total_licenses > 0)
);

CREATE TABLE software_installation (
  computer_id   INT NOT NULL,
  software_id   INT NOT NULL,
  install_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (computer_id, software_id),
  CONSTRAINT fk_swi_comp FOREIGN KEY (computer_id) REFERENCES computer(computer_id) ON DELETE CASCADE,
  CONSTRAINT fk_swi_sw   FOREIGN KEY (software_id) REFERENCES software(software_id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 4. SESSIONS, ATTENDANCE, BOOKINGS
-- ---------------------------------------------------------------------
CREATE TABLE lab_session (
  session_id    INT AUTO_INCREMENT PRIMARY KEY,
  lab_id        INT NOT NULL,
  faculty_id    INT NOT NULL,
  course_id     INT NOT NULL,
  batch_id      INT NOT NULL,
  session_date  DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  topic         VARCHAR(150) NULL,
  CONSTRAINT chk_sess_time CHECK (end_time > start_time),
  CONSTRAINT fk_sess_lab     FOREIGN KEY (lab_id)     REFERENCES lab(lab_id)         ON DELETE RESTRICT,
  CONSTRAINT fk_sess_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(user_id)    ON DELETE RESTRICT,
  CONSTRAINT fk_sess_course  FOREIGN KEY (course_id)  REFERENCES course(course_id)   ON DELETE RESTRICT,
  CONSTRAINT fk_sess_batch   FOREIGN KEY (batch_id)   REFERENCES batch(batch_id)     ON DELETE RESTRICT
);

CREATE TABLE attendance (
  student_id  INT NOT NULL,
  session_id  INT NOT NULL,
  status      ENUM('Present','Absent','Late') NOT NULL DEFAULT 'Present',
  marked_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, session_id),
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES student(user_id)        ON DELETE CASCADE,
  CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES lab_session(session_id) ON DELETE CASCADE
);

CREATE TABLE lab_booking (
  booking_id      INT AUTO_INCREMENT PRIMARY KEY,
  lab_id          INT NOT NULL,
  faculty_id      INT NOT NULL,
  start_datetime  DATETIME NOT NULL,
  end_datetime    DATETIME NOT NULL,
  purpose         VARCHAR(200) NOT NULL,
  status          ENUM('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
  approved_by     INT NULL,
  requested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_book_time CHECK (end_datetime > start_datetime),
  CONSTRAINT fk_book_lab      FOREIGN KEY (lab_id)      REFERENCES lab(lab_id)       ON DELETE RESTRICT,
  CONSTRAINT fk_book_faculty  FOREIGN KEY (faculty_id)  REFERENCES faculty(user_id)  ON DELETE RESTRICT,
  CONSTRAINT fk_book_approver FOREIGN KEY (approved_by) REFERENCES app_user(user_id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 5. MAINTENANCE
-- ---------------------------------------------------------------------
CREATE TABLE maintenance_request (
  request_id     INT AUTO_INCREMENT PRIMARY KEY,
  computer_id    INT NULL,
  equipment_id   INT NULL,
  reported_by    INT NOT NULL,
  description    VARCHAR(500) NOT NULL,
  priority       ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  reported_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
  status         ENUM('Open','Assigned','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
  -- exactly one target: a computer OR an equipment item
  CONSTRAINT chk_mreq_target CHECK (
    (computer_id IS NOT NULL AND equipment_id IS NULL) OR
    (computer_id IS NULL AND equipment_id IS NOT NULL)
  ),
  CONSTRAINT fk_mreq_comp FOREIGN KEY (computer_id)  REFERENCES computer(computer_id)   ON DELETE RESTRICT,
  CONSTRAINT fk_mreq_eq   FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
  CONSTRAINT fk_mreq_user FOREIGN KEY (reported_by)  REFERENCES app_user(user_id)       ON DELETE RESTRICT
);

CREATE TABLE maintenance (
  maintenance_id  INT AUTO_INCREMENT PRIMARY KEY,
  request_id      INT NOT NULL,
  technician_id   INT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NULL,
  cost            DECIMAL(10,2) NOT NULL DEFAULT 0,
  status          ENUM('Assigned','In Progress','Completed') NOT NULL DEFAULT 'Assigned',
  remarks         VARCHAR(300) NULL,
  CONSTRAINT chk_maint_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_maint_cost  CHECK (cost >= 0),
  CONSTRAINT fk_maint_req  FOREIGN KEY (request_id)    REFERENCES maintenance_request(request_id) ON DELETE CASCADE,
  CONSTRAINT fk_maint_tech FOREIGN KEY (technician_id) REFERENCES technician(user_id)             ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 6. INDEXES
-- (InnoDB already indexes every foreign-key column)
-- ---------------------------------------------------------------------
CREATE INDEX idx_computer_lab_status   ON computer(lab_id, status);
CREATE INDEX idx_equipment_lab_status  ON equipment(lab_id, status);
CREATE INDEX idx_booking_conflict      ON lab_booking(lab_id, status, start_datetime, end_datetime);
CREATE INDEX idx_booking_faculty       ON lab_booking(faculty_id, start_datetime);
CREATE INDEX idx_session_lab_date      ON lab_session(lab_id, session_date);
CREATE INDEX idx_attendance_session    ON attendance(session_id, status);
CREATE INDEX idx_mreq_computer_status  ON maintenance_request(computer_id, status);
CREATE INDEX idx_mreq_equipment_status ON maintenance_request(equipment_id, status);
CREATE INDEX idx_maint_tech_status     ON maintenance(technician_id, status);
CREATE INDEX idx_software_expiry       ON software(license_expiry);

-- ---------------------------------------------------------------------
-- 7. TRIGGERS AND PROCEDURE
-- ---------------------------------------------------------------------
DELIMITER $$

-- ---------------------------------------------------------------------
-- 1. LAB BOOKINGS
--    A Pending request blocks the slot for other requests. Approving a
--    booking is only checked against Approved ones (old data stays approvable).
--    (Two people submitting at the same moment are handled by the backend,
--    which locks the lab row before saving; see utils/crudFactory.js.)
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_booking_conflict_ins
BEFORE INSERT ON lab_booking
FOR EACH ROW
BEGIN
  IF NEW.status IN ('Pending', 'Approved') THEN
    IF EXISTS (
         SELECT 1 FROM lab_booking
         WHERE lab_id = NEW.lab_id
           AND (status = 'Approved' OR (NEW.status = 'Pending' AND status = 'Pending'))
           AND NEW.start_datetime < end_datetime
           AND NEW.end_datetime   > start_datetime) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict: this lab is already booked or requested for an overlapping time';
    END IF;

    IF EXISTS (
         SELECT 1 FROM lab_session ls
         WHERE ls.lab_id = NEW.lab_id
           AND ls.session_date BETWEEN DATE(NEW.start_datetime) AND DATE(NEW.end_datetime)
           AND NEW.start_datetime < TIMESTAMP(ls.session_date, ls.end_time)
           AND NEW.end_datetime   > TIMESTAMP(ls.session_date, ls.start_time)) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict: a lab session is already scheduled in this lab at that time';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_booking_conflict_upd
BEFORE UPDATE ON lab_booking
FOR EACH ROW
BEGIN
  IF NEW.status IN ('Pending', 'Approved') THEN
    IF EXISTS (
         SELECT 1 FROM lab_booking
         WHERE lab_id = NEW.lab_id
           AND booking_id <> NEW.booking_id
           AND (status = 'Approved' OR (NEW.status = 'Pending' AND status = 'Pending'))
           AND NEW.start_datetime < end_datetime
           AND NEW.end_datetime   > start_datetime) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict: this lab is already booked or requested for an overlapping time';
    END IF;

    IF EXISTS (
         SELECT 1 FROM lab_session ls
         WHERE ls.lab_id = NEW.lab_id
           AND ls.session_date BETWEEN DATE(NEW.start_datetime) AND DATE(NEW.end_datetime)
           AND NEW.start_datetime < TIMESTAMP(ls.session_date, ls.end_time)
           AND NEW.end_datetime   > TIMESTAMP(ls.session_date, ls.start_time)) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict: a lab session is already scheduled in this lab at that time';
    END IF;
  END IF;
END$$

-- ---------------------------------------------------------------------
-- 2. LAB SESSIONS
--    Same lab, same faculty and same batch cannot be in two sessions at
--    once, and a session cannot sit inside an Approved booking.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_session_conflict_ins
BEFORE INSERT ON lab_session
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_session
              WHERE lab_id = NEW.lab_id AND session_date = NEW.session_date
                AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this lab already has a session at that time';
  END IF;

  IF EXISTS (SELECT 1 FROM lab_session
              WHERE faculty_id = NEW.faculty_id AND session_date = NEW.session_date
                AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this faculty member already has a session at that time';
  END IF;

  IF EXISTS (SELECT 1 FROM lab_session
              WHERE batch_id = NEW.batch_id AND session_date = NEW.session_date
                AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this batch already has a session at that time';
  END IF;

  IF EXISTS (SELECT 1 FROM lab_booking
              WHERE lab_id = NEW.lab_id AND status = 'Approved'
                AND start_datetime < TIMESTAMP(NEW.session_date, NEW.end_time)
                AND end_datetime   > TIMESTAMP(NEW.session_date, NEW.start_time)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this lab has an approved booking at that time';
  END IF;
END$$

CREATE TRIGGER trg_session_conflict_upd
BEFORE UPDATE ON lab_session
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_session
              WHERE session_id <> NEW.session_id
                AND lab_id = NEW.lab_id AND session_date = NEW.session_date
                AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this lab already has a session at that time';
  END IF;

  IF EXISTS (SELECT 1 FROM lab_session
              WHERE session_id <> NEW.session_id
                AND faculty_id = NEW.faculty_id AND session_date = NEW.session_date
                AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this faculty member already has a session at that time';
  END IF;

  IF EXISTS (SELECT 1 FROM lab_session
              WHERE session_id <> NEW.session_id
                AND batch_id = NEW.batch_id AND session_date = NEW.session_date
                AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this batch already has a session at that time';
  END IF;

  IF EXISTS (SELECT 1 FROM lab_booking
              WHERE lab_id = NEW.lab_id AND status = 'Approved'
                AND start_datetime < TIMESTAMP(NEW.session_date, NEW.end_time)
                AND end_datetime   > TIMESTAMP(NEW.session_date, NEW.start_time)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Session conflict: this lab has an approved booking at that time';
  END IF;
END$$

-- Approve a booking safely: admin only, pending only, lab row locked
CREATE PROCEDURE approve_booking(IN p_booking_id INT, IN p_admin_id INT)
BEGIN
  DECLARE v_lab    INT DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_role   VARCHAR(20) DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT role INTO v_role FROM app_user WHERE user_id = p_admin_id AND is_active = TRUE;
  IF v_role IS NULL OR v_role <> 'Admin' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an active Admin can approve bookings';
  END IF;

  SELECT lab_id INTO v_lab FROM lab_booking WHERE booking_id = p_booking_id;
  IF v_lab IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  -- lock the lab row so concurrent approvals for the same lab are serialised
  SELECT lab_id INTO v_lab FROM lab WHERE lab_id = v_lab FOR UPDATE;

  SELECT status INTO v_status FROM lab_booking WHERE booking_id = p_booking_id FOR UPDATE;
  IF v_status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a Pending booking can be approved';
  END IF;

  UPDATE lab_booking
     SET status = 'Approved', approved_by = p_admin_id
   WHERE booking_id = p_booking_id;       -- conflict trigger runs here

  COMMIT;
END$$

-- Opening a fault report puts the item Under Maintenance
CREATE TRIGGER trg_mreq_after_insert
AFTER INSERT ON maintenance_request
FOR EACH ROW
BEGIN
  IF NEW.computer_id IS NOT NULL THEN
    UPDATE computer SET status = 'Under Maintenance'
     WHERE computer_id = NEW.computer_id AND status = 'Working';
  ELSEIF NEW.equipment_id IS NOT NULL THEN
    UPDATE equipment SET status = 'Under Maintenance'
     WHERE equipment_id = NEW.equipment_id AND status = 'Working';
  END IF;
END$$

-- Resolving/closing the LAST open report sets the item back to Working
CREATE TRIGGER trg_mreq_after_update
AFTER UPDATE ON maintenance_request
FOR EACH ROW
BEGIN
  IF NEW.status IN ('Resolved','Closed') AND OLD.status NOT IN ('Resolved','Closed') THEN
    IF NEW.computer_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM maintenance_request
                      WHERE computer_id = NEW.computer_id
                        AND request_id <> NEW.request_id
                        AND status NOT IN ('Resolved','Closed')) THEN
        UPDATE computer SET status = 'Working'
         WHERE computer_id = NEW.computer_id AND status = 'Under Maintenance';
      END IF;
    ELSEIF NEW.equipment_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM maintenance_request
                      WHERE equipment_id = NEW.equipment_id
                        AND request_id <> NEW.request_id
                        AND status NOT IN ('Resolved','Closed')) THEN
        UPDATE equipment SET status = 'Working'
         WHERE equipment_id = NEW.equipment_id AND status = 'Under Maintenance';
      END IF;
    END IF;
  END IF;
END$$

-- Cannot install more copies than licensed seats
CREATE TRIGGER trg_swi_license_seats
BEFORE INSERT ON software_installation
FOR EACH ROW
BEGIN
  DECLARE v_total INT DEFAULT NULL;
  DECLARE v_used  INT DEFAULT 0;
  SELECT total_licenses INTO v_total FROM software WHERE software_id = NEW.software_id;
  IF v_total IS NOT NULL THEN
    SELECT COUNT(*) INTO v_used FROM software_installation WHERE software_id = NEW.software_id;
    IF v_used >= v_total THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'License limit reached: no free seats for this software';
    END IF;
  END IF;
END$$

-- ---------------------------------------------------------------------
-- 3. SOFTWARE SEATS
-- ---------------------------------------------------------------------
-- moving an installation to another software must respect that software's seats
CREATE TRIGGER trg_swi_license_seats_upd
BEFORE UPDATE ON software_installation
FOR EACH ROW
BEGIN
  DECLARE v_total INT DEFAULT NULL;
  DECLARE v_used  INT DEFAULT 0;

  IF NEW.software_id <> OLD.software_id THEN
    SELECT total_licenses INTO v_total FROM software WHERE software_id = NEW.software_id;
    IF v_total IS NOT NULL THEN
      SELECT COUNT(*) INTO v_used FROM software_installation WHERE software_id = NEW.software_id;
      IF v_used >= v_total THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'License limit reached: no free seats for this software';
      END IF;
    END IF;
  END IF;
END$$

-- the seat count cannot be edited below the number already installed
CREATE TRIGGER trg_software_seats_upd
BEFORE UPDATE ON software
FOR EACH ROW
BEGIN
  DECLARE v_used INT DEFAULT 0;

  IF NEW.total_licenses IS NOT NULL AND NOT (NEW.total_licenses <=> OLD.total_licenses) THEN
    SELECT COUNT(*) INTO v_used FROM software_installation WHERE software_id = NEW.software_id;
    IF v_used > NEW.total_licenses THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot set fewer licences than the number already installed';
    END IF;
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 8. VIEWS FOR THE DASHBOARD
-- ---------------------------------------------------------------------
CREATE VIEW v_lab_health AS
SELECT l.lab_id,
       l.lab_name,
       COUNT(c.computer_id)                                   AS total_computers,
       COALESCE(SUM(c.status = 'Working'), 0)                 AS working,
       COALESCE(SUM(c.status = 'Under Maintenance'), 0)       AS under_maintenance,
       COALESCE(SUM(c.status = 'Retired'), 0)                 AS retired
FROM lab l
LEFT JOIN computer c ON c.lab_id = l.lab_id
GROUP BY l.lab_id, l.lab_name;

CREATE VIEW v_expiring_licenses AS
SELECT s.software_id,
       s.software_name,
       s.version,
       s.license_expiry,
       DATEDIFF(s.license_expiry, CURDATE())  AS days_left,
       s.total_licenses,
       (SELECT COUNT(*) FROM software_installation si
         WHERE si.software_id = s.software_id) AS seats_used
FROM software s
WHERE s.license_expiry IS NOT NULL
  AND s.license_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY);

CREATE VIEW v_lab_usage AS
SELECT l.lab_id,
       l.lab_name,
       COUNT(ls.session_id) AS total_sessions,
       ROUND(COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(ls.end_time, ls.start_time))), 0) / 3600, 2) AS total_hours
FROM lab l
LEFT JOIN lab_session ls ON ls.lab_id = l.lab_id
GROUP BY l.lab_id, l.lab_name;

CREATE VIEW v_student_attendance AS
SELECT st.user_id          AS student_id,
       u.full_name,
       st.enrollment_no,
       co.course_id,
       co.course_code,
       COUNT(*)                                                       AS sessions_marked,
       SUM(a.status IN ('Present','Late'))                            AS attended,
       ROUND(100 * SUM(a.status IN ('Present','Late')) / COUNT(*), 2) AS attendance_percent
FROM attendance a
JOIN student st     ON st.user_id = a.student_id
JOIN app_user u     ON u.user_id = st.user_id
JOIN lab_session ls ON ls.session_id = a.session_id
JOIN course co      ON co.course_id = ls.course_id
GROUP BY st.user_id, u.full_name, st.enrollment_no, co.course_id, co.course_code;

CREATE VIEW v_frequent_maintenance AS
SELECT c.computer_id,
       c.asset_number,
       l.lab_name,
       COUNT(r.request_id) AS fault_reports
FROM computer c
JOIN lab l ON l.lab_id = c.lab_id
JOIN maintenance_request r ON r.computer_id = c.computer_id
GROUP BY c.computer_id, c.asset_number, l.lab_name
HAVING COUNT(r.request_id) > 2;
