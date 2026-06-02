import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

const CHECK_IN_OPTIONS = [5, 10, 15, 20, 30];

export default function SafeWalkPage() {
  const { speak: speakA } = useAccessibility();
  const [active, setActive] = useState(false);
  const [interval, setIntervalMin] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [destination, setDestination] = useState("");
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | walking | safe | sos_sent
  const [checkIns, setCheckIns] = useState([]);
  const [sosSent, setSosSent] = useState(false);
  const timerRef = useRef(null);
  const warnedRef = useRef(false);

  const speak = useCallback((text) => { speakA(text); }, [speakA]);

  const getLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
        setLocationError("");
      },
      (err) => {
        setLocationError("Could not get location: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { getLocation(); }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sendAutoSos = useCallback(async () => {
    setSosSent(true);
    setStatus("sos_sent");
    speak("No check-in received. Sending SOS alert to your emergency contacts now.");
    const locText = location ? `GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Location unavailable";
    const dest = destination.trim() || "Unknown destination";
    try {
      await API.post("/sos", {
        message: `Safe Walk auto-SOS: No check-in for ${interval} minutes. Destination: ${dest}. ${locText}`,
        location: locText,
      });
    } catch (_) {}
  }, [location, interval, destination, speak]);

  const resetTimer = useCallback((mins) => {
    const secs = mins * 60;
    setSecondsLeft(secs);
    setTotalSeconds(secs);
    warnedRef.current = false;
    setSosSent(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          sendAutoSos();
          return 0;
        }
        if (prev === 30 && !warnedRef.current) {
          warnedRef.current = true;
          speak("30 seconds left to check in. Tap I'm Safe or SOS will be sent.");
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [active, sendAutoSos, speak]);

  const startWalk = () => {
    getLocation();
    resetTimer(interval);
    setActive(true);
    setStatus("walking");
    setCheckIns([]);
    setSosSent(false);
    speak(`Safe walk started. You have ${interval} minutes to check in. Tap I'm Safe when you arrive.`);
  };

  const stopWalk = () => {
    clearInterval(timerRef.current);
    setActive(false);
    setStatus("idle");
    setSecondsLeft(0);
    speak("Safe walk session ended.");
  };

  const checkIn = () => {
    if (!active || sosSent) return;
    clearInterval(timerRef.current);
    const now = new Date().toLocaleTimeString();
    setCheckIns((prev) => [{ time: now, type: "safe" }, ...prev]);
    setStatus("safe");
    speak("Great! Check-in confirmed. Restarting timer.");
    resetTimer(interval);
    setActive(true);
  };

  const sendManualSos = async () => {
    speak("Sending SOS alert now.");
    const locText = location ? `GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Location unavailable";
    try {
      await API.post("/sos", {
        message: `Manual SOS from Safe Walk. Destination: ${destination || "Unknown"}. ${locText}`,
        location: locText,
      });
      setCheckIns((prev) => [{ time: new Date().toLocaleTimeString(), type: "sos" }, ...prev]);
      speak("SOS sent to your emergency contacts.");
    } catch (_) {
      speak("Could not send SOS. Please call emergency services directly.");
    }
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const isUrgent = secondsLeft > 0 && secondsLeft <= 30;
  const mapsUrl = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null;

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>🚶 Safe Walk</h1>
          <p>Auto-SOS timer — if you don't check in, your emergency contacts are alerted</p>
        </div>

        <div style={s.grid}>
          {/* Left: main panel */}
          <div style={s.main}>
            {/* Status banner */}
            {status !== "idle" && (
              <div style={{ ...s.statusBanner, ...(status === "sos_sent" ? s.bannerRed : status === "safe" ? s.bannerGreen : s.bannerYellow) }}
                aria-live="assertive">
                {status === "walking" && "🚶 Walk in progress — check in before timer expires"}
                {status === "safe" && "✅ Checked in — timer restarted"}
                {status === "sos_sent" && "🚨 Auto-SOS sent — emergency contacts have been notified"}
              </div>
            )}

            {/* Timer ring */}
            {active && (
              <div style={s.timerCard} aria-live="polite" aria-label={`${formatTime(secondsLeft)} remaining to check in`}>
                <div style={{ position: "relative", display: "inline-flex", marginBottom: "24px" }}>
                  <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="100" cy="100" r="88" fill="none" stroke="#1f2937" strokeWidth="14" />
                    <circle
                      cx="100" cy="100" r="88" fill="none"
                      stroke={isUrgent ? "#ef4444" : "#facc15"}
                      strokeWidth="14"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (progress / 100)}`}
                      style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={s.timerCenter}>
                    <div style={{ ...s.timerText, color: isUrgent ? "#ef4444" : "#facc15" }}>
                      {formatTime(secondsLeft)}
                    </div>
                    <div style={s.timerLabel}>to check in</div>
                  </div>
                </div>

                <div style={s.bigBtns}>
                  <button onClick={checkIn} style={s.safeBtn} aria-label="Mark yourself as safe and restart timer">
                    ✅ I'm Safe
                  </button>
                  <button onClick={sendManualSos} style={s.sosBtn} aria-label="Send SOS to emergency contacts now">
                    🆘 Send SOS
                  </button>
                </div>

                <button onClick={stopWalk} style={s.stopWalkBtn}>⏹ End Walk</button>
              </div>
            )}

            {/* Setup form */}
            {!active && (
              <div className="card" style={{ marginBottom: "20px" }}>
                <h3 style={s.sectionTitle}>Set Up Safe Walk</h3>

                <div className="form-group">
                  <label>Destination (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Home, Market, Friend's house"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Check-in interval</label>
                  <div style={s.intervalRow}>
                    {CHECK_IN_OPTIONS.map((min) => (
                      <button
                        key={min}
                        onClick={() => setIntervalMin(min)}
                        style={{ ...s.intervalBtn, ...(interval === min ? s.intervalBtnActive : {}) }}
                        aria-pressed={interval === min}
                      >
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* GPS */}
                <div style={s.gpsBox}>
                  <div style={s.gpsRow}>
                    <span style={s.gpsDot(!!location)} />
                    <span style={{ fontSize: "14px", color: location ? "#34d399" : "#6b7280", fontWeight: 600 }}>
                      {location ? `GPS locked (±${location.accuracy}m)` : "GPS not locked"}
                    </span>
                    <button onClick={getLocation} style={s.refreshGpsBtn}>↻ Refresh</button>
                  </div>
                  {location && (
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", marginLeft: "12px" }}>
                          Open in Maps ↗
                        </a>
                      )}
                    </div>
                  )}
                  {locationError && <p style={{ color: "#f87171", fontSize: "13px", marginTop: "6px" }}>{locationError}</p>}
                </div>

                <button onClick={startWalk} style={s.startBtn} aria-label={`Start safe walk with ${interval} minute check-in`}>
                  🚶 Start Safe Walk ({interval} min check-in)
                </button>
              </div>
            )}

            {/* How it works */}
            {!active && (
              <div className="card">
                <h3 style={s.sectionTitle}>How It Works</h3>
                <div style={s.steps}>
                  {[
                    { icon: "1️⃣", text: "Set your check-in interval (how often you confirm you're safe)" },
                    { icon: "2️⃣", text: "Tap \"Start Safe Walk\" when you begin your journey" },
                    { icon: "3️⃣", text: "Tap \"I'm Safe\" before each timer expires to reset it" },
                    { icon: "4️⃣", text: "If you miss a check-in, SOS is auto-sent to your emergency contacts" },
                    { icon: "🆘", text: "Tap \"Send SOS\" at any time if you need immediate help" },
                  ].map((step, i) => (
                    <div key={i} style={s.stepRow}>
                      <span style={s.stepIcon}>{step.icon}</span>
                      <span style={{ fontSize: "14px", color: "#d1d5db", lineHeight: 1.5 }}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div>
            {/* Live location card */}
            <div className="card" style={{ marginBottom: "20px" }}>
              <h3 style={s.sectionTitle}>📍 Your Location</h3>
              {location ? (
                <>
                  <div style={s.coordBox}>
                    <div style={s.coordRow}><span style={s.coordLabel}>Latitude</span><span style={s.coordVal}>{location.lat.toFixed(6)}</span></div>
                    <div style={s.coordRow}><span style={s.coordLabel}>Longitude</span><span style={s.coordVal}>{location.lng.toFixed(6)}</span></div>
                    <div style={s.coordRow}><span style={s.coordLabel}>Accuracy</span><span style={s.coordVal}>±{location.accuracy}m</span></div>
                  </div>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" style={s.mapsLink}>
                      🗺️ Open my location in Maps
                    </a>
                  )}
                </>
              ) : (
                <div style={{ color: "#6b7280", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
                  {locationError || "Fetching GPS location..."}
                  <br />
                  <button onClick={getLocation} style={{ ...s.refreshGpsBtn, marginTop: "12px" }}>↻ Retry</button>
                </div>
              )}
            </div>

            {/* Check-in history */}
            <div className="card">
              <h3 style={s.sectionTitle}>Check-in Log</h3>
              {checkIns.length === 0 ? (
                <p style={{ color: "#4b5563", fontSize: "14px", textAlign: "center", padding: "16px 0" }}>
                  No check-ins yet this session
                </p>
              ) : (
                <div>
                  {checkIns.map((c, i) => (
                    <div key={i} style={s.checkInRow}>
                      <span style={{ fontSize: "18px" }}>{c.type === "safe" ? "✅" : "🚨"}</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: c.type === "safe" ? "#22c55e" : "#ef4444" }}>
                          {c.type === "safe" ? "Checked in safe" : "SOS sent"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>{c.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const s = {
  grid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" },
  main: { display: "flex", flexDirection: "column", gap: "20px" },
  statusBanner: { borderRadius: "12px", padding: "14px 20px", fontWeight: 700, fontSize: "15px", textAlign: "center" },
  bannerYellow: { background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15" },
  bannerGreen:  { background: "rgba(34,197,94,0.1)",  border: "1px solid rgba(34,197,94,0.3)",  color: "#22c55e" },
  bannerRed:    { background: "rgba(239,68,68,0.1)",   border: "1px solid rgba(239,68,68,0.3)",   color: "#ef4444" },
  timerCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: "20px", padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  timerCenter: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" },
  timerText: { fontSize: "42px", fontWeight: 900, fontFamily: "Inter,Arial,sans-serif", lineHeight: 1 },
  timerLabel: { fontSize: "13px", color: "#6b7280", marginTop: "4px", fontWeight: 600 },
  bigBtns: { display: "flex", gap: "16px", marginBottom: "20px", width: "100%" },
  safeBtn: { flex: 1, background: "linear-gradient(135deg,#22c55e,#4ade80)", color: "#000", border: "none", padding: "18px", borderRadius: "14px", fontWeight: 800, fontSize: "18px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  sosBtn:  { flex: 1, background: "linear-gradient(135deg,#ef4444,#f87171)", color: "#fff", border: "none", padding: "18px", borderRadius: "14px", fontWeight: 800, fontSize: "18px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  stopWalkBtn: { background: "transparent", border: "1px solid #374151", color: "#6b7280", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontFamily: "Inter,Arial,sans-serif" },
  sectionTitle: { fontSize: "16px", fontWeight: 700, color: "#f9fafb", marginBottom: "16px" },
  intervalRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  intervalBtn: { background: "#0a0f1e", border: "1.5px solid #374151", color: "#9ca3af", padding: "10px 18px", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "14px", fontFamily: "Inter,Arial,sans-serif", transition: "all 0.15s" },
  intervalBtnActive: { background: "rgba(250,204,21,0.1)", borderColor: "#facc15", color: "#facc15" },
  gpsBox: { background: "#0a0f1e", borderRadius: "12px", padding: "14px 16px", marginBottom: "20px" },
  gpsRow: { display: "flex", alignItems: "center", gap: "10px" },
  gpsDot: (active) => ({ width: "10px", height: "10px", borderRadius: "50%", background: active ? "#22c55e" : "#374151", flexShrink: 0, boxShadow: active ? "0 0 8px #22c55e" : "none" }),
  refreshGpsBtn: { background: "transparent", border: "1px solid #374151", color: "#9ca3af", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "Inter,Arial,sans-serif", marginLeft: "auto" },
  startBtn: { width: "100%", background: "linear-gradient(135deg,#facc15,#fde68a)", color: "#000", border: "none", padding: "16px", borderRadius: "14px", fontWeight: 800, fontSize: "17px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  steps: { display: "flex", flexDirection: "column", gap: "14px" },
  stepRow: { display: "flex", alignItems: "flex-start", gap: "12px" },
  stepIcon: { fontSize: "22px", flexShrink: 0 },
  coordBox: { background: "#0a0f1e", borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" },
  coordRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
  coordLabel: { fontSize: "12px", color: "#6b7280", fontWeight: 600 },
  coordVal: { fontSize: "13px", color: "#f9fafb", fontWeight: 700, fontFamily: "monospace" },
  mapsLink: { display: "block", textAlign: "center", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa", padding: "10px", borderRadius: "10px", textDecoration: "none", fontSize: "14px", fontWeight: 600 },
  checkInRow: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #1f2937" },
};
