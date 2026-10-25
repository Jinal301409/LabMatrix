const AppError = require("../utils/AppError");

module.exports = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const message = result.error.issues
                .map((issue) => {
                    return `${issue.path.join(".")}: ${issue.message}`;
                })
                .join("; ");

            return next(new AppError(message, 400));
        }

        req.body = result.data;

        next();
    };
};