import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { translate, translateLabel, NAV_LABEL_KEYS } from "../i18n/translations";

const navItems = [
  { path: "/dashboard",            icon: "🏠", label: "Dashboard",         color: "#22c55e" },
  { path: "/dashboard/voice",      icon: "🎤", label: "Voice Assistant",    color: "#facc15" },
  { path: "/dashboard/camera",     icon: "📷", label: "Camera OCR",         color: "#f472b6" },
  { path: "/dashboard/objects",    icon: "🔍", label: "Object Detection",   color: "#a78bfa" },
  { path: "/dashboard/emergency",  icon: "📞", label: "Emergency Contacts", color: "#22c55e" },
  { path: "/dashboard/sos",        icon: "🚨", label: "SOS Alert",          color: "#ef4444" },
  { path: "/dashboard/navigation", icon: "🗺️", label: "Navigation",         color: "#a78bfa" },
  { path: "/dashboard/safewalk",   icon: "🚶", label: "Safe Walk",          color: "#fb923c" },
  { path: "/dashboard/articles",   icon: "📖", label: "Article Reader",     color: "#60a5fa" },
  { path: "/dashboard/safety",     icon: "🛡️", label: "Safety Tips",        color: "#34d399" },
  { path: "/dashboard/locations",  icon: "📍", label: "Saved Locations",    color: "#34d399" },
  { path: "/dashboard/commands",   icon: "📋", label: "Command History",    color: "#f472b6" },
  { path: "/dashboard/feedback",   icon: "💬", label: "Feedback",           color: "#fb923c" },
  { path: "/dashboard/settings",   icon: "⚙️", label: "Settings",           color: "#94a3b8" },
];

const pageMsg = {
  "/dashboard":            "nav.dashboard",
  "/dashboard/voice":      "nav.voice",
  "/dashboard/camera":     "nav.camera",
  "/dashboard/objects":    "nav.objects",
  "/dashboard/emergency":  "nav.contacts",
  "/dashboard/sos":        "nav.sos",
  "/dashboard/navigation": "nav.navigation",
  "/dashboard/safewalk":   "nav.safewalk",
  "/dashboard/articles":   "nav.articles",
  "/dashboard/safety":     "nav.safety",
  "/dashboard/locations":  "nav.locations",
  "/dashboard/commands":   "nav.commands",
  "/dashboard/feedback":   "nav.feedback",
  "/dashboard/settings":   "nav.settings",
};

const LANG_OPTIONS = [
  { code: "en-US", native: "English"  },
  { code: "ta-IN", native: "தமிழ்"   },
  { code: "hi-IN", native: "हिंदी"   },
  { code: "te-IN", native: "తెలుగు" },
];

/* Wake phrase detection — covers multiple languages / phonetic variants */
const isWakePhrase = (text) => {
  const t = text.toLowerCase().trim();
  return (
    t.includes("hey zara") || t.includes("hey sara") || t.includes("hey zero") ||
    t.includes("hi zara")  || t.includes("ok zara")  || t.includes("okay zara") ||
    t.includes("a zara")   || t.includes("ey zara")  || t.includes("zara help") ||
    t.includes("ஹே சாரா") || t.includes("ஹே ஜாரா")  ||
    t.includes("हे ज़ारा") || t.includes("हे सारा")  || t.includes("ज़ारा") ||
    t.includes("జారా")     || t.includes("సారా")
  );
};

/* Contains "stop reading" / stop variants in any language */
const isStopCmd = (t) =>
  t.includes("stop") || t.includes("நிறுத்து") || t.includes("रुको") ||
  t.includes("बंद")  || t.includes("ఆపు")      || t.includes("quiet") || t.includes("silence");

