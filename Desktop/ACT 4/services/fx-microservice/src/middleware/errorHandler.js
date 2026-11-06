/**
 * Global Error Handling Middleware for fx-microservice (Never leaks err.stack)
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.originalUrl} not found on fx-microservice`
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

  if (err.statusCode === 502 || err.code === 'BadGateway') {
    return res.status(502).json({
      error: 'BadGateway',
      message: err.message || 'Upstream Banxico SIE API (SF43718) is unreachable or timed out',
      cachedRate: err.cachedRate ?? 19.854,
      stale: true
    });
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return res.status(statusCode).json({
    error: err.code || 'InternalServerError',
    message: statusCode === 500 ? 'An unexpected internal server error occurred' : (err.message || 'Request failed')
  });
}

module.exports = { notFoundHandler, errorHandler };

