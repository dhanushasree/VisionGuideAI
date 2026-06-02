const express  = require("express");
const supabase = require("../config/supabase");
const router   = express.Router();

/* GET /api/commands */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("commands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ message: error.message });
    res.json(data.map(item => ({
      id:          item.id,
      commandText: item.command_text,
      responseText:item.response_text,
      commandType: item.command_type,
      createdAt:   item.created_at,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* POST /api/commands */
router.post("/", async (req, res) => {
  try {
    const { commandText } = req.body;
    if (!commandText) return res.status(400).json({ message: "Command text is required" });

    let responseText = "Sorry, I did not understand the command.";
    let commandType  = "unknown";

    const t = commandText.toLowerCase().trim();
    const has = (...kw) => kw.some(k => t.includes(k));

    if      (has("stop","stop reading","stop voice","mute"))
      { responseText = "Stopping voice reading."; commandType = "stop"; }
    else if (has("send sos","sos","emergency help","help me","emergency","i need help"))
      { responseText = "Sending SOS alert."; commandType = "sos"; }
    else if (has("help","what can i say","commands","command list"))
      { responseText = "You can say: hello, read contacts, read articles, read saved locations, hospital near me, navigate to home, send SOS, stop reading, or help."; commandType = "help"; }
    else if (has("read contacts","read contact","read emergency contacts","read saved contacts","contacts","contact"))
      { responseText = "Reading your emergency contacts."; commandType = "contacts"; }
    else if (has("read articles","read article","read saved articles","articles","article"))
      { responseText = "Reading your saved articles."; commandType = "articles"; }
    else if (has("read locations","read saved locations","read my locations","show saved locations","saved locations","locations"))
      { responseText = "Reading your saved locations."; commandType = "locations"; }
    else if (has("navigate","navigate to","go to","open map","open maps","map",
                 "hospital near me","hotel near me","pharmacy near me","atm near me",
                 "bank near me","police station near me","bus stop near me",
                 "restaurant near me","college","home"))
      { responseText = `Opening navigation for ${commandText}.`; commandType = "navigation"; }
    else if (has("hello","hi","hey"))
      { responseText = "Hello, I am VisionGuide AI. How can I help you?"; commandType = "greeting"; }
    else if (has("thank you","thanks","thank u"))
      { responseText = "You are welcome! Always here to help."; commandType = "greeting"; }
    else if (has("what time","current time","time"))
      { responseText = `The current time is ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}.`; commandType = "time"; }

    // Log to Supabase in background — don't block the response
    supabase.from("commands").insert([{
      command_text:  commandText,
      response_text: responseText,
      command_type:  commandType,
    }]).then(({ error }) => { if (error) console.error("[commands] log failed:", error.message); });

    // Respond immediately
    res.status(201).json({ commandText, responseText, commandType, createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* DELETE /api/commands/:id */
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("commands").delete().eq("id", req.params.id).select();
    if (error) return res.status(500).json({ message: error.message });
    if (!data?.length) return res.status(404).json({ message: "Command not found" });
    res.json({ message: "Command deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
