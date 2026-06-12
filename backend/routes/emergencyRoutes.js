const express      = require("express");
const supabase     = require("../config/supabase");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, phone, relation } = req.body ?? {};

  if (!name?.trim() || !phone?.trim() || !relation?.trim())
    return res.status(400).json({ message: "Name, phone and relation are required" });
  if (name.trim().length > 100)
    return res.status(400).json({ message: "Name must be 100 characters or fewer" });
  if (!/^\+?[\d\s\-() ]{7,20}$/.test(phone.trim()))
    return res.status(400).json({ message: "Invalid phone number (7–20 digits)" });
  if (relation.trim().length > 50)
    return res.status(400).json({ message: "Relation must be 50 characters or fewer" });

  const { data, error } = await supabase
    .from("emergency_contacts")
    .insert([{ name: name.trim(), phone: phone.trim(), relation: relation.trim(), user_id: req.userId }])
    .select();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select();
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "Emergency contact not found" });
  res.json({ message: "Emergency contact deleted successfully" });
}));

module.exports = router;
