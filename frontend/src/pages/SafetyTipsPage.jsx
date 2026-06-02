import React, { useState, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import DashboardLayout from "../components/DashboardLayout";

/* ── Safety tip categories with full content ── */
const CATEGORIES = [
  {
    id: "road",
    icon: "🛣️",
    title: "Road Crossing Safety",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    tips: [
      "Always use pedestrian crossings or zebra crossings when available.",
      "Look left, then right, then left again before you start crossing.",
      "Never cross when the traffic signal shows red for pedestrians.",
      "Use footbridges or underpasses on busy highways.",
      "Avoid using your phone or headphones while crossing the road.",
      "Walk on the footpath and always face oncoming traffic.",
      "Make eye contact with drivers before stepping onto the road.",
      "At night, wear bright or reflective clothing to be visible.",
    ],
  },
  {
    id: "emergency",
    icon: "🚨",
    title: "Emergency Safety",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    tips: [
      "Keep emergency numbers saved: 100 for Police, 101 for Fire, 108 for Ambulance.",
      "Memorise your home address and current location for emergencies.",
      "Always carry your ID and any important medical information.",
      "Stay calm and speak clearly when calling emergency services.",
      "Use the SOS feature in VisionGuide AI to instantly alert your emergency contacts.",
      "If you feel unsafe, move toward a crowded or well-lit area immediately.",
      "Never share personal information with strangers.",
      "Keep your phone charged before leaving home.",
    ],
  },
  {
    id: "transport",
    icon: "🚌",
    title: "Public Transport Safety",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
    tips: [
      "Stay in well-lit and populated areas while waiting for transport.",
      "Keep your valuables like phone and wallet hidden and secure.",
      "Be aware of your surroundings and trust your instincts.",
      "If travelling alone at night, sit near the driver or conductor.",
      "Have your destination address saved or ready before boarding.",
      "Confirm the bus or train number before boarding.",
      "Do not accept food or drinks from strangers on transport.",
      "Let someone know your travel plans and expected arrival time.",
    ],
  },
  {
    id: "navigation",
    icon: "🗺️",
    title: "Navigation Safety",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.2)",
    tips: [
      "Share your live location with a trusted contact before going out.",
      "Use the Safe Walk feature in VisionGuide AI for continuous safety monitoring.",
      "Stay on well-lit, populated routes especially after dark.",
      "Avoid shortcuts through unfamiliar or poorly lit areas.",
      "Keep your phone fully charged before long journeys.",
      "Download offline maps in case you lose internet connectivity.",
      "Use the Navigation feature in this app to get step-by-step guidance.",
      "If you feel lost, enter a nearby shop or public place and ask for help.",
    ],
  },
];

