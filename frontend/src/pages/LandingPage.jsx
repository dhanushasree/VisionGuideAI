import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/* ─── Scroll-reveal hook ─── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Animated counter ─── */
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    const isNum = !isNaN(parseInt(target));
    if (!isNum) { setCount(target); return; }
    const end = parseInt(target);
    let start = 0;
    const step = Math.ceil(end / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(t); }
      else setCount(start);
    }, 30);
    return () => clearInterval(t);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Reveal wrapper ─── */
function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Typing animation ─── */
function TypingText({ phrases }) {
  const [idx, setIdx] = useState(0);
  const [txt, setTxt] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[idx];
    let timer;
    if (!deleting && txt.length < current.length) {
      timer = setTimeout(() => setTxt(current.slice(0, txt.length + 1)), 60);
    } else if (!deleting && txt.length === current.length) {
      timer = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && txt.length > 0) {
      timer = setTimeout(() => setTxt(txt.slice(0, -1)), 35);
    } else if (deleting && txt.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timer);
  }, [txt, deleting, idx, phrases]);

  return (
    <span style={{ color: "#22c55e" }}>
      {txt}
      <span style={{ animation: "blink 1s step-end infinite", color: "#22c55e" }}>|</span>
    </span>
  );
}

const features = [
  { icon: "🎤", title: "Voice Assistant", desc: "Natural language commands. No screen needed — just speak.", color: "#facc15", size: "large" },
  { icon: "🚨", title: "SOS Alert", desc: "One tap sends an emergency alert with your location.", color: "#ef4444", size: "small" },
  { icon: "📞", title: "Emergency Contacts", desc: "Hear your saved contacts read aloud instantly.", color: "#22c55e", size: "small" },
  { icon: "🗺️", title: "Navigation", desc: "Say 'hospital near me' — Google Maps opens automatically.", color: "#a78bfa", size: "large" },
  { icon: "📖", title: "Article Reader", desc: "Save any article. Hear it read back, word for word.", color: "#60a5fa", size: "small" },
  { icon: "📍", title: "Saved Locations", desc: "Bookmark Home, School, Hospital for instant map access.", color: "#34d399", size: "small" },
];

const voiceCommands = [
  { you: '"Hello"', ai: "Hello! I'm VisionGuide AI. How can I help you today?" },
  { you: '"Hospital near me"', ai: "Opening Google Maps for hospitals near you…" },
  { you: '"Send SOS"', ai: "🚨 SOS alert sent. Emergency contacts notified." },
  { you: '"Read my contacts"', ai: "Reading 3 emergency contacts. Contact 1: Mother…" },
  { you: '"Navigate to pharmacy"', ai: "Opening navigation for pharmacy near me…" },
  { you: '"Stop reading"', ai: "Voice reading stopped." },
];

const testimonials = [
  { name: "Priya R.", role: "Daily user", stars: 5, text: "VisionGuide AI gave me back my independence. I navigate my city alone now using just voice commands." },
  { name: "Rajan M.", role: "Accessibility advocate", stars: 5, text: "The SOS feature is a life saver — literally. One tap and my family gets an alert. Nothing simpler." },
  { name: "Sneha K.", role: "Student", stars: 5, text: "I use the article reader every day for my studies. It reads textbooks to me while I relax." },
];

const stats = [
  { value: "7", suffix: "+", label: "Core Features" },
  { value: "100", suffix: "%", label: "Voice Powered" },
  { value: "24", suffix: "/7", label: "SOS Ready" },
  { value: "0", suffix: "₹", label: "Cost — Always Free" },
];

