/**
 * @description Central Express error handler.
 *
 * Without this, anything that calls next(err) — a multer rejection, a blocked
 * CORS origin — falls through to Express's default handler, which answers with
 * an HTML page reading "Internal Server Error" and status 500. The browser then
 * shows an opaque 500 with no usable message, and the real reason (wrong file
 * type, file too large, origin not allowlisted) is invisible to the caller.
 */
const multer = require('multer');

const MULTER_MESSAGES = {
    LIMIT_FILE_SIZE: 'File is too large',
    LIMIT_FILE_COUNT: 'Too many files uploaded',
    LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    LIMIT_PART_COUNT: 'Too many parts in the upload',
    LIMIT_FIELD_KEY: 'Field name is too long',
    LIMIT_FIELD_VALUE: 'Field value is too long',
    LIMIT_FIELD_COUNT: 'Too many fields in the upload',
};

// eslint-disable-next-line no-unused-vars — Express identifies handlers by arity
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof multer.MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        let message = MULTER_MESSAGES[err.code] || 'Upload rejected';
        if (err.code === 'LIMIT_FILE_SIZE' && req.uploadLimitMb) {
            message += ` — the limit is ${req.uploadLimitMb} MB`;
        }
        console.error(`Upload rejected (${err.code}) on ${req.method} ${req.originalUrl}`);
        return res.status(status).json({ message, code: err.code });
    }

    const status = err.status || err.statusCode || 500;
    console.error(`Error on ${req.method} ${req.originalUrl}:`, err.message);
    if (status >= 500) console.error(err.stack);

    res.status(status).json({
        message: status >= 500 ? 'Something went wrong on the server' : err.message,
    });
};

module.exports = { errorHandler };
