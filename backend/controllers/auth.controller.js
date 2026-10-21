const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const authService = require("../services/auth.service");
const userModel = require("../models/user.model");
const batchModel = require("../models/batch.model");

exports.register = asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);

    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data
    });
});

// Public: students create their own account
exports.signup = asyncHandler(async (req, res) => {
    const data = await authService.signup(req.body);

    res.status(201).json({
        success: true,
        message: "Account created. You can now sign in.",
        data
    });
});

// Public: batch list for the sign-up form dropdown
exports.batches = asyncHandler(async (req, res) => {
    const rows = await batchModel.findAll();

    res.status(200).json({
        success: true,
        data: rows.map((b) => ({
            batch_id: b.batch_id,
            batch_name: b.batch_name,
            branch: b.branch,
            semester: b.semester
        }))
    });
});

exports.login = asyncHandler(async (req, res) => {
    const data = await authService.login(
        req.body.email,
        req.body.password
    );

    res.status(200).json({
        success: true,
        message: "Login successful",
        data
    });
});

exports.me = asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.user.user_id);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    res.status(200).json({
        success: true,
        data: user
    });
});