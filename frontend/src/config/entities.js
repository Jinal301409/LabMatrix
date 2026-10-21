// Describes every page: its title, table columns, form fields and who may use it.
//   t:'ref'  -> a dropdown filled from /api/options/<ref>
//   hideFor  -> roles that do not see that field (the server fills it in for them)
const STATUS = ['Working', 'Under Maintenance', 'Retired']
const F = (k, l, t = 'text', o = {}) => ({ k, l, t, ...o })
const isAdmin = (u) => u.role === 'Admin'
const isStaff = (u) => ['Admin', 'Technician'].includes(u.role)

export const ENTITIES = {
  labs: {
    title: 'Labs', group: 'Resources', id: 'lab_id', roles: ['Admin'],
    cols: ['lab_name', 'building', 'floor', 'capacity', 'lab_type', 'in_charge_name'],
    fields: [
      F('lab_name', 'Lab name'), F('building', 'Building'), F('floor', 'Floor', 'number'),
      F('capacity', 'Capacity', 'number'),
      F('lab_type', 'Type', 'select', { opts: ['Computer', 'Electronics', 'Network', 'Research', 'General'] }),
      F('in_charge_faculty_id', 'In-charge faculty', 'ref', { ref: 'faculty', optional: true }),
    ],
  },
  computers: {
    title: 'Computers', group: 'Resources', id: 'computer_id', roles: ['Admin', 'Technician'],
    cols: ['computer_id', 'asset_number', 'lab_name', 'processor', 'ram_gb', 'operating_system', 'status', 'warranty_expiry'],
    fields: [
      F('lab_id', 'Lab', 'ref', { ref: 'labs' }), F('asset_number', 'Asset number'),
      F('processor', 'Processor', 'text', { optional: true }), F('ram_gb', 'RAM (GB)', 'number'),
      F('storage_gb', 'Storage (GB)', 'number', { optional: true }),
      F('operating_system', 'OS', 'text', { optional: true }),
      F('status', 'Status', 'select', { opts: STATUS }),
      F('purchase_date', 'Purchase date', 'date', { optional: true }),
      F('warranty_expiry', 'Warranty expiry', 'date', { optional: true }),
    ],
  },
  equipment: {
    title: 'Equipment', group: 'Resources', id: 'equipment_id', roles: ['Admin', 'Technician'],
    cols: ['equipment_id', 'asset_number', 'equipment_name', 'equipment_type', 'lab_name', 'status', 'warranty_expiry'],
    fields: [
      F('lab_id', 'Lab', 'ref', { ref: 'labs' }), F('asset_number', 'Asset number'), F('equipment_name', 'Name'),
      F('equipment_type', 'Type', 'select', { opts: ['Projector', 'Printer', 'Router', 'Switch', 'Oscilloscope', 'UPS', 'Other'] }),
      F('status', 'Status', 'select', { opts: STATUS }),
      F('purchase_date', 'Purchase date', 'date', { optional: true }),
      F('warranty_expiry', 'Warranty expiry', 'date', { optional: true }),
    ],
  },
  software: {
    title: 'Software', group: 'Resources', id: 'software_id', roles: ['Admin'],
    cols: ['software_name', 'version', 'vendor', 'license_type', 'total_licenses', 'seats_used', 'license_expiry'],
    fields: [
      F('software_name', 'Name'), F('version', 'Version'), F('vendor', 'Vendor', 'text', { optional: true }),
      F('license_type', 'License', 'select', { opts: ['Open Source', 'Educational', 'Commercial', 'Site License'] }),
      F('total_licenses', 'Seats (blank = unlimited)', 'number', { optional: true }),
      F('license_expiry', 'Expiry (blank = perpetual)', 'date', { optional: true }),
    ],
  },
  installs: {
    title: 'Installations', group: 'Resources', id: 'install_id', roles: ['Admin', 'Technician'],
    cols: ['asset_number', 'software_name', 'version', 'install_date'],
    fields: [
      F('computer_id', 'Computer ID (see the Computers page)', 'number'),
      F('software_id', 'Software', 'ref', { ref: 'software' }),
      F('install_date', 'Install date', 'date', { optional: true }),
    ],
  },
  sessions: {
    title: 'Lab sessions', group: 'Academics', id: 'session_id', roles: ['Admin', 'Faculty'],
    cols: ['session_date', 'start_time', 'end_time', 'lab_name', 'course_code', 'batch_name', 'faculty_name', 'topic'],
    canEditRow: (r, u) => isAdmin(u) || r.faculty_id === u.user_id,
    canDeleteRow: (r, u) => isAdmin(u) || r.faculty_id === u.user_id,
    fields: [
      F('lab_id', 'Lab', 'ref', { ref: 'labs' }),
      F('faculty_id', 'Faculty', 'ref', { ref: 'faculty', hideFor: ['Faculty'] }),
      F('course_id', 'Course', 'ref', { ref: 'courses' }), F('batch_id', 'Batch', 'ref', { ref: 'batches' }),
      F('session_date', 'Date', 'date'), F('start_time', 'Start', 'time'), F('end_time', 'End', 'time'),
      F('topic', 'Topic', 'text', { optional: true, full: true }),
    ],
  },
  bookings: {
    title: 'Lab bookings', group: 'Academics', id: 'booking_id', roles: ['Admin', 'Faculty'], approve: true,
    statusOptions: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    cols: ['lab_name', 'faculty_name', 'start_datetime', 'end_datetime', 'purpose', 'status'],
    canEditRow: (r, u) => isAdmin(u) || r.status === 'Pending',
    canDeleteRow: (r, u) => isAdmin(u) || r.status !== 'Approved',
    fields: [
      F('lab_id', 'Lab', 'ref', { ref: 'labs' }),
      F('faculty_id', 'Faculty', 'ref', { ref: 'faculty', hideFor: ['Faculty'] }),
      F('start_datetime', 'Start', 'datetime-local'), F('end_datetime', 'End', 'datetime-local'),
      F('purpose', 'Purpose', 'textarea', { full: true }),
    ],
  },
  batches: {
    title: 'Batches', group: 'Academics', id: 'batch_id', roles: ['Admin'],
    cols: ['batch_name', 'branch', 'semester'],
    fields: [F('batch_name', 'Batch name'), F('branch', 'Branch'), F('semester', 'Semester (1-8)', 'number')],
  },
  courses: {
    title: 'Courses', group: 'Academics', id: 'course_id', roles: ['Admin'],
    cols: ['course_code', 'course_name', 'semester', 'credits'],
    fields: [
      F('course_code', 'Code'), F('course_name', 'Name'),
      F('semester', 'Semester', 'number'), F('credits', 'Credits', 'number'),
    ],
  },
  requests: {
    title: 'Fault reports', group: 'Maintenance', id: 'request_id',
    roles: ['Admin', 'Faculty', 'Student', 'Technician'],
    cols: ['request_id', 'computer_asset', 'equipment_asset', 'description', 'priority', 'status', 'reported_by_name', 'reported_date'],
    // staff change any report; everyone else only their own report while it is still Open
    canEditRow: (r, u) => isStaff(u) || (r.reported_by === u.user_id && r.status === 'Open'),
    canDeleteRow: (r, u) => isStaff(u) || (r.reported_by === u.user_id && r.status === 'Open'),
    fields: [
      F('computer_id', 'Computer ID (or blank)', 'number', { optional: true }),
      F('equipment_id', 'Equipment ID (or blank)', 'number', { optional: true }),
      F('priority', 'Priority', 'select', { opts: ['Low', 'Medium', 'High'] }),
      F('status', 'Status', 'select', { opts: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'], hideFor: ['Faculty', 'Student'] }),
      F('description', 'What is wrong?', 'textarea', { full: true }),
    ],
  },
  maintenance: {
    title: 'Repair jobs', group: 'Maintenance', id: 'maintenance_id', roles: ['Admin', 'Technician'],
    cols: ['request_id', 'asset', 'request_description', 'technician_name', 'start_date', 'end_date', 'cost', 'status'],
    canDeleteRow: (r, u) => isAdmin(u),
    fields: [
      F('request_id', 'Fault report', 'ref', { ref: 'requests' }),
      F('technician_id', 'Technician', 'ref', { ref: 'technicians', hideFor: ['Technician'] }),
      F('start_date', 'Start', 'date'), F('end_date', 'End', 'date', { optional: true }),
      F('cost', 'Cost (Rs)', 'number'),
      F('status', 'Status', 'select', { opts: ['Assigned', 'In Progress', 'Completed'] }),
      F('remarks', 'Remarks', 'textarea', { optional: true, full: true }),
    ],
  },
  users: {
    title: 'Users', group: 'Admin', id: 'user_id', roles: ['Admin'],
    cols: ['full_name', 'email', 'role', 'phone', 'is_active'],
    fields: [
      F('full_name', 'Full name'), F('email', 'Email', 'email'),
      F('password', 'Password (new users)', 'password', { optional: true }),
      F('role', 'Role', 'select', { opts: ['Admin', 'Faculty', 'Student', 'Technician'] }),
      F('phone', 'Phone', 'text', { optional: true }),
      F('enrollment_no', 'Enrollment no (students)', 'text', { optional: true }),
      F('batch_id', 'Batch', 'ref', { ref: 'batches', optional: true }),
      F('employee_id', 'Employee ID (staff)', 'text', { optional: true }),
      F('department', 'Department (faculty)', 'text', { optional: true }),
    ],
  },
}

// Which sidebar pages each role can see
export const ACCESS = {
  Admin: Object.keys(ENTITIES),
  Faculty: ['labs', 'computers', 'equipment', 'software', 'sessions', 'bookings', 'batches', 'courses', 'requests'],
  Student: ['labs', 'sessions', 'requests'],
  Technician: ['labs', 'computers', 'equipment', 'installs', 'requests', 'maintenance'],
}

export const label = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
