import React, { useState, useEffect } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import DashboardLayout from "../components/DashboardLayout";
import API from "../api";

const LANG_OPTIONS = [
  { code: "en-US", label: "English"  },
  { code: "ta-IN", label: "Tamil — தமிழ்" },
  { code: "hi-IN", label: "Hindi — हिंदी" },
  { code: "te-IN", label: "Telugu — తెలుగు" },
];

export default function SettingsPage() {
  const { settings, update, updateMany, toggleTheme, toggleAccessibility, speak } = useAccessibility();
  const isDark = settings.theme === "dark";

  const [adminStats, setAdminStats] = useState(null);
  const [adminOpen,  setAdminOpen]  = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [emgMsg, setEmgMsg] = useState(settings.defaultEmergencyMessage);

  /* ─── Fetch admin stats ─── */
  useEffect(() => {
    if (!adminOpen || adminStats) return;
    const load = async () => {
      const results = await Promise.allSettled([
        API.get("/emergency"),
        API.get("/articles"),
        API.get("/commands"),
        API.get("/sos"),
        API.get("/locations"),
        API.get("/feedback"),
      ]);
      const [c, a, cmd, sos, l, fb] = results.map(r =>
        r.status === "fulfilled" ? r.value.data.length : 0
      );
      const all = { contacts: c, articles: a, commands: cmd, sos, locations: l, feedback: fb };
      const topFeature = Object.entries(all).sort((x, y) => y[1] - x[1])[0];
      setAdminStats({ ...all, topFeature: topFeature[0] });
    };
    load();
  }, [adminOpen]);

  /* ─── Colour palette ─── */
  const C = {
    bg:     isDark ? "#0d1117" : "#ffffff",
    border: isDark ? "#1f2937" : "rgba(0,0,0,0.1)",
    text:   isDark ? "#f9fafb" : "#0f172a",
    sub:    isDark ? "#9ca3af" : "#64748b",
    input:  isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    inBorder: isDark ? "#374151" : "rgba(0,0,0,0.14)",
    sectionBg: isDark ? "#111827" : "#f8fafc",
  };

  const saveEmergencyMsg = () => {
    update("defaultEmergencyMessage", emgMsg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    speak("Emergency message saved.");
  };

  const adminLabels = {
    contacts:  { icon: "📞", label: "Emergency Contacts", color: "#22c55e" },
    articles:  { icon: "📖", label: "Articles",           color: "#60a5fa" },
    commands:  { icon: "🎤", label: "Commands Used",      color: "#facc15" },
    sos:       { icon: "🚨", label: "SOS Alerts",         color: "#ef4444" },
    locations: { icon: "📍", label: "Saved Locations",    color: "#34d399" },
    feedback:  { icon: "💬", label: "Feedback Entries",   color: "#fb923c" },
  };

  const a11yModes = [
    { key: "contrast", val: "high",   label: "High Contrast",       icon: "🎨", desc: "Bold borders and brighter text" },
    { key: "fontSize", val: "large",  label: "Large Text",          icon: "🔡", desc: "Increased font size throughout" },
    { key: "bigButtons", val: true,   label: "Big Buttons",         icon: "🔲", desc: "Larger interactive elements" },
    { key: "voiceGuided", val: true,  label: "Voice Guided",        icon: "🔊", desc: "Auto-speak page names on navigation" },
    { key: "simpleLayout", val: true, label: "Simple Screen Layout",icon: "📋", desc: "Minimal UI with reduced clutter" },
  ];

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>⚙️ Settings</h1>
          <p>Manage your preferences, accessibility options, and view project statistics.</p>
        </div>

        {/* ══════════════════════════════════
            ACCESSIBILITY DISPLAY MODE
        ══════════════════════════════════ */}
        <Section title="♿ Accessibility Display Mode" color="#22c55e" C={C}>
          <p style={{ color: C.sub, fontSize: "14px", marginBottom: "18px" }}>
            Enable the master accessibility mode or customise individual accessibility features below.
          </p>

          {/* Master toggle */}
          <div style={{ ...st.row, justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "16px 18px", background: settings.accessibilityMode ? "rgba(34,197,94,0.08)" : C.input, border: `1px solid ${settings.accessibilityMode ? "rgba(34,197,94,0.3)" : C.inBorder}`, borderRadius: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>♿</span>
              <div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: "15px" }}>Enable Accessibility Mode</div>
                <div style={{ color: C.sub, fontSize: "13px" }}>Activates large text + high contrast + big buttons + voice guidance</div>
              </div>
            </div>
            <Toggle
              on={settings.accessibilityMode}
              onToggle={toggleAccessibility}
              color="#22c55e"
            />
          </div>

          {/* Individual mode toggles */}
          <div className="settings-mode-grid">
            {a11yModes.map(m => {
              const isOn = m.val === true
                ? settings[m.key] === true
                : settings[m.key] === m.val;
              return (
                <button
                  key={m.key}
                  style={{
                    ...st.modeCard,
                    background:   isOn ? "rgba(34,197,94,0.1)"   : C.input,
                    border:       isOn ? "1px solid rgba(34,197,94,0.35)" : `1px solid ${C.inBorder}`,
                    color: C.text,
                  }}
                  onClick={() => {
                    if (m.val === true) update(m.key, !settings[m.key]);
                    else update(m.key, isOn ? (m.key === "fontSize" ? "normal" : "normal") : m.val);
                    speak(`${m.label} ${isOn ? "disabled" : "enabled"}.`);
                  }}
                  aria-pressed={isOn}
                >
                  <span style={{ fontSize: "24px" }}>{m.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: "13px" }}>{m.label}</span>
                  <span style={{ fontSize: "11px", color: C.sub }}>{m.desc}</span>
                  <span style={{ fontSize: "12px", color: isOn ? "#22c55e" : C.sub, fontWeight: 700 }}>
                    {isOn ? "✅ ON" : "OFF"}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ══════════════════════════════════
            VOICE & LANGUAGE
        ══════════════════════════════════ */}
        <Section title="🔊 Voice & Language" color="#facc15" C={C}>
          <div style={st.formGrid}>
            <div className="form-group">
              <label>Preferred Language</label>
              <select
                value={settings.language}
                onChange={e => { update("language", e.target.value); speak("Language updated.", { lang: e.target.value }); }}
                style={{ background: C.input, borderColor: C.inBorder, color: C.text }}
              >
                {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Voice Speed — {settings.voiceSpeed}×</label>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={settings.voiceSpeed}
                onChange={e => update("voiceSpeed", parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#facc15" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: C.sub, marginTop: "4px" }}>
                <span>0.5× Slow</span><span>1× Normal</span><span>2× Fast</span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-yellow btn-sm"
            onClick={() => speak("Hello! This is a test of your voice settings. Voice speed and language are configured.", { lang: settings.language, rate: settings.voiceSpeed })}
          >
            🔊 Test Voice
          </button>
        </Section>

        {/* ══════════════════════════════════
            THEME
        ══════════════════════════════════ */}
        <Section title="🎨 Display Theme" color="#a78bfa" C={C}>
          <div className="theme-row">
            <ThemeOption
              active={settings.theme === "dark"}
              isDark={isDark}
              icon="🌙" title="Dark Mode"
              desc="Dark backgrounds, green accents"
              onClick={() => { update("theme","dark"); speak("Dark mode activated."); }}
              color="#a78bfa"
            />
            <ThemeOption
              active={settings.theme === "light"}
              isDark={isDark}
              icon="☀️" title="Light Mode"
              desc="Light backgrounds, clean look"
              onClick={() => { update("theme","light"); speak("Light mode activated."); }}
              color="#facc15"
            />
          </div>
        </Section>

        {/* ══════════════════════════════════
            DEFAULT EMERGENCY MESSAGE
        ══════════════════════════════════ */}
        <Section title="🚨 Default Emergency Message" color="#ef4444" C={C}>
          <p style={{ color: C.sub, fontSize: "14px", marginBottom: "14px" }}>
            This message is used when you send a quick SOS alert.
          </p>
          <div className="form-group">
            <textarea
              value={emgMsg}
              onChange={e => setEmgMsg(e.target.value)}
              rows={3}
              style={{ background: C.input, borderColor: C.inBorder, color: C.text }}
              placeholder="e.g. I need help! This is an emergency."
            />
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn btn-red btn-sm" onClick={saveEmergencyMsg}>
              💾 Save Message
            </button>
            {saved && <span style={{ color: "#22c55e", fontSize: "13px", fontWeight: 600 }}>✅ Saved!</span>}
          </div>
        </Section>

        {/* ══════════════════════════════════
            ADMIN / GUIDE VIEW
        ══════════════════════════════════ */}
        <div style={{ ...st.sectionWrap, borderColor: C.border, background: C.bg }}>
          <button
            style={{ ...st.sectionHeader, color: C.text }}
            onClick={() => setAdminOpen(o => !o)}
          >
            <span style={{ fontSize: "20px" }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>Admin / Guide View — Project Statistics</span>
            <span style={{ marginLeft: "auto", fontSize: "18px" }}>{adminOpen ? "▲" : "▼"}</span>
          </button>

          {adminOpen && (
            <div style={{ padding: "0 20px 20px" }}>
              <p style={{ color: C.sub, fontSize: "13px", marginBottom: "18px" }}>
                Overview of all data stored in VisionGuide AI.
              </p>
              {!adminStats ? (
                <div className="spinner" />
              ) : (
                <>
                  <div className="settings-admin-grid">
                    {Object.entries(adminLabels).map(([key, meta]) => (
                      <div key={key} style={{ ...st.adminCard, background: C.sectionBg, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: "24px" }}>{meta.icon}</div>
                        <div style={{ fontSize: "28px", fontWeight: 900, color: meta.color }}>{adminStats[key]}</div>
                        <div style={{ fontSize: "12px", color: C.sub }}>{meta.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...st.topFeature, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px", padding: "14px 18px", marginTop: "16px" }}>
                    <span style={{ fontSize: "20px" }}>🏆</span>
                    <div>
                      <div style={{ color: "#22c55e", fontWeight: 700, fontSize: "14px" }}>Most Used Feature</div>
                      <div style={{ color: C.sub, fontSize: "13px" }}>
                        {adminLabels[adminStats.topFeature]?.label ?? adminStats.topFeature} ({adminStats[adminStats.topFeature]} records)
                      </div>
                    </div>
                  </div>
                  <div style={{ ...st.topFeature, background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: "12px", padding: "14px 18px", marginTop: "10px" }}>
                    <span style={{ fontSize: "20px" }}>👤</span>
                    <div>
                      <div style={{ color: "#facc15", fontWeight: 700, fontSize: "14px" }}>Total Users</div>
                      <div style={{ color: C.sub, fontSize: "13px" }}>1 (current session — local auth)</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}

/* ── Reusable sub-components ── */
function Section({ title, color, C, children }) {
  return (
    <div style={{ ...st.sectionWrap, borderColor: C.border, background: C.bg, marginBottom: "20px" }}>
      <div style={{ ...st.sectionTitleBar, color: C.text, borderBottom: `1px solid ${C.border}`, background: C.sectionBg }}>
        <span style={{ color, fontSize: "15px", fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onToggle, color }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: "52px", height: "28px", borderRadius: "14px",
        background: on ? color : "rgba(255,255,255,0.12)",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: "3px", left: on ? "26px" : "3px",
        width: "22px", height: "22px", borderRadius: "50%",
        background: on ? "#000" : "#fff",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function ThemeOption({ active, isDark, icon, title, desc, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "18px", borderRadius: "12px", cursor: "pointer",
        background: active ? `${color}18` : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        border: active ? `2px solid ${color}` : isDark ? "2px solid rgba(255,255,255,0.08)" : "2px solid rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        fontFamily: "inherit", transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: "32px" }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: "14px", color: active ? color : isDark ? "#d1d5db" : "#334155" }}>{title}</span>
      <span style={{ fontSize: "12px", color: isDark ? "#6b7280" : "#94a3b8" }}>{desc}</span>
      {active && <span style={{ fontSize: "11px", color, fontWeight: 700 }}>✅ Active</span>}
    </button>
  );
}

const st = {
  sectionWrap:    { border: "1px solid", borderRadius: "16px", overflow: "hidden", marginBottom: "20px" },
  sectionHeader:  { width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  sectionTitleBar:{ padding: "14px 20px", borderBottom: "1px solid" },
  modeGrid:       { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" },
  modeCard:       { padding: "14px", borderRadius: "12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s", alignItems: "flex-start" },
  formGrid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  themeRow:       { display: "flex", gap: "16px" },
  adminGrid:      { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" },
  adminCard:      { padding: "16px", borderRadius: "12px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" },
  topFeature:     { display: "flex", alignItems: "flex-start", gap: "12px" },
  row:            { display: "flex" },
};
