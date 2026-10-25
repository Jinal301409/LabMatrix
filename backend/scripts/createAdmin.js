require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/db");

(async () => {
    const [name, email, password] = process.argv.slice(2);

    if (!name || !email || !password) {
        console.log(
            'Usage: node scripts/createAdmin.js "Full Name" email password'
        );

        process.exitCode = 1;
        return;
    }

    try {
        const [existingUsers] = await pool.execute(
            "SELECT user_id FROM app_user WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            throw new Error("An account with this email already exists");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.execute(
            `INSERT INTO app_user
                (full_name, email, password_hash, role)
             VALUES (?, ?, ?, 'Admin')`,
            [name, email, passwordHash]
        );

        console.log("Admin created successfully:", email);
    } catch (error) {
        console.error("Failed to create Admin:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();