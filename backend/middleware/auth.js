const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
        return next(new AppError("Login required", 401));
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        next(new AppError("Invalid or expired token", 401));
    }
};