const express      = require("express");
const supabase     = require("../config/supabase");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("user_feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, feedback, rating } = req.body ?? {};

  if (!feedback?.trim())
    return res.status(400).json({ message: "Feedback is required" });
  if (feedback.trim().length > 2000)
    return res.status(400).json({ message: "Feedback must be 2,000 characters or fewer" });
  if (name && name.length > 100)
    return res.status(400).json({ message: "Name must be 100 characters or fewer" });

  // Validate rating: must be integer 1–5 if provided
  let cleanRating = null;
  if (rating !== undefined && rating !== null && rating !== "") {
    cleanRating = parseInt(rating, 10);
    if (isNaN(cleanRating) || cleanRating < 1 || cleanRating > 5)
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
  }

  const { data, error } = await supabase
    .from("user_feedback")
    .insert([{ name: name?.trim() ?? null, feedback: feedback.trim(), rating: cleanRating }])
    .select();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("user_feedback")
    .delete()
    .eq("id", req.params.id)
    .select();
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "Feedback not found" });
  res.json({ message: "Feedback deleted successfully" });
}));

module.exports = router;
