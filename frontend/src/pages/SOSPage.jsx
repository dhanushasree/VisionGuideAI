import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

export default function SOSPage() {
  const { speak, settings } = useAccessibility();
  const isDark = settings.theme === "dark";
  const C = {
    text:       isDark ? "#f9fafb"              : "#0f172a",
    sub:        isDark ? "#9ca3af"              : "#64748b",
    dim:        isDark ? "#6b7280"              : "#94a3b8",
    cardBg:     isDark ? "#111827"              : "#ffffff",
    cardBorder: isDark ? "#1f2937"              : "rgba(0,0,0,0.09)",
    inputBg:    isDark ? "#1a2235"              : "rgba(0,0,0,0.04)",
    btnBorder:  isDark ? "#374151"              : "rgba(0,0,0,0.12)",
    cancelBg:   isDark ? "#374151"              : "rgba(0,0,0,0.08)",
  };
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ message: "Emergency! I need help.", location: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [message, setMessage] = useState(null);
  const [locating, setLocating] = useState(false);
  const intervalRef = useRef(null);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try { const res = await API.get("/sos"); setAlerts(res.data); } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  /* Cleanup interval on unmount */
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const getLocation = () => {
    if (!navigator.geolocation) { showMessage("Geolocation not supported.", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = `Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`;
        setForm((f) => ({ ...f, location: loc }));
        speak("Location detected.");
        setLocating(false);
      },
      () => { showMessage("Could not detect location.", "error"); setLocating(false); }
    );
  };

  const sendSOS = async (e) => {
    if (e) e.preventDefault();
    setSending(true);
    try {
      await API.post("/sos", { message: form.message, location: form.location });
      await fetchAlerts();
      showMessage("SOS alert sent! Emergency contacts notified.", "success");
      speak("SOS alert sent successfully. Emergency help has been notified.");
      setForm({ message: "Emergency! I need help.", location: "" });
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to send SOS.", "error");
    }
    setSending(false);
  };

  const triggerCountdown = () => {
    let count = 5;
    setCountdown(count);
    speak("Sending SOS in 5 seconds. Tap cancel to abort.");
    intervalRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setCountdown(null);
        sendSOS();
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setCountdown(null);
    speak("SOS cancelled.");
  };

  const deleteAlert = async (id) => {
    try { await API.delete(`/sos/${id}`); await fetchAlerts(); } catch (_) {}
  };

  const s = {
    grid:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" },
    sosMainCard:  { textAlign: "center", padding: "36px 24px" },
    sosCardTitle: { fontSize: "20px", fontWeight: 800, color: C.text, marginBottom: "8px" },
    sosHint:      { color: C.sub, fontSize: "14px", marginBottom: "28px", lineHeight: 1.6 },
    bigSosBtn:    { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "180px", height: "180px", borderRadius: "50%", background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "white", border: "6px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: "52px", fontWeight: 900, margin: "0 auto", fontFamily: "Inter,Arial,sans-serif", boxShadow: "0 0 40px rgba(239,68,68,0.3)", transition: "transform 0.2s" },
    countdownBox: { textAlign: "center", padding: "20px 0" },
    countdownNum: { fontSize: "72px", fontWeight: 900, color: "#ef4444", lineHeight: 1 },
    cancelBtn:    { background: C.cancelBg, color: C.text, border: `1px solid ${C.btnBorder}`, padding: "14px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
    sectionTitle: { fontSize: "17px", fontWeight: 700, color: C.text, marginBottom: "20px" },
    locationRow:  { display: "flex", gap: "10px", alignItems: "stretch" },
    geoBtn:       { background: C.inputBg, border: `1px solid ${C.btnBorder}`, color: C.sub, padding: "14px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontFamily: "Inter,Arial,sans-serif", whiteSpace: "nowrap", fontWeight: 600 },
    submitSosBtn: { width: "100%", background: "#dc2626", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
    countBadge:   { background: "rgba(239,68,68,0.15)", color: "#f87171", padding: "2px 10px", borderRadius: "12px", fontSize: "14px" },
    alertCard:    { background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderLeft: "4px solid #ef4444", borderRadius: "14px", padding: "18px", marginBottom: "14px" },
    alertTop:     { display: "flex", gap: "14px", alignItems: "flex-start" },
    alertIcon:    { fontSize: "24px", flexShrink: 0 },
    alertInfo:    { flex: 1 },
    alertMsg:     { fontSize: "15px", fontWeight: 600, color: C.text, marginBottom: "6px" },
    alertLocation:{ fontSize: "13px", color: C.sub, marginBottom: "8px" },
    alertMeta:    { display: "flex", gap: "12px", alignItems: "center" },
    sentBadge:    { background: "rgba(239,68,68,0.1)", color: "#f87171", padding: "2px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: 700 },
    deleteBtn:    { background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: "18px", padding: "4px", flexShrink: 0 },
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>🚨 SOS Alert System</h1>
          <p>Send emergency alerts instantly. Logs all SOS events for reference.</p>
        </div>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

        <div style={s.grid}>
          <div>
            <div className="card" style={s.sosMainCard}>
              <h3 style={s.sosCardTitle}>Emergency SOS</h3>
              <p style={s.sosHint}>Press the button below. A 5-second countdown lets you cancel if pressed by accident.</p>

              {countdown !== null ? (
                <div style={s.countdownBox} role="status" aria-live="assertive">
                  <div style={s.countdownNum}>{countdown}</div>
                  <p style={{ color: "#f87171", fontWeight: 600, marginBottom: "20px" }}>
                    Sending SOS in {countdown} second{countdown !== 1 ? "s" : ""}...
                  </p>
                  <button onClick={cancelCountdown} style={s.cancelBtn}>✕ Cancel SOS</button>
                </div>
              ) : (
                <button onClick={triggerCountdown} disabled={sending} style={s.bigSosBtn} className="pulse"
                  aria-label="Send SOS emergency alert">
                  🚨<span>SEND SOS ALERT</span>
                </button>
              )}
            </div>

            <div className="card" style={{ marginTop: "20px" }}>
              <h3 style={s.sectionTitle}>Custom SOS Message</h3>
              <form onSubmit={sendSOS}>
                <div className="form-group">
                  <label>SOS Message</label>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe your emergency..." style={{ minHeight: "100px" }} required />
                </div>
                <div className="form-group">
                  <label>Your Location</label>
                  <div style={s.locationRow}>
                    <input type="text" placeholder="e.g. Near the college gate, Chennai"
                      value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                      style={{ flex: 1 }} />
                    <button type="button" onClick={getLocation} style={s.geoBtn} disabled={locating}>
                      {locating ? "⏳" : "📍 Detect"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={sending} style={s.submitSosBtn}>
                  {sending ? "Sending..." : "🚨 Send Custom SOS"}
                </button>
              </form>
            </div>
          </div>

          <div>
            <h3 style={s.sectionTitle}>SOS History <span style={s.countBadge}>{alerts.length}</span></h3>
            {loading ? <div className="spinner" /> : alerts.length === 0 ? (
              <div className="empty-state">
                <div className="icon">✅</div>
                <h3>No SOS alerts sent</h3>
                <p>All clear. Your SOS history will appear here.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} style={s.alertCard}>
                  <div style={s.alertTop}>
                    <span style={s.alertIcon}>🚨</span>
                    <div style={s.alertInfo}>
                      <div style={s.alertMsg}>{alert.message}</div>
                      {alert.location && <div style={s.alertLocation}>📍 {alert.location}</div>}
                      <div style={s.alertMeta}>
                        <span style={s.sentBadge}>{alert.status || "sent"}</span>
                        {alert.created_at && (
                          <span style={{ color: "#6b7280", fontSize: "12px" }}>
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} style={s.deleteBtn} title="Delete">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