const marqueeItems = ["🎤 Voice Commands", "🚨 SOS Alerts", "🗺️ Navigation", "📖 Article Reader", "📞 Emergency Contacts", "📍 Saved Locations", "⚡ Real-time Response", "♿ Fully Accessible"];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeCmd, setActiveCmd] = useState(0);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveCmd((i) => (i + 1) % voiceCommands.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={s.page}>

      {/* ── GLOBAL CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #05080f; color: #f9fafb; }
        @keyframes float    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
        @keyframes float2   { 0%,100%{transform:translateY(-8px)} 50%{transform:translateY(8px)} }
        @keyframes barPulse { 0%,100%{height:6px}  50%{height:36px} }
        @keyframes glow     { 0%,100%{opacity:.4}  50%{opacity:.9} }
        @keyframes blink    { 0%,100%{opacity:1}   50%{opacity:0} }
        @keyframes marquee  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes orbit    { from{transform:rotate(0deg) translateX(90px) rotate(0deg)} to{transform:rotate(360deg) translateX(90px) rotate(-360deg)} }
        @keyframes ping     { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.5);opacity:0} }
        @keyframes gradShift{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .nav-link-hover:hover { color: #f9fafb !important; }
        .feat-card:hover { transform: translateY(-6px) !important; border-color: rgba(34,197,94,0.4) !important; box-shadow: 0 20px 60px rgba(34,197,94,0.08) !important; }
        .feat-card-red:hover { border-color: rgba(239,68,68,0.4) !important; }
        .feat-card-purple:hover { border-color: rgba(167,139,250,0.4) !important; }
        .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(34,197,94,0.35) !important; }
        .ghost-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .testi-card:hover { border-color: rgba(34,197,94,0.3) !important; transform: translateY(-4px); }
        .footer-link:hover { color: #22c55e !important; }
        @media(max-width:900px){
          .hero-inner{flex-direction:column !important;}
          .hero-visual{display:none !important;}
          .features-bento{grid-template-columns:1fr !important;}
          .about-grid{grid-template-columns:1fr !important;}
          .stats-row{grid-template-columns:repeat(2,1fr) !important;}
          .steps-row{grid-template-columns:1fr !important;}
          .cmd-grid{grid-template-columns:1fr !important;}
          .testi-grid{grid-template-columns:1fr !important;}
          .nav-links-desktop{display:none !important;}
          .hamburger-btn{display:flex !important;}
          .footer-grid{grid-template-columns:1fr !important; text-align:center !important;}
          .hero-section{padding-top:90px !important; padding-bottom:50px !important;}
          .step-connector{display:none !important;}
        }
        @media(max-width:600px){
          .hero-section{padding:80px 18px 40px !important;}
          .hero-h1{font-size:clamp(32px,9vw,52px) !important; letter-spacing:-1px !important;}
          .hero-sub{font-size:15px !important; margin-bottom:28px !important;}
          .hero-btns{flex-direction:column !important; gap:10px !important;}
          .hero-btns a,.hero-btns .primary-btn,.hero-btns .ghost-btn{width:100% !important; justify-content:center !important; text-align:center !important;}
          .section-title{font-size:clamp(24px,7vw,36px) !important;}
          .cta-btns{flex-direction:column !important; align-items:center !important;}
          .cta-btns a{width:100% !important; justify-content:center !important; max-width:320px !important;}
          .stat-card-inner{padding:20px 12px !important;}
          .footer-bottom{flex-direction:column !important; align-items:center !important; text-align:center !important;}
          .section-padding{padding:60px 18px !important;}
          .stats-section-pad{padding:50px 18px !important;}
        }
      `}</style>

      {/* ── BACKGROUND ORBS ── */}
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.orb3} />
      <div style={s.gridOverlay} />

      {/* ── NAVBAR ── */}
      <nav style={{ ...s.nav, ...(scrolled ? s.navScrolled : {}) }}>
        <div style={s.navInner}>
          <Link to="/" style={s.navLogo}>
            <div style={s.logoIcon}>
              <span style={{ fontSize: "20px" }}>👁️</span>
            </div>
            <span style={s.logoText}>VisionGuide <span style={{ color: "#22c55e" }}>AI</span></span>
          </Link>

          <div className="nav-links-desktop" style={s.navLinks}>
            {["#features", "#how-it-works", "#voice-demo", "#about"].map((href, i) => (
              <a key={href} href={href} className="nav-link-hover" style={s.navLink}>
                {["Features", "How It Works", "Demo", "About"][i]}
              </a>
            ))}
          </div>

          <div className="nav-links-desktop" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link to="/signin" className="ghost-btn" style={s.navSignIn}>Sign In</Link>
            <Link to="/signup" className="primary-btn" style={s.navCta}>Get Started Free</Link>
          </div>

          <button className="hamburger-btn" style={s.hamburger} onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenu && (
          <div style={s.mobileMenu}>
            {[["#features","Features"],["#how-it-works","How It Works"],["#voice-demo","Demo"],["#about","About"]].map(([h,l]) => (
              <a key={h} href={h} style={s.mobileLink} onClick={() => setMobileMenu(false)}>{l}</a>
            ))}
            <Link to="/signin" style={s.mobileLink} onClick={() => setMobileMenu(false)}>Sign In</Link>
            <Link to="/signup" style={{ ...s.mobileLink, color: "#22c55e", fontWeight: 700 }} onClick={() => setMobileMenu(false)}>Get Started Free →</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={s.heroSection}>
        <div className="hero-inner" style={s.heroInner}>

          {/* Left */}
          <div style={s.heroLeft}>
            <div style={s.heroBadge}>
              <span style={s.heroBadgeDot} />
              Empowering Visual Independence
            </div>

            <h1 className="hero-h1" style={s.heroH1}>
              Your AI Guide<br />
              to{" "}
              <TypingText phrases={["Navigate Freely", "Stay Safe", "Read Anything", "Get Help Fast"]} />
            </h1>

            <p className="hero-sub" style={s.heroSub}>
              A voice-first assistant built for visually impaired users.
              Navigate cities, send SOS alerts, and access information —
              <strong style={{ color: "#f9fafb" }}> all with just your voice.</strong>
            </p>

            <div className="hero-btns" style={s.heroBtns}>
              <Link to="/signup" className="primary-btn" style={s.primaryBtn}>
                Get Started Free
                <span style={{ fontSize: "18px" }}>→</span>
              </Link>
              <Link to="/signin" className="ghost-btn" style={s.ghostBtn}>
                Sign In
              </Link>
            </div>

            <div style={s.heroProof}>
              <div style={s.heroStars}>{"★★★★★"}</div>
              <span style={{ color: "#6b7280", fontSize: "14px" }}>
                Trusted by visually impaired users everywhere · Free forever
              </span>
            </div>
          </div>

          {/* Right: floating app card */}
          <div className="hero-visual" style={s.heroRight}>
            {/* Glow rings */}
            <div style={s.glowRing1} />
            <div style={s.glowRing2} />

            {/* Main card */}
            <div style={s.appCard}>
              <div style={s.appCardTop}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={s.appDot} />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#f9fafb" }}>VisionGuide AI</span>
                </div>
                <div style={s.appLiveBadge}>● LIVE</div>
              </div>

              {/* Mic */}
              <div style={s.micWrapper}>
                <div style={s.micRing1} />
                <div style={s.micRing2} />
                <div style={s.micCore}>
                  <span style={{ fontSize: "36px" }}>🎤</span>
                </div>
              </div>
              <p style={{ color: "#6b7280", fontSize: "13px", textAlign: "center", marginTop: "8px", marginBottom: "16px" }}>Listening…</p>

              {/* Wave bars */}
              <div style={s.waveRow}>
                {[0.1,0.2,0.35,0.15,0.4,0.25,0.1,0.3,0.2,0.35].map((d, i) => (
                  <div key={i} style={{ ...s.waveBar, animationDelay: `${d}s`, height: `${12 + (i % 5) * 8}px` }} />
                ))}
              </div>

              {/* Cycling reply */}
              <div style={s.appReply}>
                <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "6px" }}>
                  You said: <span style={{ color: "#facc15" }}>{voiceCommands[activeCmd].you}</span>
                </div>
                <div style={{ color: "#d1d5db", fontSize: "14px", lineHeight: 1.5 }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>AI › </span>
                  {voiceCommands[activeCmd].ai}
                </div>
              </div>

              <div style={s.appFooter}>
                <div style={s.appOnline} />
                <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: 600 }}>All systems online</span>
              </div>
            </div>

            {/* Floating chips */}
            <div style={{ ...s.chip, top: "-20px", right: "20px", animation: "float 3s ease infinite" }}>
              🚨 SOS Sent
            </div>
            <div style={{ ...s.chip, bottom: "40px", left: "-30px", animation: "float2 3.5s ease infinite", background: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.3)" }}>
              🗺️ Maps Opened
            </div>
            <div style={{ ...s.chip, top: "120px", left: "-50px", animation: "float 4s ease infinite", background: "rgba(96,165,250,0.12)", borderColor: "rgba(96,165,250,0.25)" }}>
              📖 Reading…
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={s.marqueeWrap}>
        <div style={s.marqueeTrack}>
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} style={s.marqueeItem}>{item}</span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section className="stats-section-pad" style={s.statsSection}>
        <div className="stats-row" style={s.statsGrid}>
          {stats.map((st) => (
            <Reveal key={st.label} style={s.statCard}>
              <div style={s.statVal}>
                <Counter target={st.value} suffix={st.suffix} />
              </div>
              <div style={s.statLabel}>{st.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" style={s.section}>
        <Reveal style={s.sectionHead}>
          <span style={s.pill}>Features</span>
          <h2 style={s.sectionTitle}>
            Everything you need,<br />
            <span style={s.gradText}>voice-activated</span>
          </h2>
          <p style={s.sectionSub}>Every feature works without touching the screen — built for independence.</p>
        </Reveal>

        <div className="features-bento" style={s.bentoGrid}>
          {/* Large card 1 - Voice */}
          <Reveal delay={0} style={{ gridColumn: "span 2", gridRow: "span 1" }}>
            <div className="feat-card" style={{ ...s.bentoCard, ...s.bentoBig, borderColor: "rgba(250,204,21,0.15)" }}>
              <div style={{ ...s.bentoIconBig, background: "rgba(250,204,21,0.1)", color: "#facc15" }}>🎤</div>
              <h3 style={s.bentoTitle}>Voice Assistant</h3>
              <p style={s.bentoDesc}>Speak natural commands. The AI understands context — say "hospital" and it navigates. Say "SOS" and it alerts. Zero screen interaction needed.</p>
              <div style={s.bentoTag}>Core Feature</div>
            </div>
          </Reveal>

          {/* Small card - SOS */}
          <Reveal delay={0.1}>
            <div className="feat-card feat-card-red" style={{ ...s.bentoCard, borderColor: "rgba(239,68,68,0.15)" }}>
              <div style={{ ...s.bentoIcon, background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>🚨</div>
              <h3 style={s.bentoTitleSm}>SOS Alert</h3>
              <p style={s.bentoDescSm}>One tap or one word. Instant emergency broadcast to all your contacts.</p>
            </div>
          </Reveal>

          {/* Small card - Contacts */}
          <Reveal delay={0.15}>
            <div className="feat-card" style={{ ...s.bentoCard, borderColor: "rgba(34,197,94,0.15)" }}>
              <div style={{ ...s.bentoIcon, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>📞</div>
              <h3 style={s.bentoTitleSm}>Emergency Contacts</h3>
              <p style={s.bentoDescSm}>Say "read my contacts" to hear them aloud. One-tap calling.</p>
            </div>
          </Reveal>

          {/* Small card - Articles */}
          <Reveal delay={0.2}>
            <div className="feat-card" style={{ ...s.bentoCard, borderColor: "rgba(96,165,250,0.15)" }}>
              <div style={{ ...s.bentoIcon, background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>📖</div>
              <h3 style={s.bentoTitleSm}>Article Reader</h3>
              <p style={s.bentoDescSm}>Paste any content. Hear it read back in a clear, natural voice.</p>
            </div>
          </Reveal>

          {/* Large card 2 - Navigation */}
          <Reveal delay={0.1} style={{ gridColumn: "span 2" }}>
            <div className="feat-card feat-card-purple" style={{ ...s.bentoCard, ...s.bentoBig, borderColor: "rgba(167,139,250,0.15)" }}>
              <div style={{ ...s.bentoIconBig, background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>🗺️</div>
              <h3 style={s.bentoTitle}>Smart Navigation</h3>
              <p style={s.bentoDesc}>Hospital, ATM, pharmacy, bus stop — say any destination and Google Maps opens instantly. Navigation history saved automatically.</p>
              <div style={{ ...s.bentoTag, background: "rgba(167,139,250,0.1)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.2)" }}>12 Quick Places</div>
            </div>
          </Reveal>

          {/* Small card - Locations */}
          <Reveal delay={0.25}>
            <div className="feat-card" style={{ ...s.bentoCard, borderColor: "rgba(52,211,153,0.15)" }}>
              <div style={{ ...s.bentoIcon, background: "rgba(52,211,153,0.1)", color: "#34d399" }}>📍</div>
              <h3 style={s.bentoTitleSm}>Saved Locations</h3>
              <p style={s.bentoDescSm}>Bookmark Home, School, Hospital. Open in Maps in one tap.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ ...s.section, background: "rgba(17,24,39,0.5)" }}>
        <Reveal style={s.sectionHead}>
          <span style={s.pill}>How It Works</span>
          <h2 style={s.sectionTitle}>Up and running <span style={s.gradText}>in 60 seconds</span></h2>
          <p style={s.sectionSub}>No tutorials. No setup wizards. Just sign up and speak.</p>
        </Reveal>

        <div className="steps-row" style={s.stepsRow}>
          {[
            { n: "1", icon: "✍️", title: "Create Account", desc: "Sign up free with your name and email. No credit card, no verification delays." },
            { n: "2", icon: "📋", title: "Add Your Contacts", desc: "Save emergency contacts and important locations. Takes 2 minutes." },
            { n: "3", icon: "🎤", title: "Start Speaking", desc: 'Say "hello" and VisionGuide AI responds. You\'re ready to navigate the world.' },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 0.15} style={{ position: "relative" }}>
              <div style={s.stepCard}>
                <div style={s.stepNumBadge}>{step.n}</div>
                <div style={s.stepIconBox}>{step.icon}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
              </div>
              {i < 2 && <div style={s.stepConnector}>→</div>}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── VOICE COMMANDS DEMO ── */}
      <section id="voice-demo" style={s.section}>
        <Reveal style={s.sectionHead}>
          <span style={s.pill}>Live Demo</span>
          <h2 style={s.sectionTitle}>Speak naturally,<br /><span style={s.gradText}>we understand</span></h2>
          <p style={s.sectionSub}>See exactly what VisionGuide AI can do. Every command below is real.</p>
        </Reveal>

        <div style={s.terminalWrap}>
          <Reveal>
            <div style={s.terminal}>
              {/* Terminal header */}
              <div style={s.termTop}>
                <div style={s.termDots}>
                  <div style={{ ...s.termDot, background: "#ef4444" }} />
                  <div style={{ ...s.termDot, background: "#facc15" }} />
                  <div style={{ ...s.termDot, background: "#22c55e" }} />
                </div>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>visionguide-ai — voice terminal</span>
              </div>

              {/* Commands */}
              <div className="cmd-grid" style={s.cmdGrid}>
                {voiceCommands.map((cmd, i) => (
                  <div
                    key={i}
                    style={{
                      ...s.cmdCard,
                      ...(i === activeCmd ? s.cmdCardActive : {}),
                      animationDelay: `${i * 0.08}s`,
                    }}
                    onClick={() => setActiveCmd(i)}
                  >
                    <div style={s.cmdYou}>
                      <span style={{ color: "#facc15", fontSize: "12px" }}>🎤 YOU</span>
                      <span style={{ color: "#f9fafb", fontSize: "14px", fontWeight: 600 }}>{cmd.you}</span>
                    </div>
                    <div style={s.cmdAi}>
                      <span style={{ color: "#22c55e", fontSize: "11px", fontWeight: 700 }}>AI</span>
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>{cmd.ai}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ ...s.section, background: "rgba(17,24,39,0.5)" }}>
        <Reveal style={s.sectionHead}>
          <span style={s.pill}>Testimonials</span>
          <h2 style={s.sectionTitle}>Loved by users <span style={s.gradText}>everywhere</span></h2>
        </Reveal>

        <div className="testi-grid" style={s.testiGrid}>
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="testi-card" style={s.testiCard}>
                <div style={s.testiStars}>{"★".repeat(t.stars)}</div>
                <p style={s.testiText}>"{t.text}"</p>
                <div style={s.testiAuthor}>
                  <div style={s.testiAvatar}>{t.name.charAt(0)}</div>
                  <div>
                    <div style={s.testiName}>{t.name}</div>
                    <div style={s.testiRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={s.section}>
        <div className="about-grid" style={s.aboutGrid}>
          <Reveal>
            <span style={s.pill}>About</span>
            <h2 style={{ ...s.sectionTitle, textAlign: "left", marginTop: "20px" }}>
              Built for those who<br />
              <span style={s.gradText}>see the world differently</span>
            </h2>
            <p style={s.aboutText}>
              VisionGuide AI was created with one mission: give visually impaired individuals
              a powerful, voice-first digital companion. We believe technology should lift
              barriers — not create them.
            </p>
            <p style={s.aboutText}>
              Every feature, every interaction, every design decision was made with
              accessibility at the centre. No visual skill required to use any feature.
            </p>
            <Link to="/signup" className="primary-btn" style={{ ...s.primaryBtn, marginTop: "8px", display: "inline-flex" }}>
              Start Your Journey →
            </Link>
          </Reveal>

          <Reveal delay={0.15}>
            <div style={s.aboutList}>
              {[
                ["♿", "WCAG 2.1 Accessibility Standards"],
                ["🔒", "Data stays private and secure"],
                ["🌐", "Works in any modern browser"],
                ["📱", "Mobile and desktop friendly"],
                ["🎙️", "Chrome Web Speech API powered"],
                ["⚡", "Real-time response, zero lag"],
                ["🆓", "100% free, always"],
                ["🧠", "AI-powered command understanding"],
              ].map(([icon, text]) => (
                <div key={text} style={s.aboutItem}>
                  <span style={s.aboutItemIcon}>{icon}</span>
                  <span style={{ color: "#d1d5db", fontSize: "15px" }}>{text}</span>
                  <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: "14px" }}>✓</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaSection}>
        <div style={s.ctaGlow1} />
        <div style={s.ctaGlow2} />
        <Reveal style={{ position: "relative", zIndex: 1 }}>
          <div style={s.ctaInner}>
            <div style={s.ctaEyeIcon}>👁️</div>
            <h2 style={s.ctaTitle}>Ready to experience independence?</h2>
            <p style={s.ctaSub}>
              Join users navigating life with confidence.<br />Free. No card required. Start in 30 seconds.
            </p>
            <div className="cta-btns" style={s.ctaBtns}>
              <Link to="/signup" className="primary-btn" style={{ ...s.primaryBtn, padding: "18px 40px", fontSize: "17px" }}>
                Create Free Account →
              </Link>
              <Link to="/signin" className="ghost-btn" style={{ ...s.ghostBtn, padding: "18px 40px", fontSize: "17px" }}>
                Sign In
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div className="footer-grid" style={s.footerGrid}>
          <div>
            <div style={s.navLogo}>
              <div style={s.logoIcon}><span style={{ fontSize: "18px" }}>👁️</span></div>
              <span style={s.logoText}>VisionGuide <span style={{ color: "#22c55e" }}>AI</span></span>
            </div>
            <p style={s.footerTagline}>Voice-first AI assistant for visual independence.</p>
          </div>
          <div>
            <div style={s.footerHeading}>Product</div>
            {[["#features","Features"],["#how-it-works","How It Works"],["#voice-demo","Demo"],["#about","About"]].map(([h,l]) => (
              <a key={h} href={h} className="footer-link" style={s.footerLink}>{l}</a>
            ))}
          </div>
          <div>
            <div style={s.footerHeading}>Account</div>
            <Link to="/signin" className="footer-link" style={s.footerLink}>Sign In</Link>
            <Link to="/signup" className="footer-link" style={s.footerLink}>Create Account</Link>
            <Link to="/dashboard" className="footer-link" style={s.footerLink}>Dashboard</Link>
          </div>
          <div>
            <div style={s.footerHeading}>Accessibility</div>
            <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: 1.7 }}>
              This app is built for visually impaired users. Every feature works with voice commands and screen readers.
            </p>
          </div>
        </div>
        <div style={s.footerBottom}>
          <span>© {new Date().getFullYear()} VisionGuide AI</span>
          <span>Built with ❤️ for accessibility</span>
        </div>
      </footer>
    </div>
  );
}

/* ─── STYLES ─── */
const s = {
  page: { minHeight: "100vh", background: "#05080f", fontFamily: "'Inter',sans-serif", overflowX: "hidden", position: "relative" },

  /* Orbs */
  orb1: { position: "fixed", top: "-200px", right: "-100px", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "glow 6s ease infinite" },
  orb2: { position: "fixed", bottom: "10%", left: "-150px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 },
  orb3: { position: "fixed", top: "40%", left: "40%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 },
  gridOverlay: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0 },

  /* Nav */
  nav: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "14px 0", transition: "all 0.3s" },
  navScrolled: { background: "rgba(5,8,15,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 30px rgba(0,0,0,0.4)" },
  navInner: { maxWidth: "1240px", margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  navLogo: { display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" },
  logoIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: 800, fontSize: "19px", color: "#f9fafb", letterSpacing: "-0.3px" },
  navLinks: { display: "flex", gap: "32px" },
  navLink: { color: "#9ca3af", textDecoration: "none", fontSize: "15px", fontWeight: 500, transition: "color 0.2s" },
  navSignIn: { color: "#d1d5db", textDecoration: "none", fontSize: "15px", fontWeight: 600, padding: "9px 20px", borderRadius: "9px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", transition: "all 0.2s" },
  navCta: { color: "#000", textDecoration: "none", fontSize: "14px", fontWeight: 700, padding: "10px 22px", borderRadius: "9px", background: "#22c55e", transition: "all 0.2s", boxShadow: "0 0 20px rgba(34,197,94,0.2)" },
  hamburger: { display: "none", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#f9fafb", fontSize: "18px", cursor: "pointer", padding: "8px 12px", borderRadius: "8px", fontFamily: "inherit", alignItems: "center", justifyContent: "center" },
  mobileMenu: { background: "rgba(5,8,15,0.98)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "8px 0" },
  mobileLink: { display: "block", color: "#9ca3af", textDecoration: "none", padding: "14px 28px", fontSize: "16px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "color 0.2s" },

  /* Hero */
  heroSection: { minHeight: "100vh", display: "flex", alignItems: "center", padding: "120px 28px 80px", maxWidth: "1240px", margin: "0 auto", position: "relative", zIndex: 1 },
  heroInner: { display: "flex", alignItems: "center", gap: "80px", width: "100%" },
  heroLeft: { flex: 1, maxWidth: "600px" },
  heroBadge: { display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(34,197,94,0.08)", color: "#4ade80", padding: "7px 16px", borderRadius: "40px", fontSize: "13px", fontWeight: 600, marginBottom: "28px", border: "1px solid rgba(34,197,94,0.2)", letterSpacing: "0.02em" },
  heroBadgeDot: { width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", flexShrink: 0 },
  heroH1: { fontSize: "clamp(44px,5.5vw,76px)", fontWeight: 900, lineHeight: 1.08, color: "#f9fafb", marginBottom: "24px", letterSpacing: "-1.5px" },
  heroSub: { fontSize: "18px", color: "#9ca3af", lineHeight: 1.75, marginBottom: "40px", maxWidth: "520px" },
  heroBtns: { display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "28px" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: "8px", background: "#22c55e", color: "#000", padding: "15px 30px", borderRadius: "12px", textDecoration: "none", fontWeight: 700, fontSize: "16px", transition: "all 0.2s", boxShadow: "0 4px 20px rgba(34,197,94,0.25)", letterSpacing: "-0.2px" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", color: "#f9fafb", padding: "15px 30px", borderRadius: "12px", textDecoration: "none", fontWeight: 600, fontSize: "16px", border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.2s" },
  heroProof: { display: "flex", alignItems: "center", gap: "12px" },
  heroStars: { color: "#facc15", fontSize: "16px", letterSpacing: "2px" },

  /* App Card */
  heroRight: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative", minHeight: "480px" },
  glowRing1: { position: "absolute", width: "380px", height: "380px", borderRadius: "50%", border: "1px solid rgba(34,197,94,0.08)", animation: "glow 4s ease infinite" },
  glowRing2: { position: "absolute", width: "460px", height: "460px", borderRadius: "50%", border: "1px solid rgba(34,197,94,0.04)" },
  appCard: { background: "rgba(17,24,39,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "28px", width: "340px", boxShadow: "0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative", zIndex: 2, animation: "float 5s ease infinite" },
  appCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  appDot: { width: "9px", height: "9px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" },
  appLiveBadge: { fontSize: "11px", fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: "20px", border: "1px solid rgba(34,197,94,0.2)" },
  micWrapper: { position: "relative", width: "100px", height: "100px", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center" },
  micRing1: { position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(34,197,94,0.2)", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" },
  micRing2: { position: "absolute", inset: "10px", borderRadius: "50%", border: "2px solid rgba(34,197,94,0.15)", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite 0.5s" },
  micCore: { width: "72px", height: "72px", borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 },
  waveRow: { display: "flex", justifyContent: "center", gap: "4px", alignItems: "center", height: "44px", marginBottom: "16px" },
  waveBar: { width: "4px", background: "linear-gradient(to top, #16a34a, #4ade80)", borderRadius: "2px", animation: "barPulse 0.9s ease infinite" },
  appReply: { background: "rgba(5,8,15,0.8)", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.06)", minHeight: "70px", transition: "all 0.3s" },
  appFooter: { display: "flex", alignItems: "center", gap: "8px" },
  appOnline: { width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" },

  /* Chips */
  chip: { position: "absolute", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "40px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "#f9fafb", backdropFilter: "blur(12px)", whiteSpace: "nowrap", zIndex: 3 },

  /* Marquee */
  marqueeWrap: { overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "14px 0", background: "rgba(17,24,39,0.4)" },
  marqueeTrack: { display: "flex", gap: "0", animation: "marquee 25s linear infinite", width: "max-content" },
  marqueeItem: { padding: "0 40px", color: "#6b7280", fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.06)" },

  /* Stats */
  statsSection: { padding: "70px 28px", position: "relative", zIndex: 1 },
  statsGrid: { maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px" },
  statCard: { textAlign: "center", padding: "32px 20px", background: "rgba(17,24,39,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", backdropFilter: "blur(12px)" },
  statVal: { fontSize: "clamp(36px,4vw,52px)", fontWeight: 900, background: "linear-gradient(135deg,#22c55e,#4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px", lineHeight: 1 },
  statLabel: { fontSize: "14px", color: "#6b7280", fontWeight: 500 },

  /* Sections */
  section: { padding: "100px 28px", position: "relative", zIndex: 1 },
  sectionHead: { textAlign: "center", maxWidth: "680px", margin: "0 auto 70px" },
  pill: { display: "inline-block", background: "rgba(34,197,94,0.08)", color: "#4ade80", padding: "6px 18px", borderRadius: "40px", fontSize: "13px", fontWeight: 600, marginBottom: "20px", border: "1px solid rgba(34,197,94,0.18)", letterSpacing: "0.04em" },
  sectionTitle: { fontSize: "clamp(30px,4vw,48px)", fontWeight: 900, color: "#f9fafb", marginBottom: "18px", lineHeight: 1.15, letterSpacing: "-1px" },
  gradText: { background: "linear-gradient(135deg,#22c55e,#4ade80,#86efac)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  sectionSub: { fontSize: "17px", color: "#6b7280", lineHeight: 1.75 },

  /* Bento */
  bentoGrid: { maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "auto", gap: "20px" },
  bentoCard: { background: "rgba(17,24,39,0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "28px", backdropFilter: "blur(16px)", transition: "all 0.3s", cursor: "default" },
  bentoBig: { padding: "36px", display: "flex", flexDirection: "column" },
  bentoIconBig: { width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "20px" },
  bentoIcon: { width: "48px", height: "48px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "16px" },
  bentoTitle: { fontSize: "22px", fontWeight: 800, color: "#f9fafb", marginBottom: "12px", letterSpacing: "-0.3px" },
  bentoTitleSm: { fontSize: "17px", fontWeight: 700, color: "#f9fafb", marginBottom: "8px" },
  bentoDesc: { fontSize: "15px", color: "#9ca3af", lineHeight: 1.7, flex: 1, marginBottom: "20px" },
  bentoDescSm: { fontSize: "14px", color: "#9ca3af", lineHeight: 1.65 },
  bentoTag: { display: "inline-flex", alignItems: "center", padding: "5px 14px", background: "rgba(34,197,94,0.08)", color: "#22c55e", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(34,197,94,0.18)", alignSelf: "flex-start" },

  /* Steps */
  stepsRow: { maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "32px", position: "relative" },
  stepCard: { textAlign: "center", padding: "36px 24px", background: "rgba(17,24,39,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", backdropFilter: "blur(12px)" },
  stepNumBadge: { width: "40px", height: "40px", borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.25)", color: "#22c55e", fontWeight: 900, fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  stepIconBox: { fontSize: "36px", marginBottom: "16px" },
  stepTitle: { fontSize: "20px", fontWeight: 700, color: "#f9fafb", marginBottom: "12px" },
  stepDesc: { fontSize: "15px", color: "#9ca3af", lineHeight: 1.65 },
  stepConnector: { position: "absolute", right: "-20px", top: "50%", transform: "translateY(-50%)", color: "#374151", fontSize: "24px", fontWeight: 900, zIndex: 2 },

  /* Terminal */
  terminalWrap: { maxWidth: "1000px", margin: "0 auto" },
  terminal: { background: "rgba(5,8,15,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  termTop: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "16px", background: "rgba(17,24,39,0.5)" },
  termDots: { display: "flex", gap: "7px" },
  termDot: { width: "13px", height: "13px", borderRadius: "50%" },
  cmdGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0" },
  cmdCard: { padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.2s" },
  cmdCardActive: { background: "rgba(34,197,94,0.05)", borderLeft: "3px solid #22c55e" },
  cmdYou: { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" },
  cmdAi: { display: "flex", flexDirection: "column", gap: "4px" },

  /* Testimonials */
  testiGrid: { maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "24px" },
  testiCard: { background: "rgba(17,24,39,0.7)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "28px", backdropFilter: "blur(12px)", transition: "all 0.3s" },
  testiStars: { color: "#facc15", fontSize: "18px", letterSpacing: "3px", marginBottom: "16px" },
  testiText: { color: "#d1d5db", fontSize: "15px", lineHeight: 1.75, marginBottom: "24px", fontStyle: "italic" },
  testiAuthor: { display: "flex", alignItems: "center", gap: "12px" },
  testiAvatar: { width: "42px", height: "42px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px" },
  testiName: { fontSize: "15px", fontWeight: 700, color: "#f9fafb" },
  testiRole: { fontSize: "13px", color: "#6b7280" },

  /* About */
  aboutGrid: { maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" },
  aboutText: { fontSize: "16px", color: "#9ca3af", lineHeight: 1.85, marginBottom: "18px" },
  aboutList: { display: "flex", flexDirection: "column", gap: "10px" },
  aboutItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: "rgba(17,24,39,0.6)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" },
  aboutItemIcon: { fontSize: "18px", flexShrink: 0 },

  /* CTA */
  ctaSection: { padding: "120px 28px", position: "relative", overflow: "hidden", background: "rgba(17,24,39,0.3)", borderTop: "1px solid rgba(255,255,255,0.05)" },
  ctaGlow1: { position: "absolute", top: "-100px", left: "20%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)", pointerEvents: "none", animation: "glow 5s ease infinite" },
  ctaGlow2: { position: "absolute", bottom: "-100px", right: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)", pointerEvents: "none" },
  ctaInner: { textAlign: "center", maxWidth: "680px", margin: "0 auto" },
  ctaEyeIcon: { fontSize: "52px", marginBottom: "24px", display: "block" },
  ctaTitle: { fontSize: "clamp(32px,4vw,52px)", fontWeight: 900, color: "#f9fafb", marginBottom: "16px", letterSpacing: "-1px", lineHeight: 1.15 },
  ctaSub: { fontSize: "18px", color: "#9ca3af", lineHeight: 1.7, marginBottom: "40px" },
  ctaBtns: { display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" },

  /* Footer */
  footer: { borderTop: "1px solid rgba(255,255,255,0.05)", padding: "64px 28px 32px", position: "relative", zIndex: 1 },
  footerGrid: { maxWidth: "1200px", margin: "0 auto 48px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", gap: "60px" },
  footerTagline: { color: "#6b7280", fontSize: "14px", lineHeight: 1.7, marginTop: "14px", maxWidth: "260px" },
  footerHeading: { fontSize: "13px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" },
  footerLink: { display: "block", color: "#6b7280", textDecoration: "none", fontSize: "14px", marginBottom: "10px", transition: "color 0.2s" },
  footerBottom: { maxWidth: "1200px", margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px", display: "flex", justifyContent: "space-between", color: "#4b5563", fontSize: "13px", flexWrap: "wrap", gap: "12px" },
};
