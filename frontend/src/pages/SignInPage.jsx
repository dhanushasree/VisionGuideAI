import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignInPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(form.email.trim(), form.password);
    setLoading(false);
    if (result.success) navigate("/dashboard");
    else setError(result.error);
  };


  return (
    <div style={s.page}>
      <div className="auth-left" style={s.left}>
        <div style={s.leftContent}>
          <Link to="/" style={s.backLink}>← Back to Home</Link>
          <div style={s.logoRow}>
            <span style={{ fontSize: "32px" }}>👁️</span>
            <span style={s.logoText}>VisionGuide AI</span>
          </div>
          <h1 style={s.heroTitle}>Welcome<br />back 👋</h1>
          <p style={s.heroSub}>
            Sign in to access your voice assistant, emergency contacts, navigation tools, and more.
          </p>
          <div style={s.featureList}>
            {["🎤 Voice-powered assistant", "🚨 Emergency SOS system", "🗺️ Navigation helper", "📖 Article reader"].map(f => (
              <div key={f} style={s.featureItem}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right" style={s.right}>
        <div style={s.formBox}>
          <h2 style={s.formTitle}>Sign In</h2>
          <p style={s.formSubtitle}>Enter your credentials to continue</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={s.pwdWrap}>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={s.submitBtn}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p style={s.bottomText}>
            Don't have an account?{" "}
            <Link to="/signup" style={s.link}>Sign Up Free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { display: "flex", minHeight: "100vh", background: "#0a0f1e", fontFamily: "Inter,Arial,sans-serif" },
  left:       { flex: 1, background: "linear-gradient(135deg, #111827 0%, #0a0f1e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", borderRight: "1px solid #1f2937" },
  leftContent:{ maxWidth: "400px" },
  backLink:   { color: "#6b7280", textDecoration: "none", fontSize: "14px", display: "block", marginBottom: "40px" },
  logoRow:    { display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" },
  logoText:   { fontWeight: 800, fontSize: "22px", color: "#22c55e" },
  heroTitle:  { fontSize: "48px", fontWeight: 900, color: "#f9fafb", lineHeight: 1.15, marginBottom: "16px" },
  heroSub:    { fontSize: "16px", color: "#9ca3af", lineHeight: 1.7, marginBottom: "32px" },
  featureList:{ display: "grid", gap: "12px" },
  featureItem:{ color: "#d1d5db", fontSize: "15px", padding: "10px 16px", background: "rgba(34,197,94,0.06)", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.1)" },
  right:      { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" },
  formBox:    { width: "100%", maxWidth: "440px", minWidth: 0 },
  formTitle:  { fontSize: "32px", fontWeight: 800, color: "#f9fafb", marginBottom: "8px" },
  formSubtitle:{ fontSize: "15px", color: "#9ca3af", marginBottom: "28px" },
  form:       { marginBottom: "20px" },
  pwdWrap:    { position: "relative" },
  eyeBtn:     { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1, color: "#9ca3af" },
  submitBtn:  { width: "100%", background: "#22c55e", color: "#000", padding: "16px", border: "none", borderRadius: "12px", fontSize: "17px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", marginTop: "8px", transition: "all 0.2s" },
  dividerRow: { display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" },
  dividerLine:{ flex: 1, border: "none", borderTop: "1px solid #1f2937" },
  dividerText:{ color: "#6b7280", fontSize: "13px", whiteSpace: "nowrap" },
  demoBtn:    { width: "100%", background: "transparent", border: "1px solid #374151", color: "#f9fafb", padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", marginBottom: "20px" },
  bottomText: { textAlign: "center", color: "#9ca3af", fontSize: "15px" },
  link:       { color: "#22c55e", textDecoration: "none", fontWeight: 600 },
};
