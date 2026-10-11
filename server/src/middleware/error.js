// Async route wrapper - avoids try/catch boilerplate in controllers
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res, _next) => {
  res.status(404).json({ message: `Route not found: ${req.method}` });
};

// Never echo an unrecognised error's message to the client: internal failures
// (Mongo driver text, TypeErrors, file paths) would otherwise leak internals.
// Only messages the app raised deliberately carry a statusCode and are shown.
export const errorHandler = (err, req, res, _next) => {
  const isAppError = typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600;
  let status = isAppError ? err.statusCode : 500;
  let message = isAppError ? err.message : 'Something went wrong. Please try again.';

  if (err?.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err?.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `That ${field} is already in use`;
  }
  if (err?.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }

  if (status >= 500) {
    // Log the detail server-side; send only the generic message.
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }
  res.status(status).json({ message });
};
