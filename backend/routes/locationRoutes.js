const express      = require("express");
const supabase     = require("../config/supabase");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { place_name, address } = req.body ?? {};

  if (!place_name?.trim())
    return res.status(400).json({ message: "Place name is required" });
  if (place_name.trim().length > 100)
    return res.status(400).json({ message: "Place name must be 100 characters or fewer" });
  if (address && address.length > 300)
    return res.status(400).json({ message: "Address must be 300 characters or fewer" });

  const { data, error } = await supabase
    .from("saved_locations")
    .insert([{ place_name: place_name.trim(), address: address?.trim() ?? null, user_id: req.userId }])
    .select();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("saved_locations")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select();
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "Saved location not found" });
  res.json({ message: "Saved location deleted successfully" });
}));

module.exports = router;