export default function SafetyTipsPage() {
  const { settings, speak } = useAccessibility();
  const isDark   = settings.theme === "dark";
  const [active, setActive] = useState("road");
  const [reading, setReading] = useState(false);
  const utterRef = useRef(null);

  const C = {
    bg:       isDark ? "#111827" : "#ffffff",
    border:   isDark ? "#1f2937" : "rgba(0,0,0,0.09)",
    text:     isDark ? "#f9fafb" : "#0f172a",
    sub:      isDark ? "#9ca3af" : "#64748b",
    tipRow:   isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
    tipBorder:isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    tabBg:    isDark ? "#0d1117" : "#f8fafc",
  };

  const category = CATEGORIES.find(c => c.id === active) || CATEGORIES[0];

  /* ── Read all tips aloud ── */
  const readAll = () => {
    window.speechSynthesis.cancel();
    setReading(true);
    const fullText = `${category.title}. ${category.tips.join(". ")}`;
    const u = new SpeechSynthesisUtterance(fullText);
    u.lang   = settings.language;
    u.rate   = settings.voiceSpeed;
    u.volume = 1;
    utterRef.current = u;
    u.onend  = () => setReading(false);
    u.onerror = () => setReading(false);
    window.speechSynthesis.speak(u);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setReading(false);
  };

  const readSingleTip = (tip) => {
    window.speechSynthesis.cancel();
    speak(tip);
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>🛡️ Safety Tips</h1>
          <p>Essential safety guidance — tap any tip or press "Read All" to hear it aloud.</p>
        </div>

        {/* ── Category tabs ── */}
        <div style={{ ...st.tabs, background: C.tabBg, border: `1px solid ${C.border}` }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              style={{
                ...st.tab,
                background: active === cat.id ? cat.color + "18" : "transparent",
                color:      active === cat.id ? cat.color : C.sub,
                borderBottom: active === cat.id ? `2px solid ${cat.color}` : "2px solid transparent",
                fontWeight: active === cat.id ? 700 : 400,
              }}
              onClick={() => { setActive(cat.id); stopReading(); }}
              aria-pressed={active === cat.id}
            >
              <span style={{ fontSize: "18px" }}>{cat.icon}</span>
              <span style={{ fontSize: "13px" }}>{cat.title}</span>
            </button>
          ))}
        </div>

        {/* ── Active category panel ── */}
        <div style={{ ...st.panel, background: C.bg, border: `1px solid ${C.border}` }}>
          {/* Panel header */}
          <div style={{ ...st.panelHeader, background: category.bg, borderBottom: `1px solid ${category.border}` }}>
            <span style={{ fontSize: "32px" }}>{category.icon}</span>
            <div>
              <h2 style={{ color: category.color, fontSize: "20px", fontWeight: 800 }}>{category.title}</h2>
              <p style={{ color: C.sub, fontSize: "13px" }}>{category.tips.length} safety tips</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
              {reading ? (
                <button className="btn btn-red btn-sm" onClick={stopReading}>
                  ⏹ Stop Reading
                </button>
              ) : (
                <button
                  className="btn btn-sm"
                  style={{ background: category.color, color: "#000", fontWeight: 700 }}
                  onClick={readAll}
                >
                  🔊 Read All Aloud
                </button>
              )}
            </div>
          </div>

          {/* Reading indicator */}
          {reading && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", background: "rgba(34,197,94,0.08)", borderBottom: "1px solid rgba(34,197,94,0.15)" }}>
              <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: "4px", background: "#22c55e", borderRadius: "2px", animation: "barPulse 0.8s ease infinite", animationDelay: `${i * 0.15}s`, height: "16px" }} />
                ))}
              </div>
              <span style={{ color: "#22c55e", fontSize: "13px", fontWeight: 600 }}>Reading aloud…</span>
            </div>
          )}

          {/* Tips list */}
          <div style={{ padding: "16px" }}>
            {category.tips.map((tip, i) => (
              <div
                key={i}
                style={{ ...st.tipRow, background: C.tipRow, border: `1px solid ${C.tipBorder}`, cursor: "pointer" }}
                onClick={() => readSingleTip(tip)}
                title="Click to hear this tip"
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && readSingleTip(tip)}
                aria-label={`Tip ${i + 1}: ${tip}`}
              >
                <div style={{ ...st.tipNumber, background: category.color + "22", color: category.color }}>
                  {i + 1}
                </div>
                <p style={{ color: C.text, fontSize: "15px", lineHeight: 1.6, flex: 1 }}>{tip}</p>
                <button
                  style={{ ...st.speakBtn, color: category.color }}
                  onClick={e => { e.stopPropagation(); readSingleTip(tip); }}
                  title="Read this tip aloud"
                  aria-label="Speak this tip"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── All categories overview ── */}
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text, marginTop: "24px", marginBottom: "14px" }}>
          📚 All Categories
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              style={{
                ...st.catCard,
                background: active === cat.id ? cat.bg : (isDark ? "#111827" : "#f8fafc"),
                border: active === cat.id ? `1px solid ${cat.border}` : `1px solid ${C.border}`,
                cursor: "pointer",
              }}
              onClick={() => { setActive(cat.id); stopReading(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              <span style={{ fontSize: "28px" }}>{cat.icon}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: active === cat.id ? cat.color : C.text }}>{cat.title}</span>
              <span style={{ fontSize: "12px", color: C.sub }}>{cat.tips.length} tips</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes barPulse { 0%,100%{height:6px} 50%{height:20px} }
      `}</style>
    </DashboardLayout>
  );
}

const st = {
  tabs:      { display: "flex", borderRadius: "12px", padding: "4px", marginBottom: "20px", overflow: "hidden", gap: "2px" },
  tab:       { flex: 1, padding: "10px 8px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.15s" },
  panel:     { borderRadius: "16px", overflow: "hidden", marginBottom: "20px" },
  panelHeader:{ display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px", flexWrap: "wrap" },
  tipRow:    { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", borderRadius: "12px", marginBottom: "8px", transition: "all 0.15s" },
  tipNumber: { width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0, marginTop: "2px" },
  speakBtn:  { background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", padding: "0 4px", flexShrink: 0 },
  catCard:   { borderRadius: "12px", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.15s" },
};
