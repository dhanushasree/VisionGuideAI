import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";

/* Remove OCR noise: short/garbage lines, lines with too many special chars */
function cleanOCRText(raw) {
  const lines = raw.split("\n");
  const good = lines.filter((ln) => {
    const t = ln.trim();
    if (t.length < 3) return false;                          // too short
    const letters = (t.match(/[a-zA-Zऀ-ॿ஀-௿ఀ-౿]/g) || []).length;
    const ratio   = letters / t.length;
    if (ratio < 0.35 && t.length < 12) return false;        // mostly symbols, short
    const garblePat = /^[^a-zA-Z0-9ऀ-౿\s.,!?:;'"()-]+$/;
    if (garblePat.test(t)) return false;                     // all special chars
    return true;
  });
  return good.join("\n").replace(/[^\S\n]{2,}/g, " ").trim();
}

export default function CameraOCRPage() {
  const { settings, speak: ctxSpeak } = useAccessibility();
  const isDark = settings.theme === "dark";
  const C = {
    text:       isDark ? "#f9fafb"               : "#0f172a",
    sub:        isDark ? "#9ca3af"               : "#64748b",
    dim:        isDark ? "#6b7280"               : "#94a3b8",
    border:     isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
    inputBg:    isDark ? "rgba(255,255,255,0.04)": "rgba(0,0,0,0.04)",
    itemBg:     isDark ? "rgba(255,255,255,0.03)": "rgba(0,0,0,0.03)",
    progressBg: isDark ? "rgba(255,255,255,0.06)": "rgba(0,0,0,0.08)",
    histBorder: isDark ? "rgba(255,255,255,0.05)": "rgba(0,0,0,0.08)",
    previewBg:  isDark ? "#0d1117"               : "#f8fafc",
  };
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [streaming,   setStreaming]   = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [scannedText, setScannedText] = useState("");
  const [history,     setHistory]     = useState([]);
  const [reading,     setReading]     = useState(false);
  const [error,       setError]       = useState("");
  const [camError,    setCamError]    = useState(false);
  const [mode,        setMode]        = useState("camera");
  const [uploadedImg, setUploadedImg] = useState(null);  // preview URL

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = settings.language; u.rate = settings.voiceSpeed ?? 0.9; u.volume = 1;
    setReading(true);
    u.onend   = () => setReading(false);
    u.onerror = () => setReading(false);
    window.speechSynthesis.speak(u);
  };

  const stopReading = () => { window.speechSynthesis.cancel(); setReading(false); };

  /* ── Start camera ── */
  const startCamera = async () => {
    setCamError(false); setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      const vid = videoRef.current;
      if (vid) {
        vid.srcObject = stream;
        try { await vid.play(); } catch {}
        setStreaming(true);
        speak("Camera ready. Point at any text and press Capture and Read.");
      }
    } catch (err) {
      setCamError(true);
      const msg = err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in browser settings, or use Upload Image."
        : "Could not start camera. Please use the Upload Image option.";
      setError(msg);
      speak("Camera blocked. Use the Upload Image option instead.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  };

  useEffect(() => () => stopCamera(), []);

  /* ── Preprocess canvas for better OCR ── */
  const preprocessCanvas = (src) => {
    let w = 0, h = 0;
    if (src instanceof HTMLCanvasElement) { w = src.width; h = src.height; }
    else if (src instanceof HTMLVideoElement) { w = src.videoWidth; h = src.videoHeight; }
    else if (src instanceof HTMLImageElement) { w = src.naturalWidth || src.width; h = src.naturalHeight || src.height; }
    else return src;
    if (!w || !h) return src;

    const scale = Math.max(1, 900 / Math.max(w, h));
    const out = document.createElement("canvas");
    out.width = Math.round(w * scale); out.height = Math.round(h * scale);
    const ctx = out.getContext("2d");
    ctx.drawImage(src, 0, 0, out.width, out.height);

    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d   = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
      const c = Math.min(255, Math.max(0, Math.round((g - 128) * 1.5 + 128)));
      d[i] = d[i+1] = d[i+2] = c;
    }
    ctx.putImageData(img, 0, 0);
    return out;
  };

  /* ── Run OCR ── */
  const runOCR = async (imageSource) => {
    setProcessing(true); setProgress(0); setScannedText(""); setError("");
    speak("Scanning text. Please wait.");
    try {
      const processed = preprocessCanvas(imageSource);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m) => { if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100)); },
      });
      const { data: { text, confidence } } = await worker.recognize(processed);
      await worker.terminate();

      const clean = cleanOCRText(text);

      if (clean.length > 3 && confidence > 18) {
        setScannedText(clean);
        setHistory(prev => [{ text: clean, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        speak(clean);
      } else if (confidence <= 18 && clean.length > 0) {
        setError(`Low confidence (${Math.round(confidence)}%). Try better lighting or a clearer image.`);
        speak("Text detected but not clear enough. Try better lighting or move closer.");
      } else {
        setError("No readable text found. Point at clear printed text with good lighting.");
        speak("No readable text found. Try better lighting or move the camera closer.");
      }
    } catch {
      setError("OCR failed. Please try again.");
      speak("Text scanning failed. Please try again.");
    }
    setProcessing(false); setProgress(0);
  };

  /* ── Capture from live video ── */
  const captureAndRead = () => {
    const vid = videoRef.current;
    const cnv = canvasRef.current;
    if (!vid || !cnv || vid.videoWidth === 0) {
      setError("Camera not ready. Please wait a moment and try again."); return;
    }
    cnv.width  = vid.videoWidth;
    cnv.height = vid.videoHeight;
    cnv.getContext("2d").drawImage(vid, 0, 0);
    runOCR(cnv);
  };

  /* ── Upload image ── */
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Release previous object URL
    if (uploadedImg) URL.revokeObjectURL(uploadedImg);
    const url = URL.createObjectURL(file);
    setUploadedImg(url);
    setScannedText(""); setError("");

    const img = new Image();
    img.onload = () => {
      const cnv    = canvasRef.current;
      cnv.width    = img.naturalWidth  || img.width;
      cnv.height   = img.naturalHeight || img.height;
      cnv.getContext("2d").drawImage(img, 0, 0);
      runOCR(cnv);
    };
    img.src = url;
  };

  // Cleanup object URL on unmount
  useEffect(() => () => { if (uploadedImg) URL.revokeObjectURL(uploadedImg); }, [uploadedImg]);

  const useCases = [
    { icon: "🍽️", text: "Restaurant menu" },
    { icon: "💊", text: "Medicine label" },
    { icon: "🚌", text: "Bus number / signboard" },
    { icon: "📄", text: "Document / form" },
    { icon: "🏷️", text: "Product label" },
    { icon: "📰", text: "Newspaper / book" },
  ];

  const s = {
    modeRow:           { display: "flex", gap: "10px", marginBottom: "16px" },
    modeBtn:           { flex: 1, padding: "11px", border: `1px solid ${C.border}`, borderRadius: "10px", background: C.inputBg, color: C.sub, cursor: "pointer", fontWeight: 600, fontSize: "14px", fontFamily: "inherit", transition: "all 0.2s" },
    modeBtnActive:     { background: "rgba(244,114,182,0.1)", borderColor: "rgba(244,114,182,0.3)", color: "#f472b6" },
    cameraBox:         { position: "relative", borderRadius: "16px", overflow: "hidden", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "4/3", marginBottom: "16px", minHeight: "220px" },
    video:             { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    scanOverlay:       { position: "absolute", inset: 0, pointerEvents: "none" },
    scanCornerTL:      { position: "absolute", top: "8%", left: "8%", width: "30px", height: "30px", borderTop: "3px solid #22c55e", borderLeft: "3px solid #22c55e", borderRadius: "4px 0 0 0" },
    scanCornerTR:      { position: "absolute", top: "8%", right: "8%", width: "30px", height: "30px", borderTop: "3px solid #22c55e", borderRight: "3px solid #22c55e", borderRadius: "0 4px 0 0" },
    scanCornerBL:      { position: "absolute", bottom: "8%", left: "8%", width: "30px", height: "30px", borderBottom: "3px solid #22c55e", borderLeft: "3px solid #22c55e", borderRadius: "0 0 0 4px" },
    scanCornerBR:      { position: "absolute", bottom: "8%", right: "8%", width: "30px", height: "30px", borderBottom: "3px solid #22c55e", borderRight: "3px solid #22c55e", borderRadius: "0 0 4px 0" },
    scanLine:          { position: "absolute", left: "8%", right: "8%", height: "2px", background: "linear-gradient(90deg,transparent,#22c55e,transparent)", animation: "scan 2s ease-in-out infinite alternate", boxShadow: "0 0 8px #22c55e" },
    camHint:           { position: "absolute", bottom: "12px", left: 0, right: 0, textAlign: "center", color: "#22c55e", fontSize: "13px", fontWeight: 600, textShadow: "0 2px 8px rgba(0,0,0,0.8)" },
    cameraPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "220px", padding: "40px", textAlign: "center" },
    camIcon:           { fontSize: "56px", marginBottom: "16px" },
    previewBox:        { marginBottom: "16px", borderRadius: "16px", overflow: "hidden", border: `1px solid ${C.border}`, background: C.previewBg },
    previewImg:        { width: "100%", display: "block", maxHeight: "380px", objectFit: "contain" },
    changeBtn:         { display: "block", textAlign: "center", padding: "10px", cursor: "pointer", color: C.sub, fontSize: "13px", background: C.inputBg, transition: "background 0.2s" },
    uploadBox:         { borderRadius: "16px", border: `2px dashed ${C.border}`, marginBottom: "16px", overflow: "hidden" },
    uploadLabel:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", cursor: "pointer", textAlign: "center" },
    controls:          { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" },
    progressWrap:      { background: C.progressBg, borderRadius: "8px", overflow: "hidden", height: "28px", position: "relative", marginBottom: "16px" },
    progressBar:       { height: "100%", background: "linear-gradient(90deg,#16a34a,#22c55e,#4ade80)", transition: "width 0.3s ease", borderRadius: "8px" },
    progressText:      { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff" },
    resultBox:         { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "14px", padding: "20px" },
    resultHeader:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" },
    resultTitle:       { fontSize: "16px", fontWeight: 700, color: C.text },
    resultText:        { color: C.text, fontSize: "15px", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" },
    sideTitle:         { fontSize: "13px", fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" },
    useCaseGrid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" },
    useCaseItem:       { display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: C.itemBg, borderRadius: "8px" },
    tipItem:           { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" },
    tipNum:            { width: "20px", height: "20px", borderRadius: "50%", background: "rgba(244,114,182,0.15)", color: "#f472b6", fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" },
    histItem:          { padding: "14px 0", borderBottom: `1px solid ${C.histBorder}` },
    rereadBtn:         { background: "transparent", border: "1px solid rgba(250,204,21,0.2)", color: "#facc15", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", marginTop: "8px" },
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>📷 Camera Text Reader</h1>
          <p>Point your camera at any text — menu, sign, medicine bottle, document — and hear it read aloud instantly.</p>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="ocr-layout">
          {/* ── Left: Camera + controls ── */}
          <div>
            {/* Mode toggle */}
            <div style={s.modeRow}>
              <button style={{ ...s.modeBtn, ...(mode === "camera" ? s.modeBtnActive : {}) }}
                onClick={() => { setMode("camera"); setError(""); }}
                aria-pressed={mode === "camera"}>
                📷 Live Camera
              </button>
              <button style={{ ...s.modeBtn, ...(mode === "upload" ? s.modeBtnActive : {}) }}
                onClick={() => { setMode("upload"); stopCamera(); setError(""); }}
                aria-pressed={mode === "upload"}>
                🖼️ Upload Image
              </button>
            </div>

            {/* Camera view */}
            {mode === "camera" && (
              <div style={s.cameraBox}>
                {/* video always in DOM so videoRef.current is never null */}
                <video
                  ref={videoRef}
                  style={{ ...s.video, display: streaming ? "block" : "none" }}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera feed"
                />
                {streaming && (
                  <>
                    <div style={s.scanOverlay} aria-hidden="true">
                      <div style={s.scanCornerTL} /><div style={s.scanCornerTR} />
                      <div style={s.scanCornerBL} /><div style={s.scanCornerBR} />
                      <div style={s.scanLine} />
                    </div>
                    <div style={s.camHint} aria-live="polite">
                      {processing ? `Scanning… ${progress}%` : "Frame the text and press Capture"}
                    </div>
                  </>
                )}
                {!streaming && (
                  <div style={s.cameraPlaceholder}>
                    {camError ? (
                      <>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
                        <p style={{ color: "#f87171", fontWeight: 600, marginBottom: "8px" }}>Camera blocked</p>
                        <p style={{ color: "#6b7280", fontSize: "13px" }}>Allow camera in browser settings or use Upload Image</p>
                      </>
                    ) : (
                      <>
                        <div style={s.camIcon}>📷</div>
                        <p style={{ color: C.sub, marginBottom: "6px", fontWeight: 600 }}>Camera not started</p>
                        <p style={{ color: C.dim, fontSize: "13px" }}>Tap "Start Camera" to begin</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upload view — shows preview immediately */}
            {mode === "upload" && (
              <div>
                {uploadedImg ? (
                  <div style={s.previewBox}>
                    <img src={uploadedImg} alt="Uploaded for OCR" style={s.previewImg} />
                    <label htmlFor="img-upload-change" style={s.changeBtn}>
                      🔄 Change Image
                      <input type="file" accept="image/*" id="img-upload-change"
                        style={{ display: "none" }} onChange={handleUpload} />
                    </label>
                  </div>
                ) : (
                  <div style={s.uploadBox}>
                    <input type="file" accept="image/*" id="img-upload"
                      style={{ display: "none" }} onChange={handleUpload} />
                    <label htmlFor="img-upload" style={s.uploadLabel}>
                      <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>🖼️</span>
                      <span style={{ fontSize: "17px", fontWeight: 700, color: C.text, display: "block", marginBottom: "8px" }}>
                        Tap to upload an image
                      </span>
                      <span style={{ fontSize: "13px", color: C.dim }}>
                        JPG, PNG, HEIC — any image with text
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Hidden canvas */}
            <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />

            {/* Controls */}
            <div style={s.controls}>
              {mode === "camera" && !streaming && !camError && (
                <button className="btn btn-green btn-full btn-lg" onClick={startCamera}
                  aria-label="Start camera for text scanning">
                  📷 Start Camera
                </button>
              )}
              {mode === "camera" && streaming && (
                <>
                  <button className="btn btn-yellow btn-full btn-lg" onClick={captureAndRead}
                    disabled={processing} aria-label="Capture image and read text aloud">
                    {processing ? `⏳ Scanning… ${progress}%` : "📸 Capture & Read Aloud"}
                  </button>
                  <button className="btn btn-ghost btn-full" onClick={stopCamera}>⏹ Stop Camera</button>
                </>
              )}
              {mode === "upload" && !uploadedImg && (
                <label htmlFor="img-upload" className="btn btn-green btn-full btn-lg" style={{ cursor: "pointer", textAlign: "center" }}>
                  📁 Choose Image from Gallery / Files
                </label>
              )}
              {mode === "upload" && uploadedImg && processing && (
                <button className="btn btn-yellow btn-full btn-lg" disabled>
                  ⏳ Reading text… {progress}%
                </button>
              )}
              {mode === "upload" && uploadedImg && !processing && (
                <button className="btn btn-green btn-full" onClick={() => {
                  const cnv = canvasRef.current;
                  if (cnv) runOCR(cnv);
                }}>
                  🔁 Re-scan Image
                </button>
              )}
            </div>

            {/* Progress */}
            {processing && (
              <div style={s.progressWrap} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ ...s.progressBar, width: `${progress}%` }} />
                <span style={s.progressText}>{progress}%</span>
              </div>
            )}

            {/* Result */}
            {scannedText && (
              <div style={s.resultBox} role="region" aria-label="Extracted text result">
                <div style={s.resultHeader}>
                  <h3 style={s.resultTitle}>📝 Extracted Text</h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button className="btn btn-yellow btn-sm" onClick={() => speak(scannedText)}
                      disabled={reading} aria-label="Read text aloud">
                      🔊 {reading ? "Reading…" : "Read Again"}
                    </button>
                    {reading && (
                      <button className="btn btn-ghost btn-sm" onClick={stopReading}>⏹</button>
                    )}
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => navigator.clipboard?.writeText(scannedText)}>
                      📋 Copy
                    </button>
                  </div>
                </div>
                <p style={s.resultText}>{scannedText}</p>
              </div>
            )}
          </div>

          {/* ── Right: Info + History ── */}
          <div>
            <div className="card" style={{ marginBottom: "20px" }}>
              <h3 style={s.sideTitle}>What can I scan?</h3>
              <div style={s.useCaseGrid}>
                {useCases.map(u => (
                  <div key={u.text} style={s.useCaseItem}>
                    <span style={{ fontSize: "22px" }}>{u.icon}</span>
                    <span style={{ color: C.text, fontSize: "13px" }}>{u.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: "20px" }}>
              <h3 style={s.sideTitle}>Tips for best results</h3>
              {[
                "Hold the camera steady and close to the text",
                "Use good lighting — avoid shadows on the text",
                "Ensure text is fully in frame",
                "High contrast text (dark on light) works best",
                "Printed text is more accurate than handwriting",
              ].map((tip, i) => (
                <div key={i} style={s.tipItem}>
                  <span style={s.tipNum}>{i + 1}</span>
                  <span style={{ color: C.sub, fontSize: "14px" }}>{tip}</span>
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div className="card">
                <h3 style={s.sideTitle}>Recent Scans</h3>
                {history.map((h, i) => (
                  <div key={i} style={s.histItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: C.dim, fontSize: "11px" }}>Scan {history.length - i}</span>
                      <span style={{ color: C.dim, fontSize: "11px" }}>{h.time}</span>
                    </div>
                    <p style={{ color: C.sub, fontSize: "13px", lineHeight: 1.5 }}>
                      {h.text.length > 120 ? h.text.slice(0, 120) + "…" : h.text}
                    </p>
                    <button style={s.rereadBtn} onClick={() => { setScannedText(h.text); speak(h.text); }}>
                      🔊 Re-read
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes scan{0%{top:10%}100%{top:85%}}`}</style>
    </DashboardLayout>
  );
}

