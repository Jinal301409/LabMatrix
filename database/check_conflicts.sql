-- =====================================================================
-- LabMatrix  -  check_conflicts.sql
-- Read-only. Lists clashes that ALREADY exist in your data (the new
-- triggers only protect new saves). Run:
--     mysql -u root -p < database/check_conflicts.sql
-- Every query should return zero rows. If it lists rows, fix or delete
-- one of the two records shown (a = first record id, b = second).
-- =====================================================================
USE LabMatrix;

-- 1. Two Pending/Approved bookings overlapping in the same lab
SELECT 'booking vs booking' AS problem, a.booking_id AS a, b.booking_id AS b, l.lab_name,
       a.start_datetime AS a_start, a.end_datetime AS a_end, a.status AS a_status,
       b.start_datetime AS b_start, b.end_datetime AS b_end, b.status AS b_status
FROM lab_booking a
JOIN lab_booking b ON b.lab_id = a.lab_id AND b.booking_id > a.booking_id
JOIN lab l ON l.lab_id = a.lab_id
WHERE a.status IN ('Pending', 'Approved') AND b.status IN ('Pending', 'Approved')
  AND a.start_datetime < b.end_datetime AND a.end_datetime > b.start_datetime
ORDER BY a.start_datetime LIMIT 100;

-- 2. Two sessions in the same lab at the same time
SELECT 'session vs session (same lab)' AS problem, a.session_id AS a, b.session_id AS b, l.lab_name,
       a.session_date, a.start_time AS a_start, a.end_time AS a_end, b.start_time AS b_start, b.end_time AS b_end
FROM lab_session a
JOIN lab_session b ON b.lab_id = a.lab_id AND b.session_date = a.session_date AND b.session_id > a.session_id
JOIN lab l ON l.lab_id = a.lab_id
WHERE a.start_time < b.end_time AND a.end_time > b.start_time
ORDER BY a.session_date LIMIT 100;

-- 3. The same faculty member in two sessions at the same time
SELECT 'session vs session (same faculty)' AS problem, a.session_id AS a, b.session_id AS b, u.full_name AS faculty,
       a.session_date, a.start_time AS a_start, a.end_time AS a_end, b.start_time AS b_start, b.end_time AS b_end
FROM lab_session a
JOIN lab_session b ON b.faculty_id = a.faculty_id AND b.session_date = a.session_date AND b.session_id > a.session_id
JOIN app_user u ON u.user_id = a.faculty_id
WHERE a.start_time < b.end_time AND a.end_time > b.start_time
ORDER BY a.session_date LIMIT 100;

-- 4. The same batch in two sessions at the same time
SELECT 'session vs session (same batch)' AS problem, a.session_id AS a, b.session_id AS b, bt.batch_name,
       a.session_date, a.start_time AS a_start, a.end_time AS a_end, b.start_time AS b_start, b.end_time AS b_end
FROM lab_session a
JOIN lab_session b ON b.batch_id = a.batch_id AND b.session_date = a.session_date AND b.session_id > a.session_id
JOIN batch bt ON bt.batch_id = a.batch_id
WHERE a.start_time < b.end_time AND a.end_time > b.start_time
ORDER BY a.session_date LIMIT 100;

-- 5. A session inside an Approved booking of the same lab
SELECT 'session vs approved booking' AS problem, s.session_id AS a, b.booking_id AS b, l.lab_name,
       s.session_date, s.start_time, s.end_time, b.start_datetime AS booking_start, b.end_datetime AS booking_end
FROM lab_session s
JOIN lab_booking b ON b.lab_id = s.lab_id AND b.status = 'Approved'
JOIN lab l ON l.lab_id = s.lab_id
WHERE b.start_datetime < TIMESTAMP(s.session_date, s.end_time)
  AND b.end_datetime   > TIMESTAMP(s.session_date, s.start_time)
ORDER BY s.session_date LIMIT 100;

-- 6. Software installed on more computers than it has licences
SELECT 'software over its licence limit' AS problem, s.software_id, s.software_name, s.version,
       s.total_licenses, COUNT(*) AS installed
FROM software s JOIN software_installation si ON si.software_id = s.software_id
WHERE s.total_licenses IS NOT NULL
GROUP BY s.software_id, s.software_name, s.version, s.total_licenses
HAVING COUNT(*) > s.total_licenses;