export default function DashboardLayout({ children }) {
  const { user, signOut }                                                       = useAuth();
  const { settings, update, speak, speakT, t: tr, toggleTheme, toggleAccessibility } = useAccessibility();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 768);
  const [listening,    setListening]    = useState(false);
  const [zaraActive,   setZaraActive]   = useState(false);
  const [announcement, setAnnouncement] = useState("");

  /* Stable refs so effects don't re-run on every render */
  const langRef      = useRef(settings.language);
  const speedRef     = useRef(settings.voiceSpeed);
  const wakeRef      = useRef(null);     // wake word recognition instance
  const cmdRecRef    = useRef(null);     // command recognition instance
  const wakeRunning  = useRef(false);    // mutex: only one wake instance at a time
  const cmdMode      = useRef(false);    // true = waiting for user command
  const mountedRef   = useRef(true);
  const lastTouchRef = useRef({ el: null, ts: 0 }); // explore-by-touch state

  useEffect(() => { langRef.current  = settings.language;  }, [settings.language]);
  useEffect(() => { speedRef.current = settings.voiceSpeed; }, [settings.voiceSpeed]);

  const isDark = settings.theme === "dark";

  /* ─── Colour palette ─── */
  const C = {
    root:           isDark ? "#05080f"                : "#f0f4f8",
    sidebar:        isDark ? "rgba(13,17,23,0.97)"    : "rgba(248,250,252,0.98)",
    sidebarBorder:  isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)",
    topBar:         isDark ? "rgba(5,8,15,0.88)"      : "rgba(248,250,252,0.95)",
    topBarBorder:   isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)",
    navLinkColor:   isDark ? "#9ca3af"                : "#4b5563",
    divider:        isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
    userCard:       isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
    userCardBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.09)",
    userName:       isDark ? "#f9fafb"                : "#0f172a",
    userEmail:      isDark ? "#4b5563"                : "#6b7280",
    logoText:       isDark ? "#f9fafb"                : "#0f172a",
    hint:           isDark ? "#6b7280"                : "#64748b",
    iconBtn:        isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    iconBtnBorder:  isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    kbdBg:          isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    kbdBorder:      isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
    collapseBtn:    isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
  };

  /* ─── Resize ─── */
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* ─── Page announcement — always speak page name on navigation ─── */
  useEffect(() => {
    const key = pageMsg[location.pathname];
    if (key) {
      setAnnouncement(translate(settings.language, key));
      // Skip if VoiceAssistantPage is already speaking a command response
      setTimeout(() => {
        if (!window._vgProcessing && (Date.now() - (window._vgProcessingAt || 0) > 600)) {
          speakT(key);
        }
      }, 500);
    }
  }, [location.pathname, settings.language]); // eslint-disable-line

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "v" || e.key === "V") startFABVoice();
      if (e.key === "Escape") window.speechSynthesis.cancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []); // eslint-disable-line

  /* ─── Mouse click sound feedback (touch devices use touchstart handler below) ─── */
  useEffect(() => {
    let lastLabel = ""; let lastTime = 0;

    const onDown = (e) => {
      if (e.pointerType === "touch") return; // touch handled by explore-by-touch effect
      if (cmdMode.current) return;
      if (window._vgProcessing) return;      // VoiceAssistantPage is speaking — skip
      const el = e.target.closest("button, a[href], [role='button']");
      if (!el) return;
      if (el.closest("[data-fab]")) return;

      const raw = (
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent?.trim()
      )
        ?.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, "")
        ?.replace(/\s+/g, " ")
        ?.trim()
        ?.slice(0, 80) || "";

      if (raw.length < 2) return;
      const now = Date.now();
      if (raw === lastLabel && now - lastTime < 1500) return;
      lastLabel = raw; lastTime = now;

      const spoken = translateLabel(langRef.current, raw) || raw;

      // Chrome fix: cancel + resume + 80 ms delay makes TTS work on FIRST click
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      setTimeout(() => {
        if (!mountedRef.current) return;
        // Block if VA is active OR was active within the last 400ms (handles headless instant-onend)
        if (window._vgProcessing || (Date.now() - (window._vgProcessingAt || 0) < 400)) return;
        window.speechSynthesis.resume();
        const u = new SpeechSynthesisUtterance(spoken);
        u.lang = langRef.current; u.rate = 1.05; u.volume = 1;
        window.speechSynthesis.speak(u);
      }, 80);
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []); // no deps — uses refs only

  /* ─── Explore-by-touch: first touch announces, second touch activates ─── */
  useEffect(() => {
    const getLabel = (el) =>
      (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent?.trim())
        ?.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, "")
        ?.replace(/\s+/g, " ")
        ?.trim()
        ?.slice(0, 80) || "";

    const onTouchStart = (e) => {
      if (cmdMode.current || e.touches.length > 1) return;
      if (window._vgProcessing) return;      // VoiceAssistantPage is speaking — skip
      const el = e.target.closest("button, a[href], [role='button']");
      if (!el || el.closest("[data-fab]")) return;

      // VA quick-command buttons: set processing flag and let click fire immediately — no explore phase
      if (el.closest("[data-va-quick]") || el.hasAttribute("data-va-quick")) {
        window._vgProcessing   = true;
        window._vgProcessingAt = Date.now();
        return; // allow click through — processCommand handles the only voice
      }

      const raw = getLabel(el);
      if (!raw || raw.length < 2) return;

      const now = Date.now();
      const last = lastTouchRef.current;

      if (last.el === el && now - last.ts < 1500) {
        // Second touch on same element — allow click/navigation
        lastTouchRef.current = { el: null, ts: 0 };
        return;
      }

      // First touch — announce and block activation
      e.preventDefault();
      lastTouchRef.current = { el, ts: now };

      const spoken = translateLabel(langRef.current, raw) || raw;
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (window._vgProcessing || (Date.now() - (window._vgProcessingAt || 0) < 400)) return;
        const u = new SpeechSynthesisUtterance(spoken);
        u.lang = langRef.current; u.rate = 1.05; u.volume = 1;
        window.speechSynthesis.speak(u);
      }, 80);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => document.removeEventListener("touchstart", onTouchStart);
  }, []); // no deps — uses refs only

  /* ════════════════════════════════════════════════════
     HEY ZARA — Wake word + command system
     Fixed issues:
     1. Uses utterance.onend so TTS finishes BEFORE command mic opens
     2. wakeRunning mutex prevents multiple concurrent instances
     3. Restart only on onend (covers all error paths)
     4. 7-second command timeout
  ════════════════════════════════════════════════════ */
  const sayT = useCallback((key) => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const text = translate(langRef.current, key);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langRef.current; u.rate = speedRef.current ?? 0.95; u.volume = 1;
    return u; // caller can attach onend
  }, []);

  const resetZara = useCallback(() => {
    cmdMode.current  = false;
    wakeRunning.current = false;
    if (mountedRef.current) { setZaraActive(false); setListening(false); }
  }, []);

  const startWake = useCallback(() => {
    if (!mountedRef.current || cmdMode.current || wakeRunning.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    wakeRunning.current = true;
    let triggered = false;

    try {
      const rec = new SR();
      rec.lang = langRef.current;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      wakeRef.current = rec;

      rec.onresult = (ev) => {
        if (triggered) return;
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          for (let j = 0; j < ev.results[i].length; j++) {
            const txt = ev.results[i][j].transcript;
            if (isWakePhrase(txt)) {
              triggered = true;
              try { rec.stop(); } catch {}
              handleWakeDetected();
              return;
            }
          }
        }
      };

      rec.onend = () => {
        wakeRef.current = null;
        wakeRunning.current = false;
        // Restart after brief pause (unless command mode or unmounted)
        if (mountedRef.current && !cmdMode.current) {
          setTimeout(startWake, 400);
        }
      };

      rec.onerror = (ev) => {
        if (ev.error === "aborted" || ev.error === "no-speech") return; // onend handles
        wakeRunning.current = false;
        wakeRef.current = null;
        // Network errors: back off 60 s to avoid Chrome spamming its "needs internet" notification
        const delay = ev.error === "network" ? 60000 : 1200;
        if (mountedRef.current && !cmdMode.current) setTimeout(startWake, delay);
      };

      rec.start();
    } catch {
      wakeRunning.current = false;
      if (mountedRef.current) setTimeout(startWake, 1500);
    }
  }, []); // eslint-disable-line

  const handleWakeDetected = useCallback(() => {
    cmdMode.current = true;
    if (mountedRef.current) setZaraActive(true);

    // Speak greeting — start command mic ONLY after speech actually ends
    window.speechSynthesis.cancel();
    const greetingText = translate(langRef.current, "zara.greeting");
    const u = new SpeechSynthesisUtterance(greetingText);
    u.lang = langRef.current; u.rate = 0.95; u.volume = 1;

    let cmdStarted = false;
    const beginCmd = () => {
      if (!cmdStarted) { cmdStarted = true; startCommandListen(); }
    };

    u.onend   = beginCmd;
    u.onerror = beginCmd;
    // Safety fallback: if onend doesn't fire within reasonable time
    setTimeout(beginCmd, Math.max(2200, greetingText.length * 75));

    window.speechSynthesis.speak(u);
  }, []); // eslint-disable-line

  const startCommandListen = useCallback(() => {
    if (!mountedRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { resetZara(); setTimeout(startWake, 500); return; }

    if (mountedRef.current) setListening(true);

    let cmdHandled = false;
    const rec = new SR();
    rec.lang = langRef.current;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 2;
    cmdRecRef.current = rec;

    // 7-second timeout — if user doesn't speak, abort
    const timeout = setTimeout(() => {
      if (!cmdHandled) {
        cmdHandled = true;
        try { rec.stop(); } catch {}
        resetZara();
        const u = sayT("zara.timeout");
        window.speechSynthesis.speak(u);
        u.onend = () => setTimeout(startWake, 500);
        setTimeout(startWake, 4000); // fallback
      }
    }, 7000);

    rec.onresult = (ev) => {
      if (cmdHandled) return;
      cmdHandled = true;
      clearTimeout(timeout);
      const cmd = ev.results[0][0].transcript.toLowerCase().trim();
      resetZara();
      runCmd(cmd);
      setTimeout(startWake, 1200);
    };

    rec.onerror = (ev) => {
      if (cmdHandled) return;
      if (ev.error === "no-speech") return; // wait for onend
      cmdHandled = true;
      clearTimeout(timeout);
    };

    rec.onend = () => {
      clearTimeout(timeout);
      if (!cmdHandled) {
        cmdHandled = true;
        resetZara();
        setTimeout(startWake, 500);
      }
    };

    try {
      rec.start();
    } catch {
      clearTimeout(timeout);
      resetZara();
      setTimeout(startWake, 1000);
    }
  }, []); // eslint-disable-line

  /* ─── Mic permission + Zara boot ─── */
  useEffect(() => {
    mountedRef.current = true;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    const tryStartWake = () => {
      if (mountedRef.current && !cmdMode.current && !wakeRunning.current) startWake();
    };

    const requestMicAndStart = async () => {
      try {
        // Explicitly request mic — shows the browser permission prompt clearly
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach(t => t.stop()); // release immediately, SR will reopen it
        setTimeout(tryStartWake, 200);
      } catch {
        // Mic denied — voice features won't work, that's fine
      }
    };

    if (!SR) return;

    // Check existing permission state (Chrome supports this)
    navigator.permissions?.query({ name: "microphone" })
      .then((perm) => {
        if (perm.state === "granted") {
          setTimeout(tryStartWake, 500);
          // Watch for permission changes (e.g. user revokes later)
          perm.onchange = () => {
            if (perm.state !== "granted") { try { wakeRef.current?.stop(); } catch {} }
          };
        } else if (perm.state === "prompt") {
          // Request on first click so the prompt appears in context
          document.addEventListener("pointerdown", requestMicAndStart, { once: true });
          document.addEventListener("click",       requestMicAndStart, { once: true });
        }
        // "denied" → do nothing
      })
      .catch(() => {
        // Browser doesn't support permissions API — just request on first interaction
        document.addEventListener("pointerdown", requestMicAndStart, { once: true });
        document.addEventListener("click",       requestMicAndStart, { once: true });
      });

    // Watchdog: every 8 s restart wake if it silently died
    const watchdog = setInterval(tryStartWake, 8000);

    // Global pause/resume — _vgPauseWake returns a Promise so caller can await full mic release
    window._vgPauseWake = () => new Promise(resolve => {
      wakeRunning.current = false;
      cmdMode.current = true; // block wake restart while VA page is active
      const ref = wakeRef.current;
      if (!ref) { resolve(); return; }
      const prev = ref.onend;
      ref.onend = (...args) => {
        wakeRef.current = null;
        if (prev) try { prev(...args); } catch {}
        setTimeout(resolve, 100); // brief gap so OS releases mic
      };
      try { ref.stop(); } catch { wakeRef.current = null; resolve(); }
    });
    window._vgResumeWake = () => { cmdMode.current = false; setTimeout(tryStartWake, 700); };

    return () => {
      mountedRef.current = false;
      clearInterval(watchdog);
      delete window._vgPauseWake;
      delete window._vgResumeWake;
      document.removeEventListener("pointerdown", requestMicAndStart);
      document.removeEventListener("click",       requestMicAndStart);
      try { wakeRef.current?.stop(); }   catch {}
      try { cmdRecRef.current?.stop(); } catch {}
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line

  /* ─── Extract destination from voice command ─── */
  const extractDest = (cmd) =>
    cmd.replace(/navigate to|go to|route to|directions to|take me to|get route to|open map for/gi, "").trim();

  /* ─── Global command handler ─── */
  const runCmd = useCallback((cmd) => {
    if (isStopCmd(cmd)) {
      window.speechSynthesis.cancel();
      return;
    }
    const say = (key) => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(translate(langRef.current, key));
      u.lang = langRef.current; u.rate = speedRef.current ?? 0.95; u.volume = 1;
      setTimeout(() => window.speechSynthesis.speak(u), 80);
    };

    if      (cmd.includes("home") || cmd.includes("dashboard") || cmd.includes("டாஷ்"))
      { navigate("/dashboard");            say("nav.dashboard"); }
    else if (cmd.includes("voice") || cmd.includes("குரல்") || cmd.includes("वॉइस"))
      { navigate("/dashboard/voice");      say("nav.voice"); }
    else if (cmd.includes("camera") || cmd.includes("scan") || cmd.includes("கேமரா") || cmd.includes("कैमरा"))
      { navigate("/dashboard/camera");     say("nav.camera"); }
    else if (cmd.includes("object") || cmd.includes("detect") || cmd.includes("பொருள்") || cmd.includes("ऑब्जेक्ट"))
      { navigate("/dashboard/objects");    say("nav.objects"); }
    else if (cmd.includes("contact") || cmd.includes("தொடர்பு") || cmd.includes("संपर्क"))
      { navigate("/dashboard/emergency");  say("nav.contacts"); }
    else if (cmd.includes("sos") || cmd.includes("emergency") || cmd.includes("அவசர") || cmd.includes("आपातकाल"))
      { navigate("/dashboard/sos");        say("nav.sos"); }
    else if (cmd.includes("navigat") || cmd.includes("route") || cmd.includes("direction") || cmd.includes("map") ||
             cmd.includes("வழி") || cmd.includes("नेविगेट") || cmd.includes("నావి"))
    {
      const dest = extractDest(cmd);
      if (dest && dest.length > 2 && !/^(me|here|this|open|பக்கம்)$/i.test(dest)) {
        navigate(`/dashboard/navigation?dest=${encodeURIComponent(dest)}`);
        const prefix = translate(langRef.current, "nav.route_to");
        const u = new SpeechSynthesisUtterance(`${prefix} ${dest}.`);
        u.lang = langRef.current; u.rate = speedRef.current; u.volume = 1;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
      } else {
        navigate("/dashboard/navigation"); say("nav.navigation");
      }
    }
    else if (cmd.includes("safe walk") || cmd.includes("பாதுகாப்பு நடை"))
      { navigate("/dashboard/safewalk");   say("nav.safewalk"); }
    else if (cmd.includes("article") || cmd.includes("read") || cmd.includes("கட்டுரை") || cmd.includes("लेख"))
      { navigate("/dashboard/articles");   say("nav.articles"); }
    else if (cmd.includes("safety") || cmd.includes("tip") || cmd.includes("பாதுகாப்பு") || cmd.includes("सुरक्षा"))
      { navigate("/dashboard/safety");     say("nav.safety"); }
    else if (cmd.includes("location") || cmd.includes("இடம்") || cmd.includes("स्थान"))
      { navigate("/dashboard/locations");  say("nav.locations"); }
    else if (cmd.includes("history") || cmd.includes("command") || cmd.includes("வரலாறு"))
      { navigate("/dashboard/commands");   say("nav.commands"); }
    else if (cmd.includes("feedback") || cmd.includes("கருத்து") || cmd.includes("फीडबैक"))
      { navigate("/dashboard/feedback");   say("nav.feedback"); }
    else if (cmd.includes("setting") || cmd.includes("அமைப்பு") || cmd.includes("सेटिंग"))
      { navigate("/dashboard/settings");   say("nav.settings"); }
    else if (cmd.includes("sign out") || cmd.includes("logout") || cmd.includes("வெளியேறு"))
      { signOut(); navigate("/"); say("nav.signout"); }
    else if (cmd.includes("light mode") || cmd.includes("வெளிர்"))
      { toggleTheme(); say("nav.light"); }
    else if (cmd.includes("dark mode") || cmd.includes("இருண்ட"))
      { toggleTheme(); say("nav.dark"); }
    else if (cmd.includes("accessibility"))
      { toggleAccessibility(); }
    else if (cmd.includes("help") || cmd.includes("உதவி") || cmd.includes("मदद"))
      { const u = new SpeechSynthesisUtterance(translate(langRef.current, "zara.help"));
        u.lang = langRef.current; u.rate = speedRef.current; u.volume = 1;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }
    else {
      const u = new SpeechSynthesisUtterance(translate(langRef.current, "zara.not_understood"));
      u.lang = langRef.current; u.rate = speedRef.current; u.volume = 1;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    }
  }, []); // eslint-disable-line

  /* ─── FAB manual voice button ─── */
  const startFABVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance("Speech recognition not supported. Please use Chrome or Edge.");
      window.speechSynthesis.speak(u);
      return;
    }

    // If already listening — stop it
    if (listening) {
      try { cmdRecRef.current?.stop(); } catch {}
      setListening(false);
      cmdMode.current = false;
      setTimeout(() => { if (mountedRef.current) startWake(); }, 600);
      return;
    }

    // Kill everything before starting
    window.speechSynthesis.cancel();
    try { wakeRef.current?.stop(); } catch {}
    wakeRunning.current = false;
    cmdMode.current     = true; // block watchdog from restarting wake while we listen

    const rec = new SR();
    rec.lang            = langRef.current;
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.maxAlternatives = 3;
    cmdRecRef.current   = rec;

    // ── Start recognition immediately — no TTS before mic opens ──
    // Speaking "Listening" into an open mic causes it to recognise its own
    // voice as a command ("listening" → "not understood" → loop).
    try { rec.start(); } catch (err) {
      cmdMode.current = false;
      setListening(false);
      // If permission denied, request it properly
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(s => { s.getTracks().forEach(t => t.stop()); startFABVoice(); })
        .catch(() => {
          window.speechSynthesis.resume();
          const u = new SpeechSynthesisUtterance("Microphone access denied. Please allow microphone in browser settings.");
          window.speechSynthesis.speak(u);
        });
      return;
    }

    setListening(true); // shows the pulsing mic UI

    let handled = false;
    const done = (restartWake = true) => {
      if (handled) return;
      handled = true;
      cmdMode.current = false;
      setListening(false);
      if (restartWake) setTimeout(() => { if (mountedRef.current && !wakeRunning.current) startWake(); }, 600);
    };

    rec.onresult = (e) => {
      const cmd = e.results[0][0].transcript.toLowerCase().trim();
      done(false); // don't restart wake yet — runCmd may navigate
      runCmd(cmd);
      setTimeout(() => { if (mountedRef.current && !wakeRunning.current) startWake(); }, 1000);
    };

    rec.onerror = (ev) => {
      done();
      if (ev.error === "not-allowed") {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(s => { s.getTracks().forEach(t => t.stop()); })
          .catch(() => {});
        window.speechSynthesis.resume();
        const u = new SpeechSynthesisUtterance("Microphone permission denied. Please tap Allow when the browser asks.");
        u.lang = langRef.current;
        setTimeout(() => window.speechSynthesis.speak(u), 80);
      } else if (ev.error === "no-speech") {
        window.speechSynthesis.resume();
        const u = new SpeechSynthesisUtterance("No speech detected. Please try again.");
        u.lang = langRef.current;
        setTimeout(() => window.speechSynthesis.speak(u), 80);
      } else if (ev.error === "network") {
        window.speechSynthesis.resume();
        const u = new SpeechSynthesisUtterance("Hey Zara needs internet access to Google. Use the Voice Assistant page instead — it works fully offline.");
        u.lang = langRef.current;
        setTimeout(() => window.speechSynthesis.speak(u), 80);
      }
    };

    rec.onend = () => done();
  };

  const currentLabel = navItems.find(n => n.path === location.pathname)?.label || "Dashboard";
  const localLabel   = (item) => {
    const key = NAV_LABEL_KEYS[item.label];
    return key ? translate(settings.language, key) : item.label;
  };
  const bB = settings.bigButtons;

  return (
    <div style={{ ...st.root, background: C.root }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {mobileOpen && <div style={st.overlay} onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      {/* ── Sidebar ── */}
      <aside
        style={{ ...st.sidebar, width: collapsed ? "68px" : "252px",
          left: isMobile && !mobileOpen ? (collapsed ? "-68px" : "-252px") : "0",
          background: C.sidebar, borderRight: `1px solid ${C.sidebarBorder}` }}
        role="navigation" aria-label="Main navigation"
      >
        <div style={st.logoRow}>
          <div style={st.logoIcon}><span style={{ fontSize: "18px" }}>👁️</span></div>
          {!collapsed && <span style={{ ...st.logoText, color: C.logoText }}>VisionGuide <span style={{ color: "#22c55e" }}>AI</span></span>}
        </div>

        <button style={{ ...st.collapseBtn, background: C.collapseBtn }}
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <span style={{ fontSize: "12px" }}>{collapsed ? "▶" : "◀"}</span>
        </button>

        <div style={{ ...st.divider, background: C.divider }} />

        <nav style={st.nav}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            const label  = localLabel(item);
            return (
              <Link key={item.path} to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                style={{ ...st.navLink, color: active ? item.color : C.navLinkColor,
                  ...(active ? { background: item.color + "14", border: `1px solid ${item.color}28`, fontWeight: 700 } : {}) }}
                aria-label={label} aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}>
                <span style={st.navIcon}>{item.icon}</span>
                {!collapsed && <span style={st.navLabel}>{label}</span>}
                {!collapsed && active && <span style={{ ...st.activeDot, background: item.color }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ ...st.divider, background: C.divider }} />

        <div style={st.sideFooter}>
          {!collapsed && (
            <div style={{ ...st.userCard, background: C.userCard, border: `1px solid ${C.userCardBorder}` }}>
              <div style={st.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ ...st.userName, color: C.userName }}>{user?.name}</div>
                <div style={{ ...st.userEmail, color: C.userEmail }}>{user?.email}</div>
              </div>
            </div>
          )}
          <button style={st.signOutBtn} onClick={() => { signOut(); navigate("/"); }}
            aria-label={tr("btn.sign_out")} title={collapsed ? tr("btn.sign_out") : undefined}>
            <span>🚪</span>{!collapsed && <span>{tr("btn.sign_out")}</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ ...st.mainWrap, marginLeft: isMobile ? "0" : (collapsed ? "68px" : "252px") }}>
        <header style={{ ...st.topBar, background: C.topBar, borderBottom: `1px solid ${C.topBarBorder}` }} role="banner">
          <div className="topbar-left" style={st.topBarLeft}>
            <button style={{ ...st.mobileMenuBtn, display: isMobile ? "flex" : "none", color: C.logoText }}
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}>
              {mobileOpen ? "✕" : "☰"}
            </button>
            <div className="topbar-crumb" style={st.breadcrumb}>
              <span style={{ color: C.hint, fontSize: "13px" }}>VisionGuide AI</span>
              <span style={{ color: C.hint, margin: "0 6px" }}>/</span>
              <span className="topbar-crumb-page" style={{ color: C.userName, fontSize: "13px", fontWeight: 600 }}>
                {localLabel(navItems.find(n => n.path === location.pathname) || { label: currentLabel })}
              </span>
            </div>
          </div>

          <div className="topbar-right" style={st.topBarRight}>
            <select className="topbar-lang" value={settings.language}
              onChange={e => update("language", e.target.value)}
              style={{ ...st.langSel, background: C.iconBtn, borderColor: C.iconBtnBorder, color: C.userName }}
              aria-label="Select language">
              {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
            </select>

            <button style={{ ...st.iconBtn, background: C.iconBtn, borderColor: C.iconBtnBorder, color: C.userName }}
              onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
              {settings.theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button style={{ ...st.iconBtn,
              background: settings.accessibilityMode ? "rgba(34,197,94,0.15)" : C.iconBtn,
              borderColor: settings.accessibilityMode ? "rgba(34,197,94,0.4)"  : C.iconBtnBorder }}
              onClick={toggleAccessibility} title="Toggle accessibility"
              aria-label="Toggle accessibility mode" aria-pressed={settings.accessibilityMode}>
              {settings.accessibilityMode ? "✅" : "♿"}
            </button>

            <span className="topbar-hint" style={{ color: C.hint, fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: (listening || zaraActive) ? "#ef4444" : "#22c55e",
                display: "inline-block", flexShrink: 0,
                animation: (listening || zaraActive) ? "ping 1.2s ease-out infinite" : "micPulse 2.5s ease-in-out infinite",
              }} />
              <span style={{ color: "#22c55e", fontWeight: 700 }}>
                {zaraActive ? "Zara Active" : listening ? "Listening…" : "Hey Zara"}
              </span>
            </span>
          </div>
        </header>

        <main id="main-content" className="dash-content"
          style={{ ...st.content, padding: isMobile ? "18px 14px 100px" : "32px 28px 80px" }} tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* ── Zara status bar ── */}
      {(zaraActive || listening) && (
        <div style={st.zaraBar}>
          <div style={st.zaraWaves}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ ...st.zaraWaveBar, animationDelay: `${i * 0.1}s` }} />)}
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff", flex: 1 }}>
            {zaraActive && !listening
              ? translate(settings.language, "zara.greeting")
              : translate(settings.language, "zara.listening") + "…"}
          </span>
          <button
            onClick={() => { window.speechSynthesis.cancel(); try { wakeRef.current?.stop(); cmdRecRef.current?.stop(); } catch {} resetZara(); setTimeout(startWake, 800); }}
            style={st.zaraClose} aria-label="Cancel Zara">✕</button>
        </div>
      )}

      {/* ── Floating voice FAB ── */}
      <button
        data-fab="true"
        style={{ ...st.fab, ...(listening || zaraActive ? st.fabActive : {}),
          width: bB ? "74px" : "64px", height: bB ? "74px" : "64px" }}
        onClick={startFABVoice}
        aria-label={listening ? "Stop listening" : "Activate voice"}
        aria-pressed={listening}
        title={listening ? "Listening…" : 'Tap or say "Hey Zara"'}>
        {(listening || zaraActive)
          ? <div style={st.waves}>{[0,1,2].map(i => <div key={i} style={{ ...st.bar, animationDelay: `${i * 0.15}s` }} />)}</div>
          : <span style={{ fontSize: bB ? "30px" : "26px" }}>🎤</span>}
        {(listening || zaraActive) && <div style={st.ping} />}
      </button>

      <style>{`
        @keyframes barPulse{0%,100%{height:6px}50%{height:26px}}
        @keyframes zaraWave{0%,100%{height:4px}50%{height:18px}}
        @keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}
        @keyframes micPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(0.75)}}
      `}</style>
    </div>
  );
}

