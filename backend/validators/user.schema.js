const { z } = require('zod');

const base = {
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(15).optional(),
};

exports.registerSchema = z.discriminatedUnion('role', [
  z.object({ ...base, role: z.literal('Admin') }),
  z.object({
    ...base, role: z.literal('Student'),
    enrollment_no: z.string().trim().min(1).max(20),
    batch_id: z.number().int().positive(),
  }),
  z.object({
    ...base, role: z.literal('Faculty'),
    employee_id: z.string().trim().min(1).max(20),
    department: z.string().trim().min(1).max(60),
    designation: z.string().trim().max(50).optional(),
  }),
  z.object({
    ...base, role: z.literal('Technician'),
    employee_id: z.string().trim().min(1).max(20),
    specialization: z.string().trim().max(60).optional(),
  }),
]);

// every field optional; the role itself cannot be changed
exports.updateSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(120).optional(),
  password: z.string().min(8).max(72).optional(),
  phone: z.string().trim().max(15).optional(),
  is_active: z.boolean().optional(),
  role: z.enum(['Admin', 'Faculty', 'Student', 'Technician']).optional(),
  enrollment_no: z.string().trim().min(1).max(20).optional(),
  batch_id: z.number().int().positive().optional(),
  employee_id: z.string().trim().min(1).max(20).optional(),
  department: z.string().trim().min(1).max(60).optional(),
  designation: z.string().trim().max(50).optional(),
  specialization: z.string().trim().max(60).optional(),
});