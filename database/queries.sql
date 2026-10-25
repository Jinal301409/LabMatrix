USE LabMatrix;

-- Q1. Health of every lab (view)
SELECT * FROM v_lab_health;

-- Q2. Labs with computers out of service (GROUP BY + HAVING)
SELECT l.lab_name, COUNT(*) AS total,
       SUM(c.status <> 'Working') AS not_working,
       ROUND(100 * SUM(c.status <> 'Working') / COUNT(*), 1) AS pct_not_working
FROM lab l JOIN computer c ON c.lab_id = l.lab_id
GROUP BY l.lab_id, l.lab_name
HAVING pct_not_working > 0
ORDER BY pct_not_working DESC;

-- Q3. Licences expiring soon (view)
SELECT * FROM v_expiring_licenses ORDER BY days_left;

-- Q4. Software that has used all its seats (subquery)
SELECT s.software_name, s.version, s.total_licenses,
       (SELECT COUNT(*) FROM software_installation si WHERE si.software_id = s.software_id) AS used
FROM software s
WHERE s.total_licenses IS NOT NULL
  AND s.total_licenses <= (SELECT COUNT(*) FROM software_installation si WHERE si.software_id = s.software_id);

-- Q5. Lab usage (view)
SELECT * FROM v_lab_usage ORDER BY total_hours DESC;

-- Q6. Attendance per student and course, flagging shortage below 75%
SELECT student_id, full_name, enrollment_no, course_code, attended, sessions_marked, attendance_percent,
       IF(attendance_percent < 75, 'SHORTAGE', 'OK') AS remark
FROM v_student_attendance
ORDER BY attendance_percent;

-- Q7. Computers with repeated faults (view)
SELECT * FROM v_frequent_maintenance ORDER BY fault_reports DESC;

-- Q8. Open fault reports (multi-table JOIN)
SELECT r.request_id, r.priority, r.status, r.description, r.reported_date,
       COALESCE(c.asset_number, e.asset_number) AS asset, l.lab_name, u.full_name AS reported_by
FROM maintenance_request r
LEFT JOIN computer  c ON c.computer_id  = r.computer_id
LEFT JOIN equipment e ON e.equipment_id = r.equipment_id
JOIN lab l ON l.lab_id = COALESCE(c.lab_id, e.lab_id)
JOIN app_user u ON u.user_id = r.reported_by
WHERE r.status NOT IN ('Resolved', 'Closed')
ORDER BY FIELD(r.priority, 'High', 'Medium', 'Low'), r.reported_date;

-- Q9. Jobs and repair cost per technician
SELECT u.full_name AS technician, COUNT(m.maintenance_id) AS jobs,
       SUM(m.status = 'Completed') AS completed, COALESCE(SUM(m.cost), 0) AS total_cost
FROM technician t
JOIN app_user u ON u.user_id = t.user_id
LEFT JOIN maintenance m ON m.technician_id = t.user_id
GROUP BY t.user_id, u.full_name;

-- Q10. Pending booking requests
SELECT b.booking_id, l.lab_name, u.full_name AS faculty, b.start_datetime, b.end_datetime, b.purpose
FROM lab_booking b
JOIN lab l ON l.lab_id = b.lab_id
JOIN app_user u ON u.user_id = b.faculty_id
WHERE b.status = 'Pending'
ORDER BY b.start_datetime;

-- Q11. Warranties ending within 90 days
SELECT asset_number, lab_id, warranty_expiry, DATEDIFF(warranty_expiry, CURDATE()) AS days_left
FROM computer
WHERE warranty_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
ORDER BY warranty_expiry;

-- Q12. Software installed on EVERY computer of a lab (relational division)
SELECT s.software_name, l.lab_name
FROM software s CROSS JOIN lab l
WHERE EXISTS (SELECT 1 FROM computer c WHERE c.lab_id = l.lab_id)
  AND NOT EXISTS (
        SELECT 1 FROM computer c
        WHERE c.lab_id = l.lab_id
          AND NOT EXISTS (SELECT 1 FROM software_installation si
                          WHERE si.computer_id = c.computer_id AND si.software_id = s.software_id));