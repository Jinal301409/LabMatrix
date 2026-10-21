const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");
const userModel = require("../models/user.model");
const AppError = require("../utils/AppError");
const { isCollegeEmail } = require("../utils/collegeEmail");

// Admin-created accounts (any role). Used by POST /auth/register and POST /users.
exports.register = async (data) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const existingUser = await userModel.findByEmail(data.email);

        if (existingUser) {
            throw new AppError("Email already registered", 409);
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const [result] = await connection.execute(
            `INSERT INTO app_user
                (full_name, email, password_hash, role, phone)
             VALUES (?, ?, ?, ?, ?)`,
            [
                data.full_name,
                data.email,
                passwordHash,
                data.role,
                data.phone ?? null
            ]
        );

        const userId = result.insertId;

        if (data.role === "Student") {
            await connection.execute(
                `INSERT INTO student
                    (user_id, enrollment_no, batch_id)
                 VALUES (?, ?, ?)`,
                [
                    userId,
                    data.enrollment_no,
                    data.batch_id
                ]
            );
        } else if (data.role === "Faculty") {
            await connection.execute(
                `INSERT INTO faculty
                    (user_id, employee_id, department, designation)
                 VALUES (?, ?, ?, ?)`,
                [
                    userId,
                    data.employee_id,
                    data.department,
                    data.designation ?? null
                ]
            );
        } else if (data.role === "Technician") {
            await connection.execute(
                `INSERT INTO technician
                    (user_id, employee_id, specialization)
                 VALUES (?, ?, ?)`,
                [
                    userId,
                    data.employee_id,
                    data.specialization ?? null
                ]
            );
        }

        await connection.commit();

        return {
            user_id: userId,
            full_name: data.full_name,
            email: data.email,
            role: data.role
        };
    } catch (error) {
        await connection.rollback();

        if (error.code === "ER_DUP_ENTRY") {
            throw new AppError("Email or enrollment number already exists", 409);
        }

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            throw new AppError(
                "Referenced record does not exist. Check the batch or related ID.",
                400
            );
        }

        throw error;
    } finally {
        connection.release();
    }
};

// Public self sign-up. The role is ALWAYS Student, whatever the client sends.
// Faculty / Technician / Admin accounts are still created by an Admin.
exports.signup = async (data) => {
    if (!isCollegeEmail(data.email)) {
        throw new AppError("Please sign up with your college email address", 400);
    }

    return exports.register({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: "Student",
        enrollment_no: data.enrollment_no,
        batch_id: data.batch_id
    });
};

exports.login = async (email, password) => {
    const user = await userModel.findByEmail(email);

    if (
        !user ||
        !(await bcrypt.compare(password, user.password_hash))
    ) {
        throw new AppError("Invalid email or password", 401);
    }

    if (!user.is_active) {
        throw new AppError("Account is deactivated", 403);
    }

    const token = jwt.sign(
        {
            user_id: user.user_id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );

    return {
        token,
        user: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        }
    };
};