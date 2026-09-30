/**
 * Zod validation middleware.
 * Replaces req[source] with the parsed (and stripped) value.
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: result.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
        req[source] = result.data;
        next();
    };
}

module.exports = { validate };
