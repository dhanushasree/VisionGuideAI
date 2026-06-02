const express = require("express");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");

const router  = express.Router();
const DB_FILE = path.join(__dirname, "../data/users.json");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

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

/* POST /api/auth/register */
router.post("/register", (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !password)
    return res.status(400).json({ message: "Name, email and password are required." });
  if (password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });

  const users  = readUsers();
  const exists = users.find(u => u.email === email.trim().toLowerCase());
  if (exists)
    return res.status(409).json({ message: "Email already registered. Please sign in." });

  const user = {
    id:        Date.now().toString(),
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    password:  sha256(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);

  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

/* POST /api/auth/login */
router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email?.trim() || !password)
    return res.status(400).json({ message: "Email and password are required." });

  const users = readUsers();
  const user  = users.find(
    u => u.email === email.trim().toLowerCase() && u.password === sha256(password)
  );

  if (!user)
    return res.status(401).json({ message: "Invalid email or password." });

  res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = router;
