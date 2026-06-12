const express      = require("express");
const supabase     = require("../config/supabase");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("navigation_requests")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { destination } = req.body ?? {};

  if (!destination?.trim())
    return res.status(400).json({ message: "Destination is required" });
  if (destination.trim().length > 300)
    return res.status(400).json({ message: "Destination must be 300 characters or fewer" });

  const { data, error } = await supabase
    .from("navigation_requests")
    .insert([{ destination: destination.trim(), status: "requested", user_id: req.userId }])
    .select();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("navigation_requests")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select();
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "Navigation request not found" });
  res.json({ message: "Navigation request deleted successfully" });
}));

module.exports = router;
