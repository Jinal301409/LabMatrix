-- =====================================================================
-- LabMatrix  -  fix_conflicts.sql
-- Run ONCE on your existing database (it does NOT delete any data):
--     mysql -u root -p < database/fix_conflicts.sql
-- (also run on a fresh database made from the old schema.sql)
--
-- What it adds
--   1. Lab bookings: no overlap with another Pending/Approved booking,
--      and none over a lab session of that lab.
--   2. Lab sessions: no overlap in the same lab, for the same faculty, or
--      for the same batch, and none inside an Approved booking.
--   3. Software seats: moving an install onto a full software is blocked,
--      and the seat count cannot be lowered below what is installed.
-- =====================================================================
USE LabMatrix;

DROP TRIGGER IF EXISTS trg_booking_conflict_ins;
DROP TRIGGER IF EXISTS trg_booking_conflict_upd;
DROP TRIGGER IF EXISTS trg_session_conflict_ins;
DROP TRIGGER IF EXISTS trg_session_conflict_upd;
DROP TRIGGER IF EXISTS trg_swi_license_seats_upd;
DROP TRIGGER IF EXISTS trg_software_seats_upd;

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
