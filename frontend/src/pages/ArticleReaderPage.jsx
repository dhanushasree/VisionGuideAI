import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

export default function ArticleReaderPage() {
  const { speak, settings } = useAccessibility();
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [reading, setReading] = useState(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const speakWithTracking = (text, id) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = settings.language;
    u.rate = settings.voiceSpeed;
    u.volume = 1;
    setReading(id);
    u.onend = () => setReading(null);
    u.onerror = () => setReading(null);
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setReading(null); };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchArticles = async () => {
    setLoading(true);
    try { const res = await API.get("/articles"); setArticles(res.data); }
    catch (_) { showMessage("Failed to load articles.", "error"); }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const addArticle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/articles", form);
      setForm({ title: "", content: "" });
      await fetchArticles();
      showMessage("Article added and saved successfully.");
      speak("Article saved.");
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to add article.", "error");
    }
    setSaving(false);
  };

  const deleteArticle = async (id) => {
    setConfirmId(null);
    stopSpeaking();
    try { await API.delete(`/articles/${id}`); await fetchArticles(); showMessage("Article deleted."); }
    catch (_) { showMessage("Failed to delete.", "error"); }
  };

  const readArticle = (a) => speakWithTracking(`${a.title}. ${a.content}`, a.id);
  const readAll = () => {
    if (!articles.length) { speak("No articles saved."); return; }
    speakWithTracking(articles.map((a, i) => `Article ${i + 1}. ${a.title}. ${a.content}`).join(" "), "all");
  };

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>📖 Article Reader</h1>
          <p>Save articles and have them read aloud. Perfect for hands-free content consumption.</p>
        </div>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

        <div style={s.grid}>
          <div style={s.formPanel}>
            <div className="card">
              <h3 style={s.panelTitle}>Add New Article</h3>
              <form onSubmit={addArticle}>
                <div className="form-group">
                  <label>Article Title *</label>
                  <input type="text" placeholder="Enter article title" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Article Content *</label>
                  <textarea placeholder="Paste or type the article content here..." value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })} required style={{ minHeight: "160px" }} />
                </div>
                <div style={s.charCount}>{form.content.length} / 20,000 characters</div>
                <button type="submit" disabled={saving} style={s.addBtn}>
                  {saving ? "Saving..." : "💾 Save Article"}
                </button>
              </form>
            </div>

            <div className="card" style={{ marginTop: "20px" }}>
              <h3 style={s.panelTitle}>Read All</h3>
              <button onClick={readAll} style={s.readAllBtn} disabled={reading === "all"}>
                🔊 {reading === "all" ? "Reading..." : "Read All Articles Aloud"}
              </button>
              {reading && <button onClick={stopSpeaking} style={s.stopBtn}>⏹ Stop Reading</button>}
              <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "12px" }}>
                Say "read articles" in the Voice Assistant to read all.
              </p>
            </div>
          </div>

          <div>
            <div style={s.listHeader}>
              <h3 style={s.panelTitle}>Saved Articles <span style={s.countBadge}>{articles.length}</span></h3>
              <input type="text" placeholder="Search articles..." value={search}
                onChange={(e) => setSearch(e.target.value)} style={s.searchInput} />
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📖</div>
                <h3>{search ? "No matching articles" : "No articles yet"}</h3>
                <p>{search ? "Try a different search" : "Add your first article using the form on the left."}</p>
              </div>
            ) : (
              filtered.map((article) => (
                <div key={article.id} style={s.articleCard}>
                  <div style={s.articleHeader}>
                    <div>
                      <h3 style={s.articleTitle}>{article.title}</h3>
                      <span style={s.wordCount}>{article.content.split(" ").length} words</span>
                    </div>
                    <div style={s.articleActions}>
                      <button onClick={() => readArticle(article)}
                        style={{ ...s.actionBtn, borderColor: reading === article.id ? "#22c55e" : undefined, color: reading === article.id ? "#22c55e" : undefined }}
                        disabled={reading === article.id}>
                        🔊 {reading === article.id ? "Reading..." : "Read"}
                      </button>
                      {reading === article.id && (
                        <button onClick={stopSpeaking} style={s.stopBtnSmall}>⏹</button>
                      )}
                      <button onClick={() => setExpanded(expanded === article.id ? null : article.id)} style={s.expandBtn}>
                        {expanded === article.id ? "▲ Less" : "▼ More"}
                      </button>
                      {confirmId === article.id ? (
                        <div style={s.confirmRow} role="group" aria-label="Confirm delete">
                          <span style={{ color: "#f87171", fontSize: "13px", fontWeight: 600 }}>Delete?</span>
                          <button onClick={() => deleteArticle(article.id)} style={s.confirmYes}>Yes</button>
                          <button onClick={() => setConfirmId(null)} style={s.confirmNo}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(article.id)} style={s.deleteBtn}>🗑️</button>
                      )}
                    </div>
                  </div>
                  <p style={s.articlePreview}>
                    {expanded === article.id ? article.content
                      : article.content.length > 200 ? article.content.slice(0, 200) + "..." : article.content}
                  </p>
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
  formPanel: {},
  panelTitle: { fontSize: "16px", fontWeight: 700, color: "#f9fafb", marginBottom: "20px" },
  charCount: { fontSize: "12px", color: "#6b7280", textAlign: "right", marginTop: "-8px", marginBottom: "8px" },
  addBtn: { width: "100%", background: "#22c55e", color: "#000", border: "none", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "16px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  readAllBtn: { width: "100%", background: "rgba(96,165,250,0.1)", border: "2px solid #60a5fa", color: "#60a5fa", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", marginBottom: "10px" },
  stopBtn: { width: "100%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "12px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px" },
  countBadge: { background: "rgba(96,165,250,0.15)", color: "#60a5fa", padding: "2px 10px", borderRadius: "12px", fontSize: "14px" },
  searchInput: { padding: "10px 16px", background: "#111827", border: "1px solid #374151", borderRadius: "10px", color: "#f9fafb", fontSize: "14px", width: "200px", fontFamily: "Inter,Arial,sans-serif", outline: "none" },
  articleCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: "14px", padding: "20px", marginBottom: "16px", borderLeft: "4px solid #60a5fa" },
  articleHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" },
  articleTitle: { fontSize: "18px", fontWeight: 700, color: "#f9fafb", marginBottom: "4px" },
  wordCount: { fontSize: "12px", color: "#6b7280", background: "#1a2235", padding: "2px 10px", borderRadius: "10px" },
  articleActions: { display: "flex", gap: "8px", flexShrink: 0, alignItems: "center", flexWrap: "wrap" },
  actionBtn: { background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", color: "#facc15", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "Inter,Arial,sans-serif", whiteSpace: "nowrap" },
  stopBtnSmall: { background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "Inter,Arial,sans-serif" },
  expandBtn: { background: "#1a2235", border: "1px solid #374151", color: "#9ca3af", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter,Arial,sans-serif" },
  deleteBtn: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "Inter,Arial,sans-serif" },
  confirmRow: { display: "flex", alignItems: "center", gap: "6px" },
  confirmYes: { background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: "Inter,Arial,sans-serif" },
  confirmNo: { background: "#374151", color: "#f9fafb", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: "Inter,Arial,sans-serif" },
  articlePreview: { fontSize: "15px", color: "#9ca3af", lineHeight: 1.7, whiteSpace: "pre-wrap" },
};
