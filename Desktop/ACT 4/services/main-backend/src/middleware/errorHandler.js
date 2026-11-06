/**
 * Global Error Handling Middleware for main-backend (Never leaks err.stack)
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.originalUrl} not found on main-backend`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Malformed JSON request body'
    });
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return res.status(statusCode).json({
    error: err.code || 'InternalServerError',
    message: statusCode === 500 ? 'An unexpected internal server error occurred' : (err.message || 'Request failed')
  });
}

module.exports = { notFoundHandler, errorHandler };

