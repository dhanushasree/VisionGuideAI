import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

export default function SavedLocationsPage() {
  const { speak, settings } = useAccessibility();
  const isDark = settings.theme === "dark";
  const C = {
    text:        isDark ? "#f9fafb"              : "#0f172a",
    sub:         isDark ? "#9ca3af"              : "#64748b",
    dim:         isDark ? "#6b7280"              : "#94a3b8",
    cardBg:      isDark ? "#111827"              : "#ffffff",
    cardBorder:  isDark ? "#1f2937"              : "rgba(0,0,0,0.09)",
    inputBg:     isDark ? "#111827"              : "rgba(0,0,0,0.04)",
    inputBorder: isDark ? "#374151"              : "rgba(0,0,0,0.14)",
    darkBg:      isDark ? "#0a0f1e"              : "rgba(0,0,0,0.04)",
    cancelBg:    isDark ? "#374151"              : "rgba(0,0,0,0.08)",
  };
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ place_name: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [presetPrompt, setPresetPrompt] = useState(null); // { name, icon }

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchLocations = async () => {
    setLoading(true);
    try { const res = await API.get("/locations"); setLocations(res.data); } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const addLocation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/locations", form);
      setForm({ place_name: "", address: "" });
      await fetchLocations();
      showMessage(`"${form.place_name}" saved successfully.`);
      speak(`${form.place_name} saved to your locations.`);
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to save.", "error");
    }
    setSaving(false);
  };

  const deleteLocation = async (id) => {
    setConfirmId(null);
    try { await API.delete(`/locations/${id}`); await fetchLocations(); showMessage("Location deleted."); }
    catch (_) {}
  };

  const openMaps = (loc) => {
    const query = loc.address ? `${loc.place_name} ${loc.address}` : loc.place_name;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
    speak(`Opening map for ${loc.place_name}`);
  };

  /* Quick-add: pre-fill the form so user can add their real address */
  const handlePreset = (preset) => {
    setForm({ place_name: preset.name, address: "" });
    setPresetPrompt(preset.name);
    speak(`Fill in your ${preset.name} address and tap Save Location.`);
    setTimeout(() => setPresetPrompt(null), 4000);
  };

  const filtered = locations.filter((l) =>
    l.place_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.address || "").toLowerCase().includes(search.toLowerCase())
  );

  const readAll = () => {
    if (!locations.length) { speak("No saved locations."); return; }
    speak(locations.map((l, i) => `Location ${i + 1}. ${l.place_name}. ${l.address ? `Address: ${l.address}.` : ""}`).join(" "));
  };

  const presets = [
    { name: "Home", icon: "🏠" },
    { name: "Office", icon: "🏢" },
    { name: "Hospital", icon: "🏥" },
    { name: "School", icon: "🏫" },
  ];

  const s = {
    grid:       { display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" },
    panelTitle: { fontSize: "16px", fontWeight: 700, color: C.text, marginBottom: "20px" },
    addBtn:     { width: "100%", background: "#34d399", color: "#000", border: "none", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
    presetsGrid:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
    presetBtn:  { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", background: C.darkBg, border: `1px solid ${C.inputBorder}`, color: C.text, padding: "16px 8px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
    voiceBtn:   { width: "100%", background: "rgba(52,211,153,0.1)", border: "2px solid #34d399", color: "#34d399", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
    listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px" },
    countBadge: { background: "rgba(52,211,153,0.15)", color: "#34d399", padding: "2px 10px", borderRadius: "12px", fontSize: "14px" },
    searchInput:{ padding: "10px 16px", background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: "10px", color: C.text, fontSize: "14px", width: "180px", fontFamily: "Inter,Arial,sans-serif", outline: "none" },
    locCard:    { background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderLeft: "4px solid #34d399", borderRadius: "14px", padding: "18px 20px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
    locLeft:    { display: "flex", gap: "14px", alignItems: "center" },
    locIcon:    { fontSize: "28px" },
    locName:    { fontSize: "16px", fontWeight: 700, color: C.text, marginBottom: "4px" },
    locAddress: { fontSize: "13px", color: C.sub },
    locActions: { display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" },
    mapBtn:     { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
    speakBtn:   { background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)", color: "#facc15", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "Inter,Arial,sans-serif" },
    deleteBtn:  { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "Inter,Arial,sans-serif" },
    confirmRow: { display: "flex", alignItems: "center", gap: "6px" },
    confirmYes: { background: "#ef4444", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: "Inter,Arial,sans-serif" },
    confirmNo:  { background: C.cancelBg, color: C.text, border: "none", padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: "Inter,Arial,sans-serif" },
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>📍 Saved Locations</h1>
          <p>Bookmark important places for quick map access</p>
        </div>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
        {presetPrompt && (
          <div className="alert alert-success">
            Fill in your <strong>{presetPrompt}</strong> address below, then tap Save Location.
          </div>
        )}

        <div style={s.grid}>
          <div>
            <div className="card" style={{ marginBottom: "20px" }}>
              <h3 style={s.panelTitle}>Save New Location</h3>
              <form onSubmit={addLocation}>
                <div className="form-group">
                  <label>Place Name *</label>
                  <input type="text" placeholder="e.g. Home, College, Hospital" value={form.place_name}
                    onChange={(e) => setForm({ ...form, place_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Address or Landmark</label>
                  <input type="text" placeholder="e.g. 123 Main St, Chennai" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <button type="submit" disabled={saving} style={s.addBtn}>
                  {saving ? "Saving..." : "📍 Save Location"}
                </button>
              </form>
            </div>

            <div className="card" style={{ marginBottom: "20px" }}>
              <h3 style={s.panelTitle}>Quick Add</h3>
              <p style={{ color: C.sub, fontSize: "13px", marginBottom: "12px" }}>
                Tap to pre-fill the form — add your real address before saving.
              </p>
              <div style={s.presetsGrid}>
                {presets.map((p) => (
                  <button key={p.name} onClick={() => handlePreset(p)} style={s.presetBtn}>
                    <span>{p.icon}</span><span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={s.panelTitle}>Voice Actions</h3>
              <button onClick={readAll} style={s.voiceBtn}>🔊 Read All Locations</button>
            </div>
          </div>

          <div>
            <div style={s.listHeader}>
              <h3 style={s.panelTitle}>Saved Locations <span style={s.countBadge}>{locations.length}</span></h3>
              <input type="text" placeholder="Search..." value={search}
                onChange={(e) => setSearch(e.target.value)} style={s.searchInput} />
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📍</div>
                <h3>{search ? "No matching locations" : "No saved locations"}</h3>
                <p>Save your first location using the form.</p>
              </div>
            ) : (
              filtered.map((loc) => (
                <div key={loc.id} style={s.locCard}>
                  <div style={s.locLeft}>
                    <div style={s.locIcon}>📍</div>
                    <div>
                      <div style={s.locName}>{loc.place_name}</div>
                      {loc.address && <div style={s.locAddress}>{loc.address}</div>}
                    </div>
                  </div>
                  <div style={s.locActions}>
                    <button onClick={() => openMaps(loc)} style={s.mapBtn}>🗺️ Open Map</button>
                    <button onClick={() => speak(`${loc.place_name}. ${loc.address || "No address provided."}`)} style={s.speakBtn}>🔊</button>
                    {confirmId === loc.id ? (
                      <div style={s.confirmRow} role="group" aria-label="Confirm delete">
                        <span style={{ color: "#f87171", fontSize: "13px", fontWeight: 600 }}>Delete?</span>
                        <button onClick={() => deleteLocation(loc.id)} style={s.confirmYes}>Yes</button>
                        <button onClick={() => setConfirmId(null)} style={s.confirmNo}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(loc.id)} style={s.deleteBtn}>🗑️</button>
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

