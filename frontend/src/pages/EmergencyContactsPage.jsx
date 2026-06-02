import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

/* ── DTMF frequencies for each key ── */
const DTMF = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

const DIAL_LABELS = {
  "1": "",   "2": "ABC", "3": "DEF",
  "4": "GHI","5": "JKL", "6": "MNO",
  "7": "PQRS","8": "TUV","9": "WXYZ",
  "*": "",   "0": "+",  "#": "",
};

function playDtmf(key, audioCtxRef) {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const [f1, f2] = DTMF[key] || [0, 0];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    gain.connect(ctx.destination);
    [f1, f2].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    });
  } catch {}
}

function speakKey(key) {
  window.speechSynthesis.cancel();
  const label = key === "*" ? "star" : key === "#" ? "hash" : key;
  const u = new SpeechSynthesisUtterance(label);
  u.rate = 1.3;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

/* ── Dialpad component ── */
function Dialpad({ onClose, isDark }) {
  const [digits, setDigits] = useState("");
  const audioCtxRef = useRef(null);

  const press = useCallback((key) => {
    playDtmf(key, audioCtxRef);
    speakKey(key);
    setDigits(prev => (prev + key).slice(0, 15));
  }, []);

  const backspace = () => {
    if (!digits) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("deleted");
    u.rate = 1.3; window.speechSynthesis.speak(u);
    setDigits(prev => prev.slice(0, -1));
  };

  const clear = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("cleared"); u.rate = 1.3;
    window.speechSynthesis.speak(u);
    setDigits("");
  };

  const callNow = () => {
    if (!digits) {
      const u = new SpeechSynthesisUtterance("Please enter a number first."); window.speechSynthesis.speak(u);
      return;
    }
    const u = new SpeechSynthesisUtterance(`Calling ${digits.split("").join(" ")}`);
    window.speechSynthesis.speak(u);
    setTimeout(() => window.open(`tel:${digits}`, "_self"), 600);
  };

  const C = {
    bg:     isDark ? "#0d1117" : "#f1f5f9",
    card:   isDark ? "#111827" : "#fff",
    border: isDark ? "#1f2937" : "#e2e8f0",
    text:   isDark ? "#f9fafb" : "#0f172a",
    sub:    isDark ? "#6b7280" : "#64748b",
    btnBg:  isDark ? "#1f2937" : "#f8fafc",
    btnBdr: isDark ? "#374151" : "#e2e8f0",
  };

  const KEYS = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["*","0","#"],
  ];

  return (
    <div style={{ ...dp.wrap, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: C.text }}>📱 Dialpad</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: "18px" }} aria-label="Close dialpad">✕</button>
      </div>

      {/* Number display */}
      <div style={{ ...dp.display, background: C.bg, border: `2px solid ${C.border}`, color: C.text }}>
        <span style={{ fontSize: digits ? "24px" : "16px", fontWeight: 700, letterSpacing: "4px", color: digits ? C.text : C.sub }}>
          {digits || "Enter number"}
        </span>
        {digits && (
          <button onClick={backspace} style={{ ...dp.displayBtn, color: "#f87171" }} aria-label="Backspace">⌫</button>
        )}
      </div>

      {/* Key grid */}
      <div style={dp.grid}>
        {KEYS.map((row, ri) =>
          row.map(key => (
            <button
              key={key}
              onClick={() => press(key)}
              style={{ ...dp.key, background: C.btnBg, border: `1.5px solid ${C.btnBdr}`, color: C.text }}
              aria-label={`Dial ${key}`}
            >
              <span style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>{key}</span>
              {DIAL_LABELS[key] && (
                <span style={{ fontSize: "9px", color: C.sub, letterSpacing: "1.5px", marginTop: "2px" }}>{DIAL_LABELS[key]}</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
        <button onClick={clear} style={{ ...dp.actionBtn, background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
          Clear
        </button>
        <button onClick={callNow} style={{ ...dp.callBtn }} aria-label="Call this number">
          📞 Call
        </button>
      </div>

      <p style={{ fontSize: "11px", color: C.sub, textAlign: "center", marginTop: "12px" }}>
        Each key plays a tone and speaks the digit aloud
      </p>
    </div>
  );
}

const dp = {
  wrap:       { borderRadius: "18px", padding: "20px", marginTop: "20px" },
  display:    { borderRadius: "12px", padding: "16px 20px", marginBottom: "18px", minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  displayBtn: { background: "none", border: "none", fontSize: "22px", cursor: "pointer", padding: "4px 8px" },
  grid:       { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" },
  key:        { borderRadius: "14px", padding: "16px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "68px", transition: "transform 0.08s, box-shadow 0.08s", fontFamily: "Inter,sans-serif", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" },
  actionBtn:  { flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "15px", fontFamily: "Inter,sans-serif" },
  callBtn:    { flex: 2, padding: "14px", borderRadius: "12px", background: "#22c55e", color: "#000", border: "none", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,sans-serif", boxShadow: "0 4px 14px rgba(34,197,94,0.35)" },
};

export default function EmergencyContactsPage() {
  const { speak, settings } = useAccessibility();
  const isDark = settings?.theme === "dark";
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [showDialpad, setShowDialpad] = useState(false);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await API.get("/emergency");
      setContacts(res.data);
    } catch (_) {
      showMessage("Failed to load contacts.", "error");
    }
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, []);

  const addContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/emergency", form);
      setForm({ name: "", phone: "", relation: "" });
      await fetchContacts();
      showMessage("Emergency contact added successfully.");
      speak("Emergency contact added successfully.");
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to add contact.", "error");
    }
    setSaving(false);
  };

  const deleteContact = async (id) => {
    setConfirmId(null);
    try {
      await API.delete(`/emergency/${id}`);
      await fetchContacts();
      showMessage("Contact deleted.");
      speak("Contact deleted.");
    } catch (_) {
      showMessage("Failed to delete contact.", "error");
    }
  };

  const readAll = () => {
    if (!contacts.length) { speak("No emergency contacts saved."); return; }
    const text = contacts.map((c, i) => `Contact ${i + 1}. ${c.name}. Phone ${c.phone}. Relation ${c.relation}.`).join(" ");
    speak(text);
  };

  const readOne = (c) => speak(`${c.name}. Phone ${c.phone}. Relation ${c.relation}.`);
  const callContact = (phone, name) => {
    speak(`Calling ${name}.`);
    setTimeout(() => window.open(`tel:${phone}`, "_self"), 600);
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.relation.toLowerCase().includes(search.toLowerCase())
  );

  const relationColors = {
    parent: "#22c55e", mother: "#22c55e", father: "#22c55e",
    sibling: "#60a5fa", brother: "#60a5fa", sister: "#60a5fa",
    spouse: "#f472b6", wife: "#f472b6", husband: "#f472b6",
    friend: "#facc15", doctor: "#a78bfa", default: "#9ca3af",
  };
  const getRelationColor = (relation) => {
    const key = relation?.toLowerCase() || "";
    const match = Object.keys(relationColors).find((k) => key.includes(k));
    return match ? relationColors[match] : relationColors.default;
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>📞 Emergency Contacts</h1>
          <p>Manage trusted contacts who can help in emergencies</p>
        </div>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

        <div style={s.grid}>
          <div style={s.formPanel}>
            <div className="card">
              <h3 style={s.panelTitle}>Add New Contact</h3>
              <form onSubmit={addContact}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" placeholder="e.g. Mother, Dr. Smith" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" placeholder="e.g. +91 9876543210" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Relation *</label>
                  <input type="text" placeholder="e.g. Parent, Friend, Doctor" value={form.relation}
                    onChange={(e) => setForm({ ...form, relation: e.target.value })} required />
                </div>
                <button type="submit" disabled={saving} style={s.addBtn}>
                  {saving ? "Adding..." : "➕ Add Contact"}
                </button>
              </form>
            </div>
            <div className="card" style={{ marginTop: "20px" }}>
              <h3 style={s.panelTitle}>Voice Actions</h3>
              <button onClick={readAll} style={s.voiceActionBtn}>🔊 Read All Contacts Aloud</button>
              <button
                onClick={() => { setShowDialpad(v => !v); speak(showDialpad ? "Dialpad closed." : "Dialpad opened. Each key plays a tone and speaks the digit."); }}
                style={{ ...s.voiceActionBtn, marginTop: "12px", borderColor: "#60a5fa", color: "#60a5fa", background: "rgba(96,165,250,0.08)" }}
              >
                📱 {showDialpad ? "Close Dialpad" : "Open Dialpad"}
              </button>
              <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "12px" }}>
                Say "read contacts" in the Voice Assistant.
              </p>
            </div>

            {showDialpad && (
              <Dialpad onClose={() => { setShowDialpad(false); speak("Dialpad closed."); }} isDark={isDark} />
            )}
          </div>

          <div style={s.listPanel}>
            <div style={s.listHeader}>
              <h3 style={s.panelTitle}>Saved Contacts <span style={s.countBadge}>{contacts.length}</span></h3>
              <input type="text" placeholder="Search contacts..." value={search}
                onChange={(e) => setSearch(e.target.value)} style={s.searchInput} />
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📞</div>
                <h3>{search ? "No matching contacts" : "No contacts yet"}</h3>
                <p>{search ? "Try a different search" : "Add your first emergency contact using the form."}</p>
              </div>
            ) : (
              filtered.map((contact) => (
                <div key={contact.id} style={{ ...s.contactCard, borderLeft: `4px solid ${getRelationColor(contact.relation)}` }}>
                  <div style={s.contactTop}>
                    <div style={{ ...s.contactAvatar, background: getRelationColor(contact.relation) + "20", color: getRelationColor(contact.relation) }}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={s.contactInfo}>
                      <div style={s.contactName}>{contact.name}</div>
                      <div style={s.contactPhone}>{contact.phone}</div>
                      <span style={{ ...s.relationBadge, background: getRelationColor(contact.relation) + "15", color: getRelationColor(contact.relation) }}>
                        {contact.relation}
                      </span>
                    </div>
                  </div>
                  <div style={s.contactActions}>
                    <button onClick={() => readOne(contact)} style={s.actionBtn}>🔊 Read</button>
                    <button onClick={() => callContact(contact.phone, contact.name)} style={s.callBtn}>📞 Call</button>
                    {confirmId === contact.id ? (
                      <div style={s.confirmRow} role="group" aria-label="Confirm delete">
                        <span style={{ color: "#f87171", fontSize: "13px", fontWeight: 600 }}>Delete?</span>
                        <button onClick={() => deleteContact(contact.id)} style={s.confirmYes} aria-label="Yes, delete">Yes</button>
                        <button onClick={() => setConfirmId(null)} style={s.confirmNo} aria-label="Cancel delete">No</button>
                      </div>
                    ) : (
                      <button onClick={() => { setConfirmId(contact.id); speak("Press Yes to confirm delete."); }} style={s.deleteBtn}>🗑️ Delete</button>
                    )}
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

const s = {
  grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" },
  formPanel: {}, listPanel: {},
  panelTitle: { fontSize: "16px", fontWeight: 700, color: "#f9fafb", marginBottom: "20px" },
  addBtn: { width: "100%", background: "#22c55e", color: "#000", border: "none", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", marginTop: "4px" },
  voiceActionBtn: { width: "100%", background: "rgba(250,204,21,0.1)", border: "2px solid #facc15", color: "#facc15", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px", flexWrap: "wrap" },
  countBadge: { background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "2px 10px", borderRadius: "12px", fontSize: "14px" },
  searchInput: { padding: "10px 16px", background: "#111827", border: "1px solid #374151", borderRadius: "10px", color: "#f9fafb", fontSize: "14px", width: "200px", fontFamily: "Inter,Arial,sans-serif", outline: "none" },
  contactCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: "14px", padding: "18px 20px", marginBottom: "16px" },
  contactTop: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" },
  contactAvatar: { width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "20px", flexShrink: 0 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: "18px", fontWeight: 700, color: "#f9fafb", marginBottom: "4px" },
  contactPhone: { fontSize: "15px", color: "#9ca3af", marginBottom: "8px" },
  relationBadge: { display: "inline-block", padding: "3px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: 600 },
  contactActions: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  actionBtn: { flex: 1, background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)", color: "#facc15", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
  callBtn: { flex: 1, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
  deleteBtn: { flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
  confirmRow: { display: "flex", alignItems: "center", gap: "8px" },
  confirmYes: { background: "#ef4444", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "Inter,Arial,sans-serif" },
  confirmNo: { background: "#374151", color: "#f9fafb", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "Inter,Arial,sans-serif" },
};
