const express  = require("express");
const supabase = require("../config/supabase");
const router   = express.Router();

/* ── keyword banks ── */
/* "stop" alone is checked by exact/start match so "bus stop near me" doesn't trigger it */
const STOP_KEYWORDS = [
  "stop reading", "stop voice", "stop talking", "be quiet",
  "silence", "mute", "shut up", "cancel"
];

/* "emergency" alone removed — too broad; clashes with "emergency contacts" */
const SOS_KEYWORDS = [
  "send sos", "sos", "emergency help", "emergency alert",
  "help me", "i need help", "call for help", "trigger sos",
  "send alert", "ambulance", "i am in danger", "danger"
];

const HELP_KEYWORDS = [
  "help", "what can i say", "commands", "command list",
  "what can you do", "available commands", "list commands",
  "how to use", "what to say"
];

const CONTACTS_KEYWORDS = [
  "read contacts", "read contact", "read emergency contacts",
  "read saved contacts", "show contacts", "show emergency contacts",
  "list contacts", "my contacts", "saved contacts",
  "contact list", "contacts", "contact"
];

const ARTICLES_KEYWORDS = [
  "read articles", "read article", "read saved articles",
  "show articles", "list articles", "my articles",
  "saved articles", "article list", "articles", "article"
];

const LOCATIONS_KEYWORDS = [
  "read locations", "read saved locations", "read my locations",
  "show saved locations", "show locations", "list locations",
  "my locations", "saved locations", "saved places",
  "location list", "locations", "location"
];

const NAVIGATION_KEYWORDS = [
  "navigate to", "navigate", "go to", "take me to",
  "open map for", "open map", "open maps", "show map",
  "directions to", "route to", "find route", "map to",
  "hospital near me", "hospital nearby", "nearest hospital",
  "hotel near me", "hotel nearby", "nearest hotel",
  "pharmacy near me", "pharmacy nearby", "nearest pharmacy",
  "medical store near me", "medicine shop near me",
  "atm near me", "atm nearby", "nearest atm", "cash machine",
  "police station near me", "police nearby", "nearest police",
  "bus stop near me", "bus stop nearby", "nearest bus stop",
  "restaurant near me", "restaurant nearby", "nearest restaurant",
  "food near me", "cafe near me",
  "bank near me", "bank nearby", "nearest bank",
  "college near me", "school near me",
  "petrol station near me", "fuel station near me",
  "airport near me", "nearest airport",
  "home", "college", "office", "school"
];

const GREETING_KEYWORDS = [
  "hello", "hi", "hey", "good morning", "good afternoon",
  "good evening", "how are you", "who are you", "visionguide",
  "greetings", "what's up", "howdy"
];

/* ── helper ── */
const has = (t, keywords) => keywords.some(k => t.includes(k));

/* ── GET /api/commands ── */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("commands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ message: error.message });
    res.json(data.map(item => ({
      id:           item.id,
      commandText:  item.command_text,
      responseText: item.response_text,
      commandType:  item.command_type,
      createdAt:    item.created_at,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── POST /api/commands ── */
router.post("/", async (req, res) => {
  try {
    const { commandText } = req.body;
    if (!commandText) {
      return res.status(400).json({ message: "Command text is required" });
    }

    const t = commandText.toLowerCase().trim();

    let responseText = "Sorry, I did not understand that command. Say help to hear what you can do.";
    let commandType  = "unknown";

    /* Priority order: stop → sos → help → contacts → articles →
       locations → navigation → greeting
       "stop" alone is matched exactly so "bus stop near me" is not affected */
    if (t === "stop" || has(t, STOP_KEYWORDS)) {
      responseText = "Stopping voice reading.";
      commandType  = "stop";

    } else if (has(t, SOS_KEYWORDS)) {
      responseText = "Sending SOS alert. Your emergency contacts will be notified. Stay calm.";
      commandType  = "sos";

    } else if (has(t, HELP_KEYWORDS)) {
      responseText =
        "You can say: hello, read contacts, read articles, read saved locations, " +
        "hospital near me, navigate to home, send SOS, stop reading, or help.";
      commandType  = "help";

    } else if (has(t, CONTACTS_KEYWORDS)) {
      responseText = "Reading your emergency contacts.";
      commandType  = "contacts";

    } else if (has(t, ARTICLES_KEYWORDS)) {
      responseText = "Reading your saved articles.";
      commandType  = "articles";

    } else if (has(t, LOCATIONS_KEYWORDS)) {
      responseText = "Reading your saved locations.";
      commandType  = "locations";

    } else if (has(t, NAVIGATION_KEYWORDS)) {
      responseText = `Opening navigation for ${commandText}.`;
      commandType  = "navigation";

    } else if (has(t, GREETING_KEYWORDS)) {
      responseText = "Hello, I am VisionGuide AI. How can I help you?";
      commandType  = "greeting";
    }

    /* Save to Supabase in background — does not block the response */
    supabase.from("commands").insert([{
      command_text:  commandText,
      response_text: responseText,
      command_type:  commandType,
    }]).then(({ error }) => {
      if (error) console.error("[commands] log failed:", error.message);
    });

    res.status(201).json({
      commandText,
      responseText,
      commandType,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── DELETE /api/commands/:id ── */
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("commands")
      .delete()
      .eq("id", req.params.id)
      .select();
    if (error) return res.status(500).json({ message: error.message });
    if (!data?.length) return res.status(404).json({ message: "Command not found" });
    res.json({ message: "Command deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
