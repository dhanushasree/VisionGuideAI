import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

/* ── Direction helpers ── */
const DIR_ICON = {
  right: "→", sharp_right: "↱", slight_right: "↗",
  left: "←", sharp_left: "↰", slight_left: "↖",
  straight: "↑", uturn: "↩", depart: "▶", arrive: "🏁",
  roundabout: "🔄", rotary: "🔄",
};

const getIcon = (m) => {
  if (!m) return "↑";
  if (m.type === "depart")  return "▶";
  if (m.type === "arrive")  return "🏁";
  if (m.type === "roundabout" || m.type === "rotary") return "🔄";
  const mod = (m.modifier || "straight").replace(/ /g, "_");
  return DIR_ICON[mod] || "↑";
};

const getInstruction = (m) => {
  if (!m) return "Continue";
  if (m.type === "depart")  return "Start";
  if (m.type === "arrive")  return "Arrive at destination";
  if (m.type === "roundabout") return "Take the roundabout";
  const mod = m.modifier || "";
  if (mod.includes("right")) return "Turn right";
  if (mod.includes("left"))  return "Turn left";
  if (mod === "uturn")       return "Make a U-turn";
  if (mod === "straight")    return "Go straight";
  return "Continue";
};

const fmtDist = (m) => {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
};

const fmtTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h} hr ${m} min`;
  if (m > 0) return `${m} min ${sec} sec`;
  return `${sec} sec`;
};

const fmtETA = (seconds) => {
  const eta = new Date(Date.now() + seconds * 1000);
  return eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/* ── Transport modes ── */
const MODES = [
  { key: "driving",  label: "Car",   icon: "🚗", osrm: "driving"  },
  { key: "cycling",  label: "Bike",  icon: "🚲", osrm: "cycling"  },
  { key: "foot",     label: "Walk",  icon: "🚶", osrm: "foot"     },
  { key: "bus",      label: "Bus",   icon: "🚌", osrm: null        },
  { key: "train",    label: "Train", icon: "🚂", osrm: null        },
];

export default function NavigationPage() {
  const { settings, speak } = useAccessibility();
  const [searchParams] = useSearchParams();
  const isDark = settings.theme === "dark";

  const [destination,    setDestination]    = useState("");
  const [currentPos,     setCurrentPos]     = useState(null);
  const [transportMode,  setTransportMode]  = useState("driving");
  const [routeStatus,    setRouteStatus]    = useState("idle");
  const [route,          setRoute]          = useState(null);
  const [nearbyPlaces,   setNearbyPlaces]   = useState([]);
  const [nearbyLoading,  setNearbyLoading]  = useState(false);
  const [errorMsg,       setErrorMsg]       = useState("");
  const [savedLocations, setSavedLocations] = useState([]);
  const [voiceListening, setVoiceListening] = useState(false);
  const [requests,       setRequests]       = useState([]);
  const recRef = useRef(null);
  const stopRef = useRef(false);

  const C = {
    card:    isDark ? "#111827" : "#ffffff",
    border:  isDark ? "#1f2937" : "rgba(0,0,0,0.1)",
    text:    isDark ? "#f9fafb" : "#0f172a",
    sub:     isDark ? "#9ca3af" : "#64748b",
    input:   isDark ? "#0a0f1e" : "#f8fafc",
    inBd:    isDark ? "#374151" : "rgba(0,0,0,0.15)",
  };

  /* ── Load saved locations & history ── */
  useEffect(() => {
    API.get("/locations").then(r => setSavedLocations(r.data)).catch(() => {});
    API.get("/navigation").then(r => setRequests(r.data)).catch(() => {});
  }, []);

  /* ── Auto-route from URL param (?dest=school) ── */
  useEffect(() => {
    const d = searchParams.get("dest");
    if (d) { setDestination(d); setTimeout(() => startRoute(d), 600); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Get current GPS location ── */
  const getCurrentLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { "User-Agent": "VisionGuideAI/1.0" } }
          );
          const data = await r.json();
          const label = data.display_name?.split(",").slice(0, 2).join(", ") || "Your location";
          resolve({ lat, lon, label });
        } catch {
          resolve({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
        }
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });

  /* ── Geocode destination — biased toward user's location for accurate local results ── */
  const geocode = async (query, nearLat, nearLon) => {
    // Build viewbox around user's position (±0.3° ≈ ~33km) to prefer local results
    const biasParams = nearLat && nearLon
      ? `&viewbox=${nearLon - 0.3},${nearLat + 0.3},${nearLon + 0.3},${nearLat - 0.3}&bounded=0`
      : "";
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&addressdetails=1${biasParams}`,
      { headers: { "User-Agent": "VisionGuideAI/1.0" } }
    );
    const data = await r.json();
    if (!data.length) throw new Error(`Location not found: ${query}`);
    // Prefer the result closest to user if we have location
    let best = data[0];
    if (nearLat && nearLon && data.length > 1) {
      const dist = (a, b) => Math.hypot(a.lat - b, a.lon - nearLon);
      best = data.reduce((closest, item) => {
        const itemLat = parseFloat(item.lat), itemLon = parseFloat(item.lon);
        const curLat  = parseFloat(closest.lat), curLon = parseFloat(closest.lon);
        const dItem   = Math.hypot(itemLat - nearLat, itemLon - nearLon);
        const dCur    = Math.hypot(curLat  - nearLat, curLon  - nearLon);
        return dItem < dCur ? item : closest;
      });
    }
    return {
      lat:   parseFloat(best.lat),
      lon:   parseFloat(best.lon),
      label: best.display_name?.split(",").slice(0, 2).join(", "),
    };
  };

  /* ── Fetch nearby places (Overpass API) around destination ── */
  const fetchNearbyPlaces = async (lat, lon) => {
    setNearbyLoading(true);
    setNearbyPlaces([]);
    try {
      const q = `[out:json][timeout:12];
        (
          node["amenity"~"^(hospital|pharmacy|atm|police|restaurant|cafe|hotel|bank|supermarket|bus_station|clinic|school)$"](around:2000,${lat},${lon});
          way["amenity"~"^(hospital|pharmacy|atm|police|restaurant|cafe|hotel|bank|supermarket|bus_station|clinic|school)$"](around:2000,${lat},${lon});
        );
        out center 20;`;
      const res  = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
        { signal: AbortSignal.timeout(14000) }
      );
      const data = await res.json();
      const places = (data.elements || [])
        .filter(e => e.tags?.name || e.tags?.amenity)
        .map(e => ({
          id:      e.id,
          name:    e.tags?.name || (e.tags?.amenity?.replace(/_/g, " ") || "Place"),
          amenity: e.tags?.amenity || "",
          lat:     e.lat ?? e.center?.lat,
          lon:     e.lon ?? e.center?.lon,
        }))
        .filter(p => p.lat && p.lon)
        // sort by distance from dest
        .sort((a, b) =>
          Math.hypot(a.lat - lat, a.lon - lon) - Math.hypot(b.lat - lat, b.lon - lon)
        )
        .slice(0, 12);
      setNearbyPlaces(places);
    } catch { /* non-fatal */ }
    setNearbyLoading(false);
  };

  /* ── Haversine distance in km ── */
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /* ── Build Google Maps URL for Bus/Train (transit) ── */
  const openTransitMaps = (from, destLabel, mode) => {
    const modeMap = { bus: "transit", train: "transit" };
    const travelMode = modeMap[mode] || "driving";
    const url = from
      ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${encodeURIComponent(destLabel)}&travelmode=${travelMode}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destLabel)}`;
    window.open(url, "_blank");
    speak(`Opening Google Maps for ${mode} route to ${destLabel}.`);
  };

  /* ── Main route function ── */
  const startRoute = async (dest = destination) => {
    if (!dest.trim()) { speak("Please enter a destination."); return; }
    stopRef.current = false;
    setRoute(null);
    setErrorMsg("");

    const mode = MODES.find(m => m.key === transportMode);

    /* Bus / Train → open Google Maps transit */
    if (!mode?.osrm) {
      setRouteStatus("locating");
      speak(`Getting ${mode.label} route to ${dest}. Opening Google Maps.`);
      try {
        const pos = await getCurrentLocation();
        setCurrentPos(pos);
        openTransitMaps(pos, dest, transportMode);
      } catch {
        openTransitMaps(null, dest, transportMode);
      }
      setRouteStatus("idle");
      return;
    }

    try {
      /* Step 1: Get current location */
      setRouteStatus("locating");
      speak("Getting your current location.");
      const pos = await getCurrentLocation();
      setCurrentPos(pos);
      if (stopRef.current) return;

      /* Step 2: Geocode destination — biased toward user's position */
      setRouteStatus("geocoding");
      speak(`Finding ${dest} on the map.`);
      const destCoords = await geocode(dest, pos.lat, pos.lon);
      if (stopRef.current) return;

      /* Step 3: OSRM routing */
      setRouteStatus("routing");
      speak("Calculating route.");
      const osrmProfile = mode.osrm;
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${pos.lon},${pos.lat};${destCoords.lon},${destCoords.lat}?steps=true&overview=false&annotations=false`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error("No route found. Try a different transport mode.");
      }

      const r = data.routes[0];
      const steps = r.legs[0].steps.map(s => ({
        instruction: getInstruction(s.maneuver),
        icon:        getIcon(s.maneuver),
        name:        s.name,
        distance:    s.distance,
        duration:    s.duration,
        type:        s.maneuver?.type,
      }));

      const routeData = {
        distance:   r.distance,
        duration:   r.duration,
        steps,
        destLabel:  destCoords.label,
        fromLabel:  pos.label,
        mode:       mode.label,
        _destLat:   destCoords.lat,
        _destLon:   destCoords.lon,
      };

      setRoute(routeData);
      setRouteStatus("done");

      /* Fetch nearby places around destination */
      fetchNearbyPlaces(destCoords.lat, destCoords.lon);

      /* Save to backend */
      API.post("/navigation", { destination: dest.trim() }).catch(() => {});
      API.get("/navigation").then(res => setRequests(res.data)).catch(() => {});

      /* Speak the route */
      speakRoute(routeData);

    } catch (err) {
      setRouteStatus("error");
      const msg = err.message || "Could not get route. Check internet and try again.";
      setErrorMsg(msg);
      speak(msg);
    }
  };

  /* ── Speak full route ── */
  const speakRoute = (r = route, nearby = nearbyPlaces) => {
    if (!r) return;
    const distKm = (r.distance / 1000).toFixed(1);
    const time   = fmtTime(r.duration);
    const eta    = fmtETA(r.duration);
    let text = `Route by ${r.mode}. `;
    text += `Total distance: ${distKm} kilometers. Estimated time: ${time}. Arriving at ${eta}. `;
    if (nearby.length > 0) {
      const names = nearby.slice(0, 3).map(p => p.name).join(", ");
      text += `Nearby places at destination: ${names}. `;
    }
    text += "Turn by turn: ";
    r.steps.forEach((s, i) => {
      if (s.type === "arrive") { text += `Step ${i + 1}. Arrive at destination. `; return; }
      text += `Step ${i + 1}. ${s.instruction}${s.name ? " on " + s.name : ""}. ${fmtDist(s.distance)}. `;
    });
    speak(text);
  };

  /* ── Voice input ── */
  const startVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { speak("Voice input not supported. Please use Chrome."); return; }
    if (voiceListening) { recRef.current?.stop(); setVoiceListening(false); return; }
    const rec = new SR();
    rec.lang = settings.language;
    rec.continuous = false;
    rec.interimResults = false;
    recRef.current = rec; rec.start(); setVoiceListening(true);
    speak("Say your destination.");
    rec.onresult = (e) => {
      const dest = e.results[0][0].transcript.trim();
      setDestination(dest); setVoiceListening(false);
      setTimeout(() => startRoute(dest), 400);
    };
    rec.onerror  = () => { setVoiceListening(false); speak("Could not understand. Try again."); };
    rec.onend    = () => setVoiceListening(false);
  };

  const openInMaps = (dest = destination) => {
    if (!dest) return;
    if (currentPos) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentPos.lat},${currentPos.lon}&destination=${encodeURIComponent(dest)}&travelmode=driving`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`, "_blank");
    }
  };

  const deleteRequest = async (id) => {
    try { await API.delete(`/navigation/${id}`); setRequests(p => p.filter(r => r.id !== id)); } catch {}
  };

  const statusLabel = {
    idle:     null,
    locating: "📡 Getting your location…",
    geocoding:"🔍 Finding destination…",
    routing:  "🗺️ Calculating route…",
    done:     null,
    error:    null,
  }[routeStatus];

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="page-header">
          <h1>🗺️ Navigation</h1>
          <p>Voice-guided turn-by-turn routing. Say <strong>"Hey Zara, navigate to school"</strong> or use controls below.</p>
        </div>

        {errorMsg && <div className="alert alert-error" role="alert">{errorMsg}</div>}
        {statusLabel && <div className="alert alert-info">{statusLabel}</div>}

        {/* ── Input card ── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{ ...s.sec, color: C.text }}>Destination</h3>
          <div style={s.inputRow}>
            <input
              style={{ ...s.input, background: C.input, border: `1.5px solid ${C.inBd}`, color: C.text, flex: 1 }}
              type="text"
              placeholder='e.g. "school", "Chennai airport", "hospital near me"'
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startRoute()}
              aria-label="Destination"
            />
            <button
              onClick={startVoiceInput}
              style={{ ...s.voiceBtn, ...(voiceListening ? s.voiceBtnActive : {}) }}
              aria-label={voiceListening ? "Stop voice input" : "Voice input"}
              title="Speak destination"
            >
              {voiceListening ? "⏹" : "🎤"}
            </button>
          </div>

          {/* Transport mode */}
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "12px", color: C.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Transport Mode</div>
            <div style={s.modeRow}>
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => setTransportMode(m.key)}
                  style={{
                    ...s.modeBtn,
                    ...(transportMode === m.key ? s.modeBtnActive : {}),
                    borderColor: transportMode === m.key ? "#a78bfa" : C.inBd,
                    color: transportMode === m.key ? "#a78bfa" : C.sub,
                    background: transportMode === m.key ? "rgba(167,139,250,0.12)" : C.input,
                  }}
                  aria-label={`${m.label} transport mode`}
                  aria-pressed={transportMode === m.key}
                >
                  <span style={{ fontSize: "22px" }}>{m.icon}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>{m.label}</span>
                  {(m.key === "bus" || m.key === "train") && (
                    <span style={{ fontSize: "9px", color: "#60a5fa" }}>Maps</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              onClick={() => startRoute()}
              disabled={routeStatus === "locating" || routeStatus === "geocoding" || routeStatus === "routing" || !destination.trim()}
              style={s.routeBtn}
              aria-label="Get route"
            >
              {routeStatus === "routing" || routeStatus === "locating" || routeStatus === "geocoding"
                ? "⏳ Getting route…"
                : "🗺️ Get Route"}
            </button>
            <button onClick={() => openInMaps()} disabled={!destination.trim()} style={s.mapsBtn} aria-label="Open in Google Maps">
              📍 Open in Maps
            </button>
            {route && (
              <button onClick={() => speakRoute()} style={s.speakBtn} aria-label="Speak full route">
                🔊 Speak Route
              </button>
            )}
            {(routeStatus !== "idle" || route) && (
              <button onClick={() => { stopRef.current = true; setRouteStatus("idle"); setRoute(null); setNearbyPlaces([]); setErrorMsg(""); speak("Route cleared."); }} style={s.clearBtn} aria-label="Clear route">
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Route result ── */}
        {route && (
          <div style={{ ...s.routeCard, background: C.card, border: `1px solid ${C.border}` }}>
            {/* Summary */}
            <div style={s.routeSummary}>
              <div style={s.summaryItem}>
                <span style={s.summaryIcon}>📍</span>
                <div>
                  <div style={{ fontSize: "11px", color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>From</div>
                  <div style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>{route.fromLabel}</div>
                </div>
              </div>
              <div style={{ color: "#a78bfa", fontSize: "20px", fontWeight: 900 }}>→</div>
              <div style={s.summaryItem}>
                <span style={s.summaryIcon}>🏁</span>
                <div>
                  <div style={{ fontSize: "11px", color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>To</div>
                  <div style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>{route.destLabel}</div>
                </div>
              </div>
            </div>

            <div style={s.statsRow}>
              <div style={s.stat}>
                <div style={s.statVal}>{(route.distance / 1000).toFixed(1)} km</div>
                <div style={s.statLabel}>Distance</div>
              </div>
              <div style={s.stat}>
                <div style={s.statVal}>{fmtTime(route.duration)}</div>
                <div style={s.statLabel}>Duration</div>
              </div>
              <div style={s.stat}>
                <div style={s.statVal}>{fmtETA(route.duration)}</div>
                <div style={s.statLabel}>ETA</div>
              </div>
              <div style={s.stat}>
                <div style={s.statVal}>{MODES.find(m => m.key === transportMode)?.icon} {route.mode}</div>
                <div style={s.statLabel}>Mode</div>
              </div>
            </div>

            {/* Turn-by-turn */}
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "13px", color: C.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                Turn-by-Turn Directions ({route.steps.length} steps)
              </div>
              <div style={s.stepsList}>
                {route.steps.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      ...s.step,
                      background: step.type === "arrive" ? "rgba(34,197,94,0.08)" : "rgba(167,139,250,0.05)",
                      border: `1px solid ${step.type === "arrive" ? "rgba(34,197,94,0.2)" : "rgba(167,139,250,0.1)"}`,
                    }}
                    onClick={() => speak(`Step ${i + 1}. ${step.instruction}${step.name ? " on " + step.name : ""}. ${fmtDist(step.distance)}.`)}
                    title="Click to hear this step"
                  >
                    <div style={s.stepIcon}>{step.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: "14px" }}>
                        {step.instruction}{step.name ? <span style={{ color: "#a78bfa" }}> on {step.name}</span> : ""}
                      </div>
                      {step.type !== "arrive" && (
                        <div style={{ fontSize: "12px", color: C.sub, marginTop: "2px" }}>
                          {fmtDist(step.distance)} · {fmtTime(step.duration)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => openInMaps(destination)} style={{ ...s.mapsBtn, width: "100%", marginTop: "14px", justifyContent: "center" }}>
              📍 Open Full Route in Google Maps
            </button>

            {/* ── Nearby Places ── */}
            <div style={{ marginTop: "24px", borderTop: `1px solid ${C.border}`, paddingTop: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span style={{ fontSize: "18px" }}>📍</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Nearby Places at Destination
                </span>
                {nearbyLoading && <span style={{ fontSize: "12px", color: "#a78bfa" }}>Loading…</span>}
              </div>

              {!nearbyLoading && nearbyPlaces.length === 0 && (
                <div style={{ color: C.sub, fontSize: "13px" }}>No nearby places found.</div>
              )}

              {nearbyPlaces.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                  {nearbyPlaces.map(p => {
                    const AMENITY_ICON = {
                      hospital: "🏥", pharmacy: "💊", atm: "🏧", police: "👮",
                      restaurant: "🍽️", cafe: "☕", hotel: "🏨", bank: "🏦",
                      supermarket: "🛒", bus_station: "🚌", clinic: "🏥", school: "🏫",
                    };
                    const icon = AMENITY_ICON[p.amenity] || "📍";
                    const distKm = route?.destLabel && currentPos
                      ? haversineKm(
                          route._destLat ?? currentPos.lat,
                          route._destLon ?? currentPos.lon,
                          p.lat, p.lon
                        ).toFixed(2)
                      : null;
                    return (
                      <div
                        key={p.id}
                        style={{
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                          border: `1px solid ${C.border}`,
                          borderRadius: "12px",
                          padding: "12px 14px",
                          cursor: "pointer",
                          transition: "opacity 0.15s",
                        }}
                        onClick={() => {
                          speak(`${p.name}. ${p.amenity.replace(/_/g, " ")}.${distKm ? " " + distKm + " kilometers away." : ""}`);
                        }}
                        title={`Navigate to ${p.name}`}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "20px" }}>{icon}</span>
                          <span style={{ fontWeight: 700, color: C.text, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: C.sub, textTransform: "capitalize" }}>
                            {p.amenity.replace(/_/g, " ")}
                          </span>
                          {distKm && (
                            <span style={{ fontSize: "11px", color: "#a78bfa", fontWeight: 700 }}>
                              {distKm} km
                            </span>
                          )}
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDestination(p.name);
                            setTimeout(() => startRoute(p.name), 200);
                          }}
                          style={{ marginTop: "8px", width: "100%", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa", padding: "6px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit" }}
                        >
                          🗺️ Route Here
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Quick places ── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{ ...s.sec, color: C.text }}>Quick Navigate To</h3>
          <div style={s.quickGrid}>
            {[
              { label: "🏥 Hospital",       q: "hospital near me"      },
              { label: "💊 Pharmacy",       q: "pharmacy near me"      },
              { label: "🏧 ATM",            q: "ATM near me"           },
              { label: "👮 Police Station", q: "police station near me"},
              { label: "🚌 Bus Stop",       q: "bus stop near me"      },
              { label: "🚉 Railway Station",q: "railway station near me"},
              { label: "🛒 Supermarket",    q: "supermarket near me"   },
              { label: "🏦 Bank",           q: "bank near me"          },
            ].map(p => (
              <button
                key={p.q}
                onClick={() => { setDestination(p.q); setTimeout(() => startRoute(p.q), 200); }}
                style={{ ...s.quickBtn, background: C.input, border: `1.5px solid ${C.inBd}`, color: C.text }}
                aria-label={`Navigate to ${p.label}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Saved locations ── */}
        {savedLocations.length > 0 && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ ...s.sec, color: C.text }}>Saved Locations</h3>
            <div style={s.quickGrid}>
              {savedLocations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => { setDestination(loc.place_name); setTimeout(() => startRoute(loc.place_name), 200); }}
                  style={{ ...s.quickBtn, background: "rgba(34,197,94,0.06)", border: "1.5px solid rgba(34,197,94,0.2)", color: C.text }}
                  aria-label={`Navigate to saved location ${loc.place_name}`}
                >
                  📍 {loc.place_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation history ── */}
        {requests.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ ...s.sec, color: C.text, marginBottom: 0 }}>Recent Destinations</h3>
              <span className="pill pill-purple">{requests.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {requests.slice(0, 6).map(req => (
                <div key={req.id} style={{ ...s.histCard, background: C.card, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: "20px" }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: "14px" }}>{req.destination}</div>
                  </div>
                  <button onClick={() => { setDestination(req.destination); setTimeout(() => startRoute(req.destination), 200); }} style={s.histNav} aria-label={`Navigate to ${req.destination}`}>🗺️ Route</button>
                  <button onClick={() => deleteRequest(req.id)} style={s.histDel} aria-label="Delete">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media(max-width:600px){
          .nav-modes { flex-wrap: wrap !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}

const s = {
  sec:       { fontSize: "16px", fontWeight: 700, marginBottom: "14px" },
  inputRow:  { display: "flex", gap: "10px", alignItems: "center" },
  input:     { padding: "13px 16px", borderRadius: "12px", fontSize: "15px", fontFamily: "Inter,Arial,sans-serif", outline: "none" },
  voiceBtn:  { background: "rgba(250,204,21,0.1)", border: "2px solid #facc15", color: "#facc15", borderRadius: "12px", width: "48px", height: "48px", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "inherit", transition: "all 0.15s" },
  voiceBtnActive: { background: "rgba(239,68,68,0.15)", borderColor: "#ef4444", color: "#ef4444" },
  modeRow:   { display: "flex", gap: "8px", flexWrap: "wrap" },
  modeBtn:   { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "10px 14px", borderRadius: "12px", border: "1.5px solid", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", minWidth: "60px" },
  modeBtnActive: { fontWeight: 700 },
  routeBtn:  { background: "#a78bfa", color: "#000", border: "none", padding: "13px 24px", borderRadius: "12px", fontWeight: 700, fontSize: "15px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  mapsBtn:   { background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa", padding: "13px 20px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", display: "flex", alignItems: "center", gap: "6px" },
  speakBtn:  { background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15", padding: "13px 20px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  clearBtn:  { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "13px 16px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "Inter,Arial,sans-serif" },
  routeCard: { borderRadius: "16px", padding: "20px", marginBottom: "20px" },
  routeSummary: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
  summaryItem: { display: "flex", alignItems: "center", gap: "10px" },
  summaryIcon: { fontSize: "24px" },
  statsRow:  { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" },
  stat:      { textAlign: "center", padding: "12px 8px", background: "rgba(167,139,250,0.06)", borderRadius: "10px", border: "1px solid rgba(167,139,250,0.1)" },
  statVal:   { fontWeight: 800, fontSize: "16px", color: "#a78bfa", marginBottom: "4px" },
  statLabel: { fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" },
  stepsList: { display: "flex", flexDirection: "column", gap: "8px" },
  step:      { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", cursor: "pointer", transition: "opacity 0.15s" },
  stepIcon:  { fontSize: "22px", width: "32px", textAlign: "center", flexShrink: 0 },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" },
  quickBtn:  { padding: "14px 10px", borderRadius: "12px", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "Inter,Arial,sans-serif", textAlign: "center", transition: "all 0.15s" },
  histCard:  { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", borderLeft: "4px solid #a78bfa" },
  histNav:   { background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", flexShrink: 0 },
  histDel:   { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", flexShrink: 0 },
};
