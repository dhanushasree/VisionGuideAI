const express      = require("express");
const supabase     = require("../config/supabase");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("sos_alerts")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { message, location } = req.body ?? {};

  if (!message?.trim())
    return res.status(400).json({ message: "SOS message is required" });
  if (message.trim().length > 500)
    return res.status(400).json({ message: "Message must be 500 characters or fewer" });
  if (location && location.length > 300)
    return res.status(400).json({ message: "Location must be 300 characters or fewer" });

  const { data, error } = await supabase
    .from("sos_alerts")
    .insert([{ message: message.trim(), location: location?.trim() ?? null, status: "sent", user_id: req.userId }])
    .select();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("sos_alerts")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select();
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "SOS alert not found" });
  res.json({ message: "SOS alert deleted successfully" });
}));

module.exports = router;
