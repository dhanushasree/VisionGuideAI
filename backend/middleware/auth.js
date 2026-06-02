module.exports = (req, res, next) => {
  // Allow root, health, and auth routes without API key
  if (req.path === "/" || req.path === "/health" || req.path.startsWith("/api/auth"))
    return next();

  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ message: "Unauthorized: invalid or missing API key" });
  }
  next();
};
