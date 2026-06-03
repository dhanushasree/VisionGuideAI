import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignUpPage() {
  const { signUp }  = useAuth();
  const navigate    = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showCfm, setShowCfm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setLoading(true);
    const result = await signUp(form.name.trim(), form.email.trim(), form.password);
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
          <h1 style={s.heroTitle}>Join us<br />today ✨</h1>
          <p style={s.heroSub}>
            Create your free account and start using the voice-powered assistant designed for visual independence.
          </p>
          <div style={s.testimonial}>
            <div style={s.stars}>★★★★★</div>
            <p style={s.testimonialText}>
              "VisionGuide AI has completely changed how I navigate my city. The voice commands are so natural!"
            </p>
            <div style={s.testimonialAuthor}>— A happy user</div>
          </div>
        </div>
      </div>

      <div className="auth-right" style={s.right}>
        <div style={s.formBox}>
          <h2 style={s.formTitle}>Create Account</h2>
          <p style={s.formSubtitle}>Free forever. No credit card required.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Your name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={s.pwdWrap}>
                <input type={showPwd ? "text" : "password"} placeholder="At least 8 characters" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password"
                  style={{ paddingRight: "48px" }} />
                <button type="button" style={s.eyeBtn} onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div style={s.pwdWrap}>
                <input type={showCfm ? "text" : "password"} placeholder="Repeat your password" value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })} required autoComplete="new-password"
                  style={{ paddingRight: "48px" }} />
                <button type="button" style={s.eyeBtn} onClick={() => setShowCfm(v => !v)}
                  aria-label={showCfm ? "Hide confirm password" : "Show confirm password"}>
                  {showCfm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={s.submitBtn}>
              {loading ? "Creating account…" : "Create Free Account →"}
            </button>

            <p style={s.termsText}>
              By signing up, you agree to our{" "}
              <span style={{ color: "#22c55e" }}>Terms of Service</span> and{" "}
              <span style={{ color: "#22c55e" }}>Privacy Policy</span>.
            </p>
          </form>

          <p style={s.bottomText}>
            Already have an account?{" "}
            <Link to="/signin" style={s.link}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:           { display: "flex", minHeight: "100vh", background: "#0a0f1e", fontFamily: "Inter,Arial,sans-serif" },
  left:           { flex: 1, background: "linear-gradient(135deg, #111827 0%, #0a0f1e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", borderRight: "1px solid #1f2937" },
  leftContent:    { maxWidth: "400px" },
  backLink:       { color: "#6b7280", textDecoration: "none", fontSize: "14px", display: "block", marginBottom: "40px" },
  logoRow:        { display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" },
  logoText:       { fontWeight: 800, fontSize: "22px", color: "#22c55e" },
  heroTitle:      { fontSize: "48px", fontWeight: 900, color: "#f9fafb", lineHeight: 1.15, marginBottom: "16px" },
  heroSub:        { fontSize: "16px", color: "#9ca3af", lineHeight: 1.7, marginBottom: "32px" },
  testimonial:    { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "14px", padding: "20px" },
  stars:          { color: "#facc15", fontSize: "18px", marginBottom: "10px" },
  testimonialText:{ color: "#d1d5db", fontSize: "15px", lineHeight: 1.7, fontStyle: "italic", marginBottom: "10px" },
  testimonialAuthor: { color: "#6b7280", fontSize: "13px" },
  right:          { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" },
  formBox:        { width: "100%", maxWidth: "440px", minWidth: 0 },
  formTitle:      { fontSize: "32px", fontWeight: 800, color: "#f9fafb", marginBottom: "8px" },
  formSubtitle:   { fontSize: "15px", color: "#9ca3af", marginBottom: "28px" },
  pwdWrap:        { position: "relative" },
  eyeBtn:         { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1, color: "#9ca3af" },
  submitBtn:      { width: "100%", background: "#22c55e", color: "#000", padding: "16px", border: "none", borderRadius: "12px", fontSize: "17px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", marginTop: "8px", transition: "all 0.2s" },
  termsText:      { fontSize: "12px", color: "#6b7280", textAlign: "center", marginTop: "12px" },
  bottomText:     { textAlign: "center", color: "#9ca3af", fontSize: "15px", marginTop: "20px" },
  link:           { color: "#22c55e", textDecoration: "none", fontWeight: 600 },
};
