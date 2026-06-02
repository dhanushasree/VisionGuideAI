const express      = require("express");
const supabase     = require("../config/supabase");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { title, content } = req.body ?? {};

  if (!title?.trim() || !content?.trim())
    return res.status(400).json({ message: "Title and content are required" });
  if (title.trim().length > 200)
    return res.status(400).json({ message: "Title must be 200 characters or fewer" });
  if (content.trim().length > 20000)
    return res.status(400).json({ message: "Content must be 20,000 characters or fewer" });

  const { data, error } = await supabase
    .from("articles")
    .insert([{ title: title.trim(), content: content.trim() }])
    .select();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", req.params.id)
    .select();
  if (error) return res.status(500).json({ message: error.message });
  if (!data || data.length === 0)
    return res.status(404).json({ message: "Article not found" });
  res.json({ message: "Article deleted successfully" });
}));

module.exports = router;
