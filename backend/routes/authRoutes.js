const express  = require("express");
const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const supabase = require("../config/supabase");

const router        = express.Router();
const BCRYPT_ROUNDS = 12;

const signToken = (user) =>
  jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

/* ── POST /api/auth/register ── */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const normalEmail = email.trim().toLowerCase();

    const { data: existing, error: lookupErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalEmail)
      .maybeSingle();
    if (lookupErr) throw lookupErr;
    if (existing)
      return res.status(409).json({ message: "Email already registered. Please sign in." });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { data: user, error: insertErr } = await supabase
      .from("users")
      .insert([{ name: name.trim(), email: normalEmail, password_hash }])
      .select("id, name, email")
      .single();
    if (insertErr) throw insertErr;

    res.status(201).json({ id: user.id, name: user.name, email: user.email, token: signToken(user) });
  } catch (err) {
    console.error("[register]", err.message);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

/* ── POST /api/auth/login ── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email?.trim() || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid email or password." });

    res.json({ id: user.id, name: user.name, email: user.email, token: signToken(user) });
  } catch (err) {
    console.error("[login]", err.message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

module.exports = router;
