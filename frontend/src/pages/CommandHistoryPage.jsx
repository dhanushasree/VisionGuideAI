import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

const typeLabels = {
  greeting:   { label: "Greeting",   color: "#22c55e" },
  contacts:   { label: "Contacts",   color: "#60a5fa" },
  articles:   { label: "Articles",   color: "#facc15" },
  locations:  { label: "Locations",  color: "#34d399" },
  navigation: { label: "Navigation", color: "#a78bfa" },
  sos:        { label: "SOS",        color: "#ef4444" },
  stop:       { label: "Stop",       color: "#f87171" },
  help:       { label: "Help",       color: "#34d399" },
  unknown:    { label: "Unknown",    color: "#6b7280" },
};

export default function CommandHistoryPage() {
  const { speak } = useAccessibility();
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const fetchCommands = async () => {
    setLoading(true);
    try {
      const res = await API.get("/commands?limit=100");
      setCommands(res.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchCommands(); }, []);

  const deleteCommand = async (id) => {
    setConfirmId(null);
    try { await API.delete(`/commands/${id}`); await fetchCommands(); speak("Command deleted."); }
    catch (_) {}
  };

  const clearAll = async () => {
    setConfirmClear(false);
    try {
      await Promise.all(commands.map((c) => API.delete(`/commands/${c.id}`)));
      await fetchCommands();
      speak("All command history cleared.");
    } catch (_) {}
  };

  const types = ["all", ...Object.keys(typeLabels)];

  const filtered = commands.filter((c) => {
    const matchType = filter === "all" || c.commandType === filter;
    const matchSearch = !search ||
      c.commandText?.toLowerCase().includes(search.toLowerCase()) ||
      c.responseText?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const stats = Object.entries(typeLabels).map(([key, val]) => ({
    type: key, count: commands.filter((c) => c.commandType === key).length, ...val,
  })).filter((s) => s.count > 0);

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1>📋 Command History</h1>
            <p>Review all past voice commands and their responses</p>
          </div>
          {commands.length > 0 && (
            confirmClear ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#f87171", fontSize: "14px", fontWeight: 600 }}>Clear all history?</span>
                <button onClick={clearAll} style={s.confirmYes}>Yes, clear all</button>
                <button onClick={() => setConfirmClear(false)} style={s.confirmNo}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} style={s.clearBtn}>🗑️ Clear All History</button>
            )
          )}
        </div>

        {stats.length > 0 && (
          <div style={s.statsGrid}>
            <div style={s.totalCard}>
              <div style={s.totalNum}>{commands.length}</div>
              <div style={s.totalLabel}>Total Commands</div>
            </div>
            {stats.map((stat) => (
              <div key={stat.type} style={{ ...s.statCard, borderTop: `3px solid ${stat.color}` }}>
                <div style={{ ...s.statNum, color: stat.color }}>{stat.count}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={s.filterRow}>
          <div style={s.filterBtns}>
            {types.map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ ...s.filterBtn, ...(filter === t ? { background: (typeLabels[t]?.color || "#22c55e") + "20", color: typeLabels[t]?.color || "#22c55e", borderColor: typeLabels[t]?.color || "#22c55e" } : {}) }}>
                {t === "all" ? "All" : typeLabels[t]?.label || t}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search commands..." value={search}
            onChange={(e) => setSearch(e.target.value)} style={s.searchInput} />
        </div>

        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>{search || filter !== "all" ? "No matching commands" : "No command history yet"}</h3>
            <p>Use the Voice Assistant to start giving commands.</p>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((cmd, i) => {
              const typeInfo = typeLabels[cmd.commandType] || typeLabels.unknown;
              return (
                <div key={cmd.id || i} style={s.cmdCard}>
                  <div style={s.cmdTop}>
                    <div style={s.cmdLeft}>
                      <span style={s.cmdIcon}>🎤</span>
                      <div style={s.cmdText}>{cmd.commandText}</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                      <span style={{ ...s.typeBadge, background: typeInfo.color + "15", color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      <button onClick={() => speak(cmd.responseText)} style={s.replayBtn} title="Replay response">🔊</button>
                      {confirmId === cmd.id ? (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button onClick={() => deleteCommand(cmd.id)} style={s.confirmYes}>Yes</button>
                          <button onClick={() => setConfirmId(null)} style={s.confirmNo}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(cmd.id)} style={s.deleteBtn} title="Delete">🗑️</button>
                      )}
                    </div>
                  </div>
                  <div style={s.cmdReply}>
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>AI: </span>
                    <span style={{ color: "#9ca3af" }}>{cmd.responseText}</span>
                  </div>
                  {cmd.createdAt && (
                    <div style={s.cmdTime}>{new Date(cmd.createdAt).toLocaleString()}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const s = {
  clearBtn: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", padding: "10px 18px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
  confirmYes: { background: "#ef4444", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "Inter,Arial,sans-serif" },
  confirmNo: { background: "#374151", color: "#f9fafb", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "Inter,Arial,sans-serif" },
  statsGrid: { display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" },
  totalCard: { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "14px", padding: "18px 24px", textAlign: "center", minWidth: "110px" },
  totalNum: { fontSize: "36px", fontWeight: 900, color: "#22c55e", marginBottom: "4px" },
  totalLabel: { fontSize: "12px", color: "#9ca3af", fontWeight: 600 },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: "14px", padding: "18px 24px", textAlign: "center", minWidth: "100px" },
  statNum: { fontSize: "28px", fontWeight: 800, marginBottom: "4px" },
  statLabel: { fontSize: "12px", color: "#9ca3af", fontWeight: 600 },
  filterRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px", flexWrap: "wrap" },
  filterBtns: { display: "flex", gap: "8px", flexWrap: "wrap" },
  filterBtn: { background: "#111827", border: "1px solid #374151", color: "#9ca3af", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif", transition: "all 0.15s" },
  searchInput: { padding: "10px 16px", background: "#111827", border: "1px solid #374151", borderRadius: "10px", color: "#f9fafb", fontSize: "14px", width: "220px", fontFamily: "Inter,Arial,sans-serif", outline: "none" },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  cmdCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: "14px", padding: "18px 20px" },
  cmdTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "16px" },
  cmdLeft: { display: "flex", gap: "12px", alignItems: "center" },
  cmdIcon: { fontSize: "20px", flexShrink: 0 },
  cmdText: { fontSize: "16px", fontWeight: 600, color: "#f9fafb" },
  typeBadge: { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" },
  replayBtn: { background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", padding: "4px" },
  deleteBtn: { background: "transparent", border: "none", fontSize: "16px", cursor: "pointer", padding: "4px", color: "#6b7280" },
  cmdReply: { fontSize: "14px", lineHeight: 1.6, paddingLeft: "32px", marginBottom: "8px" },
  cmdTime: { fontSize: "12px", color: "#4b5563", paddingLeft: "32px" },
};