const st = {
  root:        { display: "flex", minHeight: "100vh", position: "relative" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 90, backdropFilter: "blur(4px)" },
  sidebar:     { position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", transition: "width 0.22s cubic-bezier(.4,0,.2,1), left 0.22s cubic-bezier(.4,0,.2,1)", overflow: "hidden", boxShadow: "4px 0 30px rgba(0,0,0,0.25)" },
  logoRow:     { display: "flex", alignItems: "center", gap: "10px", padding: "20px 16px 14px", minHeight: "64px" },
  logoIcon:    { width: "34px", height: "34px", borderRadius: "9px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoText:    { fontWeight: 800, fontSize: "17px", whiteSpace: "nowrap", letterSpacing: "-0.3px" },
  collapseBtn: { border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", margin: "0 12px 10px", fontFamily: "inherit", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" },
  divider:     { height: "1px", margin: "4px 0" },
  nav:         { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "6px 8px" },
  navLink:     { display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "10px", textDecoration: "none", marginBottom: "2px", transition: "all 0.15s", border: "1px solid transparent", position: "relative", whiteSpace: "nowrap" },
  navIcon:     { fontSize: "18px", flexShrink: 0, width: "22px", textAlign: "center" },
  navLabel:    { fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis" },
  activeDot:   { width: "6px", height: "6px", borderRadius: "50%", marginLeft: "auto", flexShrink: 0 },
  sideFooter:  { padding: "10px 10px 16px" },
  userCard:    { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", marginBottom: "8px" },
  userAvatar:  { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "14px", flexShrink: 0 },
  userName:    { fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "140px" },
  userEmail:   { fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "140px" },
  signOutBtn:  { width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", padding: "9px 12px", borderRadius: "9px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" },
  mainWrap:    { flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", transition: "margin-left 0.22s cubic-bezier(.4,0,.2,1)" },
  topBar:      { height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 },
  topBarLeft:  { display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0, overflow: "hidden" },
  topBarRight: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  mobileMenuBtn: { background: "transparent", border: "none", fontSize: "22px", cursor: "pointer", alignItems: "center", justifyContent: "center", padding: "4px 6px", borderRadius: "6px" },
  breadcrumb:  { display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" },
  iconBtn:     { border: "1px solid", borderRadius: "8px", padding: "0 10px", cursor: "pointer", fontSize: "15px", fontFamily: "inherit", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "34px", transition: "all 0.15s" },
  langSel:     { border: "1px solid", borderRadius: "8px", padding: "0 8px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", height: "32px", outline: "none" },
  content:     { padding: "32px 28px", flex: 1, maxWidth: "1140px", margin: "0 auto", width: "100%" },
  fab:         { position: "fixed", bottom: "28px", right: "28px", zIndex: 200, borderRadius: "50%", background: "linear-gradient(135deg,#facc15,#f59e0b)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(250,204,21,0.35)", transition: "all 0.2s" },
  fabActive:   { background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 8px 32px rgba(239,68,68,0.45)" },
  waves:       { display: "flex", gap: "3px", alignItems: "center", height: "30px" },
  bar:         { width: "4px", background: "white", borderRadius: "2px", animation: "barPulse 0.8s ease infinite" },
  ping:        { position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(239,68,68,0.5)", animation: "ping 1.5s ease-out infinite" },
  zaraBar:     { position: "fixed", bottom: "106px", right: "16px", zIndex: 199, background: "linear-gradient(135deg,rgba(34,197,94,0.95),rgba(16,163,74,0.95))", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 24px rgba(34,197,94,0.45)", maxWidth: "300px" },
  zaraWaves:   { display: "flex", gap: "2px", alignItems: "center", height: "20px" },
  zaraWaveBar: { width: "3px", background: "#fff", borderRadius: "2px", animation: "zaraWave 0.65s ease infinite" },
  zaraClose:   { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", flexShrink: 0 },
};
