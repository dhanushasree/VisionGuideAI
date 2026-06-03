const express = require("express");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");

const router        = express.Router();
const DB_FILE       = path.join(__dirname, "../data/users.json");
const BCRYPT_ROUNDS = 12;

/* Detect a raw SHA-256 hex string (legacy format) */
const isLegacySHA256 = (h) => /^[a-f0-9]{64}$/.test(h);
const sha256         = (s) => crypto.createHash("sha256").update(s).digest("hex");

const signToken = (user) =>
  jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

function readUsers() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch { return []; }
}

function writeUsers(users) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf8");
}

/* ── POST /api/auth/register ── */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const users  = readUsers();
    const exists = users.find(u => u.email === email.trim().toLowerCase());
    if (exists)
      return res.status(409).json({ message: "Email already registered. Please sign in." });

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user   = {
      id:        Date.now().toString(),
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      password:  hashed,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeUsers(users);

    const token = signToken(user);
    res.status(201).json({ id: user.id, name: user.name, email: user.email, token });
  } catch {
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

/* ── POST /api/auth/login ── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email?.trim() || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const users = readUsers();
    const user  = users.find(u => u.email === email.trim().toLowerCase());
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    let passwordMatch = false;

    if (isLegacySHA256(user.password)) {
      /* Legacy SHA-256 account — compare then silently migrate to bcrypt */
      passwordMatch = sha256(password) === user.password;
      if (passwordMatch) {
        user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
        writeUsers(users);
      }
    } else {
      passwordMatch = await bcrypt.compare(password, user.password);
    }

    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid email or password." });

    const token = signToken(user);
    res.json({ id: user.id, name: user.name, email: user.email, token });
  } catch {
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

module.exports = router;
