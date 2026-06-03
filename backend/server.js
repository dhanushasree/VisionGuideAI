const express    = require("express");
const cors       = require("cors");
const dotenv     = require("dotenv");
const rateLimit  = require("express-rate-limit");
const helmet     = require("helmet");
const auth       = require("./middleware/auth");
const multer     = require("multer");
const axios      = require("axios");
const FormData   = require("form-data");

dotenv.config();

/* ── Fail fast if required env vars are missing ── */
["SUPABASE_URL", "SUPABASE_KEY", "API_KEY", "GROQ_API_KEY", "JWT_SECRET"].forEach(k => {
  if (!process.env[k]) {
    console.error(`[startup] Missing required environment variable: ${k}`);
    process.exit(1);
  }
});

const app = express();

/* ── Security headers ── */
app.use(helmet({ contentSecurityPolicy: false })); // CSP off — app uses inline styles

/* ── CORS: allow localhost (http+https) + any LAN IP ── */
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
    ) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

/* ── Body parser: cap at 10 kb to block oversized payloads ── */
app.use(express.json({ limit: "10kb" }));

/* ── General rate limit: 100 req / 15 min per IP ── */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
}));

/* ── API key auth on all /api/* routes ── */
app.use(auth);

/* ── Health + root ── */
app.get("/", (req, res) => {
  res.json({
    app: "VisionGuide AI Backend",
    status: "running with Supabase database",
    endpoints: {
      emergencyContacts: "/api/emergency",
      articles:          "/api/articles",
      commands:          "/api/commands",
      navigation:        "/api/navigation",
      sosAlerts:         "/api/sos",
      savedLocations:    "/api/locations",
      feedback:          "/api/feedback",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "VisionGuide AI backend is healthy" });
});

/* ── Stricter rate limit for auth endpoints: 10 attempts / 15 min per IP ── */
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please wait 15 minutes." },
}));

/* ── API Routes ── */
app.use("/api/auth",       require("./routes/authRoutes"));
app.use("/api/emergency",  require("./routes/emergencyRoutes"));
app.use("/api/articles",   require("./routes/articleRoutes"));
app.use("/api/commands",   require("./routes/commandRoutes"));
app.use("/api/navigation", require("./routes/navigationRoutes"));
app.use("/api/locations",  require("./routes/locationRoutes"));
app.use("/api/feedback",   require("./routes/feedbackRoutes"));

/* ── SOS gets a stricter limit: 5 alerts / 15 min per IP ── */
app.use("/api/sos", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many SOS alerts. Please wait before sending another." },
}));
app.use("/api/sos", require("./routes/sosRoutes"));

/* ── Image analysis via Groq LLaMA Vision API ── */
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post("/api/analyze-image", imageUpload.single("image"), async (req, res) => {
  try {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY not configured" });
    if (!req.file)  return res.status(400).json({ error: "No image provided" });

    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType    = req.file.mimetype || "image/jpeg";

    const groqRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: "text",
                text: "You are an accessibility assistant helping visually impaired users understand images. Describe this image clearly and concisely: list every visible object, their approximate positions (left, right, center, foreground, background), colors, and any visible text. Be specific but keep it under 3 sentences.",
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      },
      {
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    const description = (groqRes.data.choices?.[0]?.message?.content || "").trim();
    res.json({ description });
  } catch (err) {
    console.error("[Vision] Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image analysis failed" });
  }
});

/* ── Transcription via Groq Whisper API ── */
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.post("/api/transcribe", audioUpload.single("audio"), async (req, res) => {
  try {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY not set in backend .env" });
    if (!req.file)  return res.status(400).json({ error: "No audio file received" });

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename:    "audio.webm",
      contentType: req.file.mimetype || "audio/webm",
    });
    form.append("model",           "whisper-large-v3-turbo");
    form.append("language",        "en");
    form.append("response_format", "json");

    const groqRes = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      form,
      { headers: { Authorization: `Bearer ${GROQ_KEY}`, ...form.getHeaders() }, timeout: 30000 }
    );

    const text = (groqRes.data.text || "").trim();
    res.json({ text });
  } catch (err) {
    console.error("[Transcribe] Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || "Transcription failed" });
  }
});

/* ── Global error handler (must be last) ── */
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err.stack);
  const status  = err.status || 500;
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Internal server error";
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`VisionGuide AI backend running on port ${PORT}`);
});
