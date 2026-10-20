require("dotenv").config();

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    // Return DATE / DATETIME columns as plain text like "2026-10-20".
    // Without this, Node turns them into JS Dates, and on an India-time laptop
    // the screen then shows the previous day.
    dateStrings: true,
});

module.exports = pool;