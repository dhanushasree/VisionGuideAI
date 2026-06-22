import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

export default function FeedbackPage() {
  const { user } = useAuth();
  const { speak, settings } = useAccessibility();
  const isDark = settings.theme === "dark";
  const C = {
    text:        isDark ? "#f9fafb"              : "#0f172a",
    sub:         isDark ? "#9ca3af"              : "#64748b",
    dim:         isDark ? "#6b7280"              : "#94a3b8",
    cardBg:      isDark ? "#111827"              : "#ffffff",
    cardBorder:  isDark ? "#1f2937"              : "rgba(0,0,0,0.09)",
    darkBg:      isDark ? "#0a0f1e"              : "rgba(0,0,0,0.04)",
    starOff:     isDark ? "#374151"              : "#d1d5db",
    cancelBg:    isDark ? "#374151"              : "rgba(0,0,0,0.08)",
  };
  const [feedbacks, setFeedbacks] = useState([]);
  const [form, setForm] = useState({ name: user?.name || "", feedback: "", rating: 5 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try { const res = await API.get("/feedback"); setFeedbacks(res.data); } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const submitFeedback = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/feedback", form);
      setForm({ name: user?.name || "", feedback: "", rating: 5 });
      await fetchFeedbacks();
      showMessage("Thank you for your feedback!");
      speak("Feedback submitted. Thank you.");
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to submit.", "error");
    }
    setSaving(false);
  };

  const deleteFeedback = async (id) => {
    try { await API.delete(`/feedback/${id}`); await fetchFeedbacks(); } catch (_) {}
  };

  /* Keyboard-accessible star rating */
  const StarRating = ({ value, onChange, size = 28 }) => (
    <div role="radiogroup" aria-label="Rating" style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          tabIndex={star === value ? 0 : -1}
          onClick={() => onChange(star)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && value < 5) onChange(value + 1);
            if (e.key === "ArrowLeft"  && value > 1) onChange(value - 1);
          }}
          style={{
            fontSize: `${size}px`,
            color: star <= value ? "#facc15" : C.starOff,
            background: "transparent", border: "none", cursor: "pointer",
            padding: "2px", transition: "transform 0.1s",
            outline: star === value ? "2px solid #facc15" : "none",
            borderRadius: "4px",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );

  /* Read-only stars */
  const Stars = ({ value }) => (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1,2,3,4,5].map((s) => (
        <span key={s} style={{ fontSize: "18px", color: s <= value ? "#facc15" : C.starOff }}>★</span>
      ))}
    </div>
  );

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
    : "—";

  const s = {
    grid:         { display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px", alignItems: "start" },
    panelTitle:   { fontSize: "16px", fontWeight: 700, color: C.text, marginBottom: "20px" },
    submitBtn:    { width: "100%", background: "#fb923c", color: "#000", border: "none", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
    statRow:      { display: "flex", gap: "16px" },
    statBox:      { flex: 1, textAlign: "center", padding: "16px", background: C.darkBg, borderRadius: "12px" },
    statNum:      { fontSize: "32px", fontWeight: 900, color: C.text, marginBottom: "4px" },
    statLabel:    { fontSize: "12px", color: C.dim, fontWeight: 600 },
    countBadge:   { background: "rgba(251,146,60,0.15)", color: "#fb923c", padding: "2px 10px", borderRadius: "12px", fontSize: "14px" },
    feedbackCard: { background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderLeft: "4px solid #fb923c", borderRadius: "14px", padding: "20px", marginBottom: "16px" },
    fbTop:        { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" },
    fbAuthor:     { display: "flex", gap: "12px", alignItems: "center" },
    fbAvatar:     { width: "40px", height: "40px", borderRadius: "50%", background: "rgba(251,146,60,0.15)", color: "#fb923c", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "16px" },
    fbName:       { fontSize: "15px", fontWeight: 700, color: C.text, marginBottom: "4px" },
    fbText:       { fontSize: "15px", color: C.sub, lineHeight: 1.7, marginBottom: "10px" },
    fbTime:       { fontSize: "12px", color: C.dim },
    deleteBtn:    { background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: "16px" },
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>💬 Feedback</h1>
          <p>Share your experience with VisionGuide AI. Your feedback helps us improve.</p>
        </div>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

        <div style={s.grid}>
          <div>
            <div className="card" style={{ marginBottom: "20px" }}>
              <h3 style={s.panelTitle}>Share Your Feedback</h3>
              <form onSubmit={submitFeedback}>
                <div className="form-group">
                  <label>Your Name</label>
                  <input type="text" placeholder="Your name (optional)" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label id="rating-label">Rating</label>
                  <div style={{ marginTop: "8px" }}>
                    <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
                    <p style={{ color: C.sub, fontSize: "13px", marginTop: "8px" }}>
                      {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][form.rating]}
                      {" "}— use arrow keys to change
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Your Feedback *</label>
                  <textarea
                    placeholder="Tell us what you think about VisionGuide AI..."
                    value={form.feedback}
                    onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                    style={{ minHeight: "140px" }} required
                  />
                </div>

                <button type="submit" disabled={saving} style={s.submitBtn}>
                  {saving ? "Submitting..." : "💬 Submit Feedback"}
                </button>
              </form>
            </div>

            <div className="card">
              <h3 style={s.panelTitle}>Community Stats</h3>
              <div style={s.statRow}>
                <div style={s.statBox}><div style={s.statNum}>{feedbacks.length}</div><div style={s.statLabel}>Reviews</div></div>
                <div style={s.statBox}><div style={{ ...s.statNum, color: "#facc15" }}>{avgRating}</div><div style={s.statLabel}>Avg Rating</div></div>
                <div style={s.statBox}><div style={{ ...s.statNum, color: "#22c55e" }}>{feedbacks.filter((f) => f.rating >= 4).length}</div><div style={s.statLabel}>Positive</div></div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={s.panelTitle}>Community Feedback <span style={s.countBadge}>{feedbacks.length}</span></h3>

            {loading ? <div className="spinner" /> : feedbacks.length === 0 ? (
              <div className="empty-state">
                <div className="icon">💬</div>
                <h3>No feedback yet</h3>
                <p>Be the first to share your experience!</p>
              </div>
            ) : (
              feedbacks.map((fb) => (
                <div key={fb.id} style={s.feedbackCard}>
                  <div style={s.fbTop}>
                    <div style={s.fbAuthor}>
                      <div style={s.fbAvatar}>{(fb.name || "A").charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={s.fbName}>{fb.name || "Anonymous User"}</div>
                        <Stars value={fb.rating || 0} />
                      </div>
                    </div>
                    <button onClick={() => deleteFeedback(fb.id)} style={s.deleteBtn} title="Delete">🗑️</button>
                  </div>
                  <p style={s.fbText}>{fb.feedback}</p>
                  {fb.created_at && <div style={s.fbTime}>{new Date(fb.created_at).toLocaleDateString()}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

