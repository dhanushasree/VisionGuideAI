import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import DashboardLayout from "../components/DashboardLayout";

const COLORS = ["#22c55e","#facc15","#ef4444","#60a5fa","#a78bfa","#f472b6","#fb923c","#34d399"];
const SCORE_THRESHOLD = 0.06; // very low — catch everything COCO-SSD can find
const MOBILENET_TOPK  = 7;    // top-7 from MobileNet (1000 ImageNet classes)

export default function ObjectDetectionPage() {
  const { settings, speak } = useAccessibility();
  const isDark = settings.theme === "dark";

  const [scriptReady,    setScriptReady]    = useState(false);
  const [scriptError,    setScriptError]    = useState(false);
  const [modelReady,     setModelReady]     = useState(false);
  const [detrReady,      setDetrReady]      = useState(false);
  const [detrLoading,    setDetrLoading]    = useState(false);
  const [detecting,      setDetecting]      = useState(false);
  const [predictions,    setPredictions]    = useState([]);
  const [classifications,setClassifications]= useState([]); // MobileNet results
  const [imgSrc,         setImgSrc]         = useState(null);
  const [mode,           setMode]           = useState("upload");
  const [tab,            setTab]            = useState("object");
  const [cameraActive,   setCameraActive]   = useState(false);
  const [liveDetecting,  setLiveDetecting]  = useState(false);
  const [ocrText,        setOcrText]        = useState("");
  const [ocrProgress,    setOcrProgress]    = useState(0);
  const [ocrRunning,     setOcrRunning]     = useState(false);

  const modelRef      = useRef(null); // COCO-SSD (live camera)
  const detrRef       = useRef(null); // DETR-ResNet-50 (uploaded images, high accuracy)
  const mobileNetRef  = useRef(null);
  const imgRef        = useRef(null);
  const canvasRef     = useRef(null);
  const videoRef      = useRef(null);
  const camCanvasRef  = useRef(null);
  const streamRef     = useRef(null);
  const intervalRef   = useRef(null);
  const lastSpokenRef = useRef("");

  const C = {
    bg:         isDark ? "#111827" : "#ffffff",
    border:     isDark ? "#1f2937" : "rgba(0,0,0,0.1)",
    text:       isDark ? "#f9fafb" : "#0f172a",
    sub:        isDark ? "#9ca3af" : "#64748b",
    input:      isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    inBorder:   isDark ? "#374151" : "rgba(0,0,0,0.12)",
    dropBg:     isDark ? "rgba(167,139,250,0.06)" : "rgba(167,139,250,0.08)",
    dropBorder: isDark ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.35)",
  };

  /* ── Load TF.js + COCO-SSD + MobileNet via npm (dynamic import) ── */
  useEffect(() => {
    const load = async () => {
      try {
        await import("@tensorflow/tfjs");
        setScriptReady(true);
      } catch (e) {
        console.error("TF.js load failed:", e);
        setScriptError(true);
      }
    };
    load();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Pre-load COCO-SSD + MobileNet, then DETR in background ── */
  useEffect(() => {
    if (!scriptReady || modelRef.current) return;
    const loadModels = async () => {
      try {
        const [cocoSsd, mobilenet] = await Promise.all([
          import("@tensorflow-models/coco-ssd"),
          import("@tensorflow-models/mobilenet"),
        ]);
        const [cocoModel, mobileModel] = await Promise.all([
          cocoSsd.load({ base: "mobilenet_v2" }),
          mobilenet.load({ version: 2, alpha: 1.0 }),
        ]);
        modelRef.current     = cocoModel;
        mobileNetRef.current = mobileModel;
        setModelReady(true);

        // Load DETR in the background — higher accuracy for uploaded images
        setDetrLoading(true);
        try {
          const { pipeline, env } = await import("@huggingface/transformers");
          env.allowLocalModels = false;
          const detrModel = await pipeline("object-detection", "Xenova/detr-resnet-50", {
            quantized: true, // smaller download
          });
          detrRef.current = detrModel;
          setDetrReady(true);
          setDetrLoading(false);
        } catch (e) {
          console.warn("DETR load failed, using COCO-SSD only:", e.message);
          setDetrLoading(false);
        }
      } catch (err) {
        console.error("Model load failed:", err);
        speak("Model load failed. Check internet and refresh.");
      }
    };
    loadModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  /* ── Upload image ── */
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setPredictions([]);
    setClassifications([]);
    setOcrText("");
    setOcrProgress(0);
    const cv = canvasRef.current;
    if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
  };

  /* ── Normalize prediction to {label, score, x, y, w, h} regardless of source ── */
  const normPred = (p, imgW, imgH) => {
    if (p.box) {
      // DETR format: { label, score, box: { xmin, ymin, xmax, ymax } } — coords are absolute pixels
      const { xmin, ymin, xmax, ymax } = p.box;
      return { label: p.label, score: p.score, x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin };
    }
    // COCO-SSD format: { class, score, bbox: [x, y, w, h] }
    const [x, y, w, h] = p.bbox;
    return { label: p.class, score: p.score, x, y, w, h };
  };

  /* ── Draw bounding boxes on IMAGE canvas (handles COCO-SSD + DETR) ── */
  const drawBoxesOnImage = (preds, imgEl) => {
    const cv = canvasRef.current;
    if (!cv || !imgEl) return;
    const dW = imgEl.offsetWidth  || imgEl.clientWidth  || 640;
    const dH = imgEl.offsetHeight || imgEl.clientHeight || 480;
    const nW = imgEl.naturalWidth  || dW;
    const nH = imgEl.naturalHeight || dH;
    cv.width = dW; cv.height = dH;
    const scaleX = dW / nW, scaleY = dH / nH;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, dW, dH);
    preds.forEach((p, i) => {
      const { label, score, x, y, w, h } = normPred(p, nW, nH);
      const sx = x * scaleX, sy = y * scaleY, sw = w * scaleX, sh = h * scaleY;
      const color = COLORS[i % COLORS.length];
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.strokeRect(sx, sy, sw, sh);
      const txt = `${label} ${Math.round(score * 100)}%`;
      ctx.font = "bold 14px Inter, sans-serif";
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = color;
      ctx.fillRect(sx, Math.max(0, sy - 22), tw + 10, 22);
      ctx.fillStyle = "#000";
      ctx.fillText(txt, sx + 5, Math.max(14, sy - 5));
    });
  };

  /* ── Draw bounding boxes on CAMERA canvas ── */
  const drawBoxesOnCamera = (preds, videoEl) => {
    const cv = camCanvasRef.current;
    if (!cv || !videoEl) return;
    const dW = videoEl.offsetWidth  || videoEl.clientWidth  || 640;
    const dH = videoEl.offsetHeight || videoEl.clientHeight || 480;
    const nW = videoEl.videoWidth  || dW;
    const nH = videoEl.videoHeight || dH;
    cv.width = dW; cv.height = dH;
    const scaleX = dW / nW, scaleY = dH / nH;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, dW, dH);
    preds.forEach((p, i) => {
      const [x, y, w, h] = p.bbox;
      const sx = x * scaleX, sy = y * scaleY, sw = w * scaleX, sh = h * scaleY;
      const color = COLORS[i % COLORS.length];
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.strokeRect(sx, sy, sw, sh);
      const label = `${p.class} ${Math.round(p.score * 100)}%`;
      ctx.font = "bold 14px Inter, sans-serif";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(sx, Math.max(0, sy - 22), tw + 10, 22);
      ctx.fillStyle = "#000";
      ctx.fillText(label, sx + 5, Math.max(14, sy - 5));
    });
  };

  const ensureModel = async () => {
    if (modelRef.current) return modelRef.current;
    const cocoSsd = await import("@tensorflow-models/coco-ssd");
    const m = await cocoSsd.load({ base: "mobilenet_v2" });
    modelRef.current = m;
    setModelReady(true);
    return m;
  };

  /* ── Detect objects in uploaded image ──
     Uses DETR-ResNet-50 (transformer, high accuracy) when loaded,
     falls back to COCO-SSD + MobileNet otherwise.              ── */
  const detectImage = useCallback(async () => {
    if (!scriptReady) { speak("AI model is still loading. Please wait."); return; }
    if (!imgSrc)      { speak("Please upload an image first."); return; }
    setDetecting(true);
    setPredictions([]);
    setClassifications([]);
    try {
      const img = imgRef.current;
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise(res => { img.onload = res; });
      }

      let preds = [];

      if (detrRef.current) {
        // ── DETR path (high accuracy transformer model) ──
        const raw = await detrRef.current(img, { threshold: 0.3 });
        preds = raw; // [{ label, score, box: {xmin,ymin,xmax,ymax} }]
      } else {
        // ── COCO-SSD fallback ──
        const model = await ensureModel();
        const raw = await model.detect(img);
        preds = raw.filter(p => p.score >= SCORE_THRESHOLD);
      }

      setPredictions(preds);
      drawBoxesOnImage(preds, img);

      // MobileNet for supplementary classification (1000+ categories)
      let classifs = [];
      if (mobileNetRef.current) {
        classifs = await mobileNetRef.current.classify(img, MOBILENET_TOPK);
        setClassifications(classifs);
      }

      // Build speech: just the names
      const mainNames = [...new Set(preds.map(p => p.label ?? p.class))];
      const mobileNames = classifs.slice(0, 3).map(c => c.className.split(",")[0].trim());
      if (mainNames.length === 0 && classifs.length === 0) {
        speak("No objects detected. Try a clearer photo with better lighting.");
      } else if (mainNames.length === 0) {
        speak(mobileNames.join(", "));
      } else {
        const extra = mobileNames.filter(n => !mainNames.some(m => m.toLowerCase().includes(n.toLowerCase().split(" ")[0])));
        speak([...mainNames, ...extra.slice(0, 2)].join(", "));
      }
    } catch (err) {
      console.error(err);
      speak("Detection failed. Please try again.");
    }
    setDetecting(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, imgSrc, speak, detrReady]);

  /* ── Preprocess canvas for better OCR ── */
  const preprocessForOCR = (src) => {
    let w = 0, h = 0;
    if (src instanceof HTMLCanvasElement)     { w = src.width;  h = src.height; }
    else if (src instanceof HTMLImageElement) { w = src.naturalWidth || src.width; h = src.naturalHeight || src.height; }
    else if (src instanceof HTMLVideoElement) { w = src.videoWidth; h = src.videoHeight; }
    else return src;
    if (!w || !h) return src;
    const scale = Math.max(1, 800 / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0, c.width, c.height);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
      const v = Math.min(255, Math.max(0, Math.round((g - 128) * 1.4 + 128)));
      d[i] = d[i+1] = d[i+2] = v;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  };

  /* ── OCR ── */
  const runOCR = useCallback(async (source) => {
    const raw = source || imgRef.current || null;
    if (!raw) { speak("Please upload an image first."); return; }
    setOcrRunning(true); setOcrText(""); setOcrProgress(0);
    speak("Reading text from image, please wait…");
    try {
      const target = preprocessForOCR(raw);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m) => { if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100)); },
      });
      const { data: { text, confidence } } = await worker.recognize(target);
      await worker.terminate();
      const trimmed = text.replace(/[^\S\n]+/g, " ").trim();
      setOcrProgress(100);
      if (trimmed && confidence > 20) {
        setOcrText(trimmed);
        speak(`Text found: ${trimmed}`);
      } else if (trimmed) {
        setOcrText(trimmed);
        speak("Text detected but quality is low. Results may not be accurate.");
      } else {
        speak("No readable text found. Try a clearer image.");
      }
    } catch (err) {
      console.error(err);
      speak("Text reading failed. Please try again.");
    }
    setOcrRunning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  /* ── Camera: Start ── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      try { await v.play(); } catch {}
      setCameraActive(true);
      lastSpokenRef.current = "";
      if (tab === "object") {
        speak("Camera started. Live object detection is running.");
        startLiveDetection();
      } else {
        speak("Camera started. Click Read Text to extract text from the frame.");
      }
    } catch {
      speak("Could not access camera. Please grant camera permission and try again.");
    }
  };

  /* ── Camera: Stop ── */
  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    const cv = camCanvasRef.current;
    if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setLiveDetecting(false);
    setPredictions([]);
    setClassifications([]);
    lastSpokenRef.current = "";
  };

  /* ── Live detection loop every 800ms (COCO-SSD + MobileNet covers 1000+ object types) ── */
  const startLiveDetection = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLiveDetecting(true);

    intervalRef.current = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.paused || v.ended) return;
      try {
        const model = await ensureModel();

        // Run both models in parallel for speed
        const [cocoPreds, classifs] = await Promise.all([
          model.detect(v),
          mobileNetRef.current ? mobileNetRef.current.classify(v, MOBILENET_TOPK) : Promise.resolve([]),
        ]);

        const preds = cocoPreds.filter(p => p.score >= SCORE_THRESHOLD);
        setPredictions(preds);
        setClassifications(classifs);
        drawBoxesOnCamera(preds, v);

        // Build a single description from both models
        const cocoNames = [...new Set(preds.map(p => p.class))];
        const mobileTop = classifs.slice(0, 3).map(c => c.className.split(",")[0].trim());
        // Prefer COCO names (have bounding boxes); supplement with MobileNet for unknown objects
        const mobileExtra = mobileTop.filter(n => !cocoNames.some(c => c.toLowerCase().includes(n.toLowerCase().split(" ")[0])));
        const allNames = [...cocoNames, ...mobileExtra.slice(0, 2)].join(", ");

        if (allNames && allNames !== lastSpokenRef.current) {
          lastSpokenRef.current = allNames;
          speak(allNames);
        } else if (!allNames) {
          lastSpokenRef.current = "";
        }
      } catch (err) {
        console.error("Live detection error:", err);
      }
    }, 800);
  };

  /* ── Tab change while camera active ── */
  useEffect(() => {
    if (!cameraActive) return;
    if (tab === "object") {
      startLiveDetection();
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setLiveDetecting(false);
      setPredictions([]);
      const cv = camCanvasRef.current;
      if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ── Capture camera frame and run OCR ── */
  const captureAndReadText = async () => {
    const v = videoRef.current;
    if (!v || !cameraActive) { speak("Camera not active."); return; }
    const offscreen = document.createElement("canvas");
    offscreen.width  = v.videoWidth;
    offscreen.height = v.videoHeight;
    offscreen.getContext("2d").drawImage(v, 0, 0);
    await runOCR(offscreen); // pass canvas directly for preprocessing
  };

  const speakAllResults = () => {
    if (!predictions.length && !classifications.length) {
      speak("No detection results yet."); return;
    }
    const parts = [];
    if (predictions.length) {
      parts.push(predictions.map(p => p.label ?? p.class).join(", "));
    }
    if (classifications.length) {
      const extra = classifications
        .map(c => c.className.split(",")[0].trim())
        .filter(n => !predictions.some(p => (p.label ?? p.class).toLowerCase() === n.toLowerCase()));
      if (extra.length) parts.push(extra.join(", "));
    }
    speak(parts.join(", "));
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>🔍 Object Detection & Text Reader</h1>
          <p>Upload an image or use your camera — AI detects objects and reads text aloud.</p>
        </div>

        {scriptError && (
          <div className="alert alert-error">
            ⚠️ Could not load AI model. Check your internet connection and refresh.
          </div>
        )}
        {!scriptReady && !scriptError && (
          <div className="alert alert-info">⏳ Loading AI (TensorFlow.js + COCO-SSD + MobileNet)…</div>
        )}
        {scriptReady && (
          <div className="alert alert-success">
            ✅ {detrReady
              ? "DETR-ResNet-50 ready — high-accuracy transformer model active"
              : modelReady
                ? `Fast detection ready${detrLoading ? " — loading high-accuracy DETR model in background…" : " — DETR unavailable, using COCO-SSD"}`
                : "Loading AI models…"}
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          {[{ key: "object", label: "🔍 Detect Objects" }, { key: "ocr", label: "📝 Read Text (OCR)" }].map(t => (
            <button key={t.key} className={`btn ${tab === t.key ? "btn-green" : "btn-ghost"}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Mode switcher */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[{ key: "upload", label: "📁 Upload Image" }, { key: "camera", label: "📷 Live Camera" }].map(m => (
            <button key={m.key} className={`btn btn-sm ${mode === m.key ? "btn-yellow" : "btn-ghost"}`}
              onClick={() => { setMode(m.key); if (m.key === "upload") stopCamera(); }}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="obj-layout">

          {/* Left: media + controls */}
          <div style={{ ...st.imgBox, background: C.bg, border: `1px solid ${C.border}` }}>

            {mode === "upload" ? (
              <>
                {!imgSrc ? (
                  <label style={{ ...st.dropZone, background: C.dropBg, border: `2px dashed ${C.dropBorder}`, cursor: "pointer" }}>
                    <span style={{ fontSize: "52px" }}>🖼️</span>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: "16px" }}>Click to upload an image</span>
                    <span style={{ color: C.sub, fontSize: "13px" }}>JPG, PNG, WEBP — any object or scene</span>
                    <input type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
                  </label>
                ) : (
                  <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                    <img ref={imgRef} src={imgSrc} alt="Uploaded"
                      style={{ width: "100%", borderRadius: "10px", display: "block" }}
                      crossOrigin="anonymous" />
                    {tab === "object" && (
                      <canvas ref={canvasRef}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                  <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                    🔄 Change Image
                    <input type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
                  </label>
                  {tab === "object" ? (
                    <button className="btn btn-green" onClick={detectImage}
                      disabled={!imgSrc || detecting || !scriptReady}>
                      {detecting ? "🔄 Detecting…" : "🔍 Detect All Objects"}
                    </button>
                  ) : (
                    <button className="btn btn-green" onClick={() => runOCR(null)}
                      disabled={!imgSrc || ocrRunning}>
                      {ocrRunning ? `📖 Reading… ${ocrProgress}%` : "📝 Read Text"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div style={{ position: "relative", background: "#000", borderRadius: "10px", overflow: "hidden", minHeight: "280px" }}>
                  <video ref={videoRef}
                    style={{ width: "100%", display: cameraActive ? "block" : "none" }}
                    muted playsInline />
                  <canvas ref={camCanvasRef}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
                  {!cameraActive && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "280px", color: "#9ca3af", flexDirection: "column", gap: "12px" }}>
                      <span style={{ fontSize: "56px" }}>📷</span>
                      <span style={{ fontSize: "14px" }}>Camera not started</span>
                    </div>
                  )}
                  {cameraActive && tab === "object" && liveDetecting && (
                    <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(34,197,94,0.9)", color: "#000", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#000", display: "inline-block" }} />
                      LIVE DETECTION
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                  {!cameraActive ? (
                    <button className="btn btn-green" onClick={startCamera}>📷 Start Camera</button>
                  ) : (
                    <>
                      <button className="btn btn-red btn-sm" onClick={stopCamera}>⏹ Stop Camera</button>
                      {tab === "ocr" && (
                        <button className="btn btn-green" onClick={captureAndReadText} disabled={ocrRunning}>
                          {ocrRunning ? `📖 Reading… ${ocrProgress}%` : "📝 Read Text from Frame"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: results panel */}
          <div style={{ ...st.resultsBox, background: C.bg, border: `1px solid ${C.border}` }}>

            {tab === "object" ? (
              <>
                <div style={{ fontWeight: 700, fontSize: "15px", color: C.text, marginBottom: "14px" }}>
                  🎯 Detection Results
                  {cameraActive && liveDetecting && (
                    <span style={{ marginLeft: "8px", fontSize: "11px", color: "#22c55e", fontWeight: 600 }}>(live)</span>
                  )}
                </div>

                {predictions.length === 0 && classifications.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.sub, padding: "24px 0" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔍</div>
                    <div style={{ fontSize: "13px" }}>No results yet</div>
                    <div style={{ fontSize: "11px", marginTop: "4px" }}>
                      {mode === "camera" && cameraActive ? "Live detection running…" : "Upload an image and click Detect All Objects"}
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="btn btn-yellow btn-sm btn-full" onClick={speakAllResults} style={{ marginBottom: "12px" }}>
                      🔊 Read All Aloud
                    </button>

                    {/* COCO-SSD bounding-box results */}
                    {predictions.length > 0 && (
                      <>
                        <div style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>
                          Objects with Location ({predictions.length}) {detrReady ? "· DETR ✦" : "· COCO-SSD"}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                          {predictions.map((p, i) => {
                            const name = p.label ?? p.class;
                            return (
                              <div key={i}
                                style={{ padding: "10px 12px", borderRadius: "10px", background: `${COLORS[i % COLORS.length]}14`, border: `1px solid ${COLORS[i % COLORS.length]}30`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                onClick={() => speak(name)}>
                                <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length], textTransform: "capitalize", fontSize: "14px" }}>
                                  {name}
                                </span>
                                <span style={{ fontSize: "12px", color: C.sub, fontWeight: 700, background: `${COLORS[i % COLORS.length]}20`, padding: "2px 8px", borderRadius: "20px" }}>
                                  {Math.round(p.score * 100)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* MobileNet scene classification results */}
                    {classifications.length > 0 && (
                      <>
                        <div style={{ fontSize: "11px", color: "#a78bfa", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>
                          Scene Analysis — humans · animals · plants · vehicles · tools · food · 1000+ types
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {classifications.map((c, i) => (
                            <div key={i}
                              style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                              onClick={() => speak(`${c.className.split(",")[0]}, ${Math.round(c.probability * 100)} percent`)}>
                              <span style={{ fontSize: "13px", color: C.text, textTransform: "capitalize" }}>
                                {c.className.split(",")[0].trim()}
                              </span>
                              <span style={{ fontSize: "12px", color: "#a78bfa", fontWeight: 700, background: "rgba(167,139,250,0.15)", padding: "2px 8px", borderRadius: "20px" }}>
                                {Math.round(c.probability * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: "15px", color: C.text, marginBottom: "14px" }}>
                  📝 Recognized Text
                </div>
                {ocrRunning && (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ color: C.sub, fontSize: "13px" }}>Reading text… {ocrProgress}%</div>
                    <div style={{ width: "100%", background: C.inBorder, borderRadius: "4px", height: "6px", marginTop: "12px", overflow: "hidden" }}>
                      <div style={{ width: `${ocrProgress}%`, background: "#22c55e", height: "100%", transition: "width 0.3s", borderRadius: "4px" }} />
                    </div>
                  </div>
                )}
                {!ocrRunning && !ocrText && (
                  <div style={{ textAlign: "center", color: C.sub, padding: "24px 0" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📄</div>
                    <div style={{ fontSize: "13px" }}>No text read yet</div>
                    <div style={{ fontSize: "11px", marginTop: "4px" }}>Upload an image with text, then click Read Text</div>
                  </div>
                )}
                {!ocrRunning && ocrText && (
                  <>
                    <button className="btn btn-yellow btn-sm btn-full" onClick={() => speak(ocrText)} style={{ marginBottom: "10px" }}>
                      🔊 Read Text Aloud
                    </button>
                    <div style={{ background: C.input, border: `1px solid ${C.inBorder}`, borderRadius: "10px", padding: "12px", maxHeight: "320px", overflowY: "auto" }}>
                      <pre style={{ color: C.text, fontSize: "13px", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
                        {ocrText}
                      </pre>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-full" onClick={() => { setOcrText(""); setOcrProgress(0); }} style={{ marginTop: "10px" }}>
                      🗑️ Clear
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const st = {
  imgBox:     { borderRadius: "16px", padding: "20px" },
  dropZone:   { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "48px 20px", borderRadius: "12px", width: "100%", boxSizing: "border-box" },
  resultsBox: { borderRadius: "16px", padding: "18px" },
};
