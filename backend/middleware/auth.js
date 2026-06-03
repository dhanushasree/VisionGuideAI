const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  /* Public routes — no auth required */
  if (req.path === "/" || req.path === "/health" || req.path.startsWith("/api/auth"))
    return next();

  /* ── Primary: JWT session token issued at login ── */
  const sessionToken = req.headers["x-session-token"];
  if (sessionToken) {
    try {
      const payload = jwt.verify(sessionToken, process.env.JWT_SECRET);
      req.userId = payload.userId;
      return next();
    } catch {
      /* expired or tampered — fall through to API key check */
    }
  }

  /* ── Fallback: static API key (server-to-server / dev testing only) ── */
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === process.env.API_KEY) return next();

  return res.status(401).json({ message: "Unauthorized: please sign in again" });
};
