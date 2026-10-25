const router = require("express").Router();
const { z } = require("zod");

const controller = require("../controllers/auth.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { isCollegeEmail } = require("../utils/collegeEmail");

const base = {
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(8).max(72),
    phone: z.string().max(15).optional()
};

const registerSchema = z.discriminatedUnion("role", [
    z.object({
        ...base,
        role: z.literal("Admin")
    }),

    z.object({
        ...base,
        role: z.literal("Student"),
        enrollment_no: z.string().min(1).max(20),
        batch_id: z.number().int().positive()
    }),

    z.object({
        ...base,
        role: z.literal("Faculty"),
        employee_id: z.string().min(1).max(20),
        department: z.string().min(1).max(60),
        designation: z.string().max(50).optional()
    }),

    z.object({
        ...base,
        role: z.literal("Technician"),
        employee_id: z.string().min(1).max(20),
        specialization: z.string().max(60).optional()
    })
]);

// Public sign-up: no "role" field on purpose. Everyone who signs up is a Student.
const signupSchema = z.object({
    full_name: base.full_name,
    email: base.email.refine(isCollegeEmail, {
        message: "Use your college email address"
    }),
    password: base.password
        .regex(/[A-Za-z]/, "Password must contain a letter")
        .regex(/[0-9]/, "Password must contain a number"),
    enrollment_no: z.string().trim().min(1).max(20),
    batch_id: z.number().int().positive()
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1)
});

// ---- Public endpoints ----
router.post("/login", validate(loginSchema), controller.login);
router.post("/signup", validate(signupSchema), controller.signup);
router.get("/batches", controller.batches);

// ---- Admin-only endpoint (create Faculty / Technician / Admin etc.) ----
router.post(
    "/register",
    auth,
    role("Admin"),
    validate(registerSchema),
    controller.register
);

// ---- Authenticated users can view their own profile ----
router.get("/me", auth, controller.me);

module.exports = router;