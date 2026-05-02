const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? "Server error" : err?.message || "Error",
    error: err?.message || String(err),
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
};

module.exports = { notFound, errorHandler };