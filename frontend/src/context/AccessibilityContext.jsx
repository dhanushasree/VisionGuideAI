import React, { createContext, useContext, useState, useEffect } from "react";
import { translate } from "../i18n/translations";

const Ctx = createContext({});

export const LANGUAGES = [
  { code: "en-US", label: "English",  native: "English"   },
  { code: "ta-IN", label: "Tamil",    native: "தமிழ்"     },
  { code: "hi-IN", label: "Hindi",    native: "हिंदी"     },
  { code: "te-IN", label: "Telugu",   native: "తెలుగు"   },
];

const DEFAULTS = {
  theme:                   "dark",
  accessibilityMode:       false,
  fontSize:                "normal",    // "normal" | "large"
  contrast:                "normal",    // "normal" | "high"
  bigButtons:              false,
  voiceGuided:             false,
  simpleLayout:            false,
  language:                "en-US",
  voiceSpeed:              0.9,
  defaultEmergencyMessage: "I need help! This is an emergency. Please send assistance.",
};

export function AccessibilityProvider({ children }) {
  const [s, setS] = useState(() => {
    try {
      const raw = localStorage.getItem("vg_a11y");
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });

  useEffect(() => {
    try { localStorage.setItem("vg_a11y", JSON.stringify(s)); } catch {}
    const d = document.documentElement;
    d.setAttribute("data-theme",    s.theme);
    d.setAttribute("data-font",     s.fontSize);
    d.setAttribute("data-contrast", s.contrast);
    d.setAttribute("data-bigbtns",  s.bigButtons       ? "1" : "0");
    d.setAttribute("data-access",   s.accessibilityMode ? "1" : "0");
    d.setAttribute("data-simple",   s.simpleLayout     ? "1" : "0");
  }, [s]);

  const update    = (key, val) => setS(p => ({ ...p, [key]: val }));
  const updateMany = (obj)     => setS(p => ({ ...p, ...obj   }));

  const toggleTheme = () =>
    update("theme", s.theme === "dark" ? "light" : "dark");

  const toggleAccessibility = () => {
    const next = !s.accessibilityMode;
    const newS = {
      accessibilityMode: next,
      fontSize:    next ? "large"  : "normal",
      contrast:    next ? "high"   : "normal",
      bigButtons:  next,
      voiceGuided: next,
    };
    setS(p => ({ ...p, ...newS }));
    const msg = next
      ? "Accessibility mode enabled. Large text, high contrast, and big buttons are now active. Welcome to VisionGuide AI!"
      : "Accessibility mode disabled. Normal view restored.";
    _rawSpeak(msg, s.language, s.voiceSpeed);
  };

  function _rawSpeak(text, lang, rate) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate; u.volume = 1;
    window.speechSynthesis.speak(u);
  }

  const speak = (text, opts = {}) =>
    _rawSpeak(text, opts.lang ?? s.language, opts.rate ?? s.voiceSpeed);

  /* Speak a translation key in the current language */
  const speakT = (key, opts = {}) => {
    const text = translate(s.language, key);
    speak(text, opts);
  };

  /* Get translated string for current language */
  const t = (key) => translate(s.language, key);

  return (
    <Ctx.Provider value={{ settings: s, update, updateMany, toggleTheme, toggleAccessibility, speak, speakT, t, LANGUAGES }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAccessibility = () => useContext(Ctx);
