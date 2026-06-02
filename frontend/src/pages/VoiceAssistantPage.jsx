import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAccessibility } from "../context/AccessibilityContext";
import API from "../api";

function tts(text) {
  if (!text) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN"; u.rate = 0.9; u.volume = 1;
  setTimeout(() => window.speechSynthesis.speak(u), 80);
  return u;
}

const TYPE_COLOR = {
  greeting:"#22c55e", contacts:"#60a5fa", locations:"#34d399",
  articles:"#facc15", navigation:"#a78bfa", sos:"#ef4444",
  stop:"#f87171", help:"#fb923c", navigate_app:"#f472b6",
  time:"#34d399", saved_location_nav:"#38bdf8", unknown:"#6b7280",
};

const QUICK = [
  { icon:"📞", label:"Read Contacts",    cmd:"read contacts" },
  { icon:"📍", label:"Read Locations",   cmd:"read saved locations" },
  { icon:"📖", label:"Read Articles",    cmd:"read articles" },
  { icon:"🚨", label:"Send SOS",         cmd:"send sos" },
  { icon:"🏥", label:"Hospital Near Me", cmd:"hospital near me" },
  { icon:"💊", label:"Pharmacy Near Me", cmd:"pharmacy near me" },
  { icon:"🏧", label:"ATM Near Me",      cmd:"atm near me" },
  { icon:"🚔", label:"Police Near Me",   cmd:"police station near me" },
  { icon:"🚌", label:"Bus Stop Near Me", cmd:"bus stop near me" },
  { icon:"🏨", label:"Hotel Near Me",    cmd:"hotel near me" },
  { icon:"⏰", label:"What Time Is It",  cmd:"what time is it" },
  { icon:"❓", label:"Help",             cmd:"help" },
];

export default function VoiceAssistantPage() {
  const { settings } = useAccessibility();
  const navigate     = useNavigate();
  const isDark       = settings.theme === "dark";

  const [phase, setPhase] = useState("idle"); // idle|recording|processing|speaking
  const [msgs,  setMsgs]  = useState([]);
  const [input, setInput] = useState("");
  const [log,   setLog]   = useState("Ready — click START to begin");

  const phaseRef = useRef("idle");
  const recRef   = useRef(null);
  const aliveRef = useRef(true);
  const genRef   = useRef(0);
  const endRef   = useRef(null);

  function setPhaseSync(p) { phaseRef.current = p; setPhase(p); }

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  function addMsg(role, text, type = "unknown") {
    if (!aliveRef.current) return;
    const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    setMsgs(p => [...p.slice(-49), { role, text, type, time }]);
  }

  /* ═══ START LISTENING via SpeechRecognition ═══ */
  function startRecording() {
    if (phaseRef.current !== "idle") return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setLog("❌ Speech Recognition not supported. Please use Chrome or Edge.");
      return;
    }

    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onstart = () => {
      if (!aliveRef.current) return;
      setPhaseSync("recording");
      setLog("🔴 Listening… speak now, then click STOP");
    };

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (!aliveRef.current || !text) return;
      setLog(`Heard: "${text}"`);
      runCommand(text);
    };

    rec.onerror = (e) => {
      if (!aliveRef.current) return;
      if (e.error === "no-speech") {
        setLog("No speech detected. Click START and try again.");
      } else if (e.error === "not-allowed" || e.error === "permission-denied") {
        setLog("❌ Microphone blocked. Allow mic in browser settings and try again.");
      } else {
        setLog(`❌ Error: ${e.error}. Try again.`);
      }
      setPhaseSync("idle");
    };

    rec.onend = () => {
      /* If still in recording phase (no result came), go back to idle */
      if (phaseRef.current === "recording" && aliveRef.current) {
        setPhaseSync("idle");
        setLog("Ready — click START to begin");
      }
    };

    try {
      rec.start();
      setLog("Requesting microphone…");
    } catch (err) {
      setLog(`❌ Could not start microphone: ${err.message}`);
    }
  }

  /* ═══ STOP LISTENING ═══ */
  function stopRecording() {
    if (phaseRef.current !== "recording") return;
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }
    setLog("Processing…");
  }

  /* ═══ COMMAND PROCESSOR ═══ */
  async function runCommand(text) {
    if (!text?.trim() || !aliveRef.current) return;
    const t   = text.toLowerCase().trim();
    const gen = ++genRef.current;
    const has = (...w) => w.some(x => t.includes(x));

    setPhaseSync("processing"); setLog("Processing command…");
    window.speechSynthesis.cancel();
    addMsg("user", text);

    let reply = "", type = "unknown", nav = "";

    if (has("stop","quiet","silence","mute","shut up"))
      { window.speechSynthesis.cancel(); reply="Stopped."; type="stop"; }
    else if (has("hello","hi","hey","good morning","good evening","good afternoon","how are you","who are you","visionguide"))
      { reply="Hello! I am VisionGuide AI, your voice assistant. How can I help you today?"; type="greeting"; }
    else if (has("thank you","thanks","thank u","great","awesome","well done","perfect"))
      { reply="You are welcome! Always here to help."; type="greeting"; }
    else if (has("bye","goodbye","see you","take care","that's all"))
      { reply="Goodbye! Stay safe."; type="greeting"; }
    else if (t==="time"||has("what time","current time","what is the time","what's the time","time please"))
      { reply=`The time is ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}.`; type="time"; }
    else if (t==="help"||has("what can i say","what can you do","list commands","available commands","how to use"))
      { reply="Say hello, read contacts, read articles, read saved locations, send SOS, hospital near me, pharmacy near me, ATM near me, police station near me, bus stop near me, hotel near me, what time is it, navigate to a place, go to dashboard, stop, or help."; type="help"; }
    else if (has("read contact","show contact","emergency contact","my contact","saved contact","contact list","who to call"))
      { reply="Reading your emergency contacts now."; type="contacts"; }
    else if (has("read article","show article","saved article","my article","read news"))
      { reply="Reading your saved articles now."; type="articles"; }
    else if (t==="locations"||t==="saved locations"||has("read location","show location","read saved location","saved place","my location"))
      { reply="Reading your saved locations now."; type="locations"; }
    else if (t==="sos"||t==="emergency"||has("send sos","sos alert","emergency alert","emergency help","i need help","please help","send help","ambulance","trigger sos"))
      { reply="Sending SOS alert now. Your emergency contacts will be notified. Stay calm, help is on the way."; type="sos"; }
    else {
      const NEARBY = [
        { n:["hospital","doctor","clinic","medical"], k:"hospital" },
        { n:["pharmacy","medicine","drug store","chemist"], k:"pharmacy" },
        { n:["atm","cash machine","cash","withdraw"], k:"atm" },
        { n:["police","cop","police station"], k:"police station" },
        { n:["bus stop","bus stand","bus","transit"], k:"bus stop" },
        { n:["hotel","lodge","accommodation","motel"], k:"hotel" },
        { n:["restaurant","food","eat","cafe","coffee"], k:"restaurant" },
        { n:["bank","finance"], k:"bank" },
        { n:["airport","air terminal"], k:"airport" },
        { n:["petrol","fuel","gas station"], k:"petrol station" },
      ];
      if (has("near me","nearby","nearest","close by","around me")) {
        const hit = NEARBY.find(p => p.n.some(n => t.includes(n)));
        if (hit) { reply=`Opening Google Maps for ${hit.k} near you.`; type="navigation"; nav=`${hit.k} near me`; }
      }
      if (!reply && has("go to","open the","take me to","switch to","show me")) {
        const pg = getPage(t); if (pg) { reply=`Opening ${pg}.`; type="navigate_app"; }
      }
      if (!reply && has("navigate to","go to","take me to","directions to","route to","drive to")) {
        const d = cleanDest(t);
        const pages = ["dashboard","voice","camera","object","contact","emergency","article","navigation","safewalk","location","command","history","feedback","setting"];
        if (d && d.length>1 && !pages.some(p=>d.includes(p))) { reply=`Looking up ${d} in saved locations.`; type="saved_location_nav"; nav=d; }
      }
      if (!reply) {
        try {
          const r = await API.post("/commands", { commandText:text });
          reply=r.data.responseText; type=r.data.commandType;
          if (type==="navigation") nav=cleanDest(text);
        } catch { reply=`I heard "${text}". Say help to hear available commands.`; type="unknown"; }
      }
    }

    if (!aliveRef.current) return;
    addMsg("assistant", reply, type);
    setPhaseSync("speaking"); setLog("Speaking reply…");

    const u = tts(reply);
    const fb = setTimeout(() => { if(aliveRef.current){setPhaseSync("idle");setLog("Ready — click START to begin");} }, 25000);
    const done = () => {
      clearTimeout(fb);
      if (!aliveRef.current) return;
      setPhaseSync("idle"); setLog("Ready — click START to begin");
      if (type==="contacts")  setTimeout(()=>doContacts(gen),400);
      if (type==="locations") setTimeout(()=>doLocations(gen),400);
      if (type==="articles")  setTimeout(()=>doArticles(gen),400);
      if (type==="sos")       setTimeout(()=>doSOS(gen),400);
      if (type==="navigation"&&nav)         setTimeout(()=>openMaps(nav),400);
      if (type==="saved_location_nav"&&nav) setTimeout(()=>findLoc(nav,gen),400);
    };
    if (u) { u.onend=done; u.onerror=done; } else done();
  }

  function getPage(t) {
    const map = { dashboard:"/dashboard", camera:"/dashboard/camera", object:"/dashboard/objects",
      contact:"/dashboard/emergency", emergency:"/dashboard/emergency", sos:"/dashboard/sos",
      navigation:"/dashboard/navigation", safewalk:"/dashboard/safewalk", "safe walk":"/dashboard/safewalk",
      article:"/dashboard/articles", "safety tip":"/dashboard/safety", location:"/dashboard/locations",
      command:"/dashboard/commands", history:"/dashboard/commands", feedback:"/dashboard/feedback", setting:"/dashboard/settings" };
    for (const [k,p] of Object.entries(map)) { if (t.includes(k)) { navigate(p); return p.split("/").pop()||"dashboard"; } }
    return null;
  }
  const cleanDest = t => t.replace(/\b(navigate to|go to|open map for|directions? to|take me to|find|search for|map to|open|drive to|route to)\b/gi,"").trim();
  const openMaps  = q => q?.trim() && window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,"_blank");

  async function doContacts(gen) {
    try { const r=await API.get("/emergency"); if(gen!==genRef.current)return; tts(!r.data.length?"No emergency contacts.":r.data.map((c,i)=>`Contact ${i+1}: ${c.name}, ${c.phone}.`).join(" ")); }
    catch { if(gen===genRef.current) tts("Could not read contacts."); }
  }
  async function doLocations(gen) {
    try { const r=await API.get("/locations"); if(gen!==genRef.current)return; tts(!r.data.length?"No saved locations.":r.data.map((l,i)=>`Location ${i+1}: ${l.place_name}. ${l.address||""}.`).join(" ")); }
    catch { if(gen===genRef.current) tts("Could not read locations."); }
  }
  async function doArticles(gen) {
    try { const r=await API.get("/articles"); if(gen!==genRef.current)return; tts(!r.data.length?"No saved articles.":r.data.map((a,i)=>`Article ${i+1}: ${a.title}.`).join(" ")); }
    catch { if(gen===genRef.current) tts("Could not read articles."); }
  }
  async function doSOS(gen) {
    try { await API.post("/sos",{message:"Emergency! I need help.",location:"Voice command"}); if(gen===genRef.current) tts("SOS sent. Emergency contacts notified."); }
    catch { if(gen===genRef.current) tts("Could not send SOS."); }
  }
  async function findLoc(dest,gen) {
    try {
      const r=await API.get("/locations"); if(gen!==genRef.current)return;
      const m=r.data.find(l=>l.place_name?.toLowerCase().includes(dest)||dest.includes(l.place_name?.toLowerCase()));
      if(m){tts(`Opening ${m.place_name}.`);setTimeout(()=>openMaps(m.address||m.place_name),200);}
      else {tts(`Opening Maps for ${dest}.`);setTimeout(()=>openMaps(dest),200);}
    } catch { if(gen===genRef.current){tts(`Opening Maps for ${dest}.`);setTimeout(()=>openMaps(dest),200);} }
  }

  function handleSend() { const v=input.trim(); if(!v)return; setInput(""); runCommand(v); }

  const C = {
    card:   isDark?"#0d1117":"#ffffff", card2: isDark?"#111827":"#f8fafc",
    border: isDark?"#1e2a3a":"rgba(0,0,0,0.09)", text: isDark?"#f0f6fc":"#0f172a",
    sub:    isDark?"#8b949e":"#64748b", inp: isDark?"#0d1117":"#f1f5f9",
    inB:    isDark?"#30363d":"rgba(0,0,0,0.15)",
    uBub:   isDark?"#1c2d40":"#dbeafe", uTxt: isDark?"#79b8ff":"#1d4ed8",
    aBub:   isDark?"#111827":"#f0fdf4",
  };

  const isRec  = phase==="recording";
  const isProc = phase==="processing";
  const isSpk  = phase==="speaking";

  return (
    <DashboardLayout>
      <div className="fade-in" style={{maxWidth:"1100px",margin:"0 auto"}}>

        <div style={{marginBottom:"24px"}}>
          <h1 style={{fontSize:"22px",fontWeight:800,color:C.text,margin:0}}>🎤 Voice Assistant</h1>
          <p style={{color:C.sub,margin:"4px 0 0",fontSize:"13px"}}>Click START → speak your command → response is spoken aloud</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.1fr) minmax(0,1fr)",gap:"20px",alignItems:"start"}}>

          {/* ═══ LEFT ═══ */}
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

            {/* Main mic card */}
            <div style={{borderRadius:"20px",background:C.card,border:`1px solid ${C.border}`,padding:"32px 24px",textAlign:"center"}}>

              {/* Pulse rings */}
              <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:"24px"}}>
                {isRec&&<>
                  <div style={{position:"absolute",inset:-20,borderRadius:"50%",border:"2px solid rgba(239,68,68,.5)",animation:"varing 1.2s ease-out infinite"}}/>
                  <div style={{position:"absolute",inset:-40,borderRadius:"50%",border:"2px solid rgba(239,68,68,.25)",animation:"varing 1.2s ease-out infinite 0.4s"}}/>
                </>}
                {isSpk&&<div style={{position:"absolute",inset:-12,borderRadius:"50%",border:"2px solid rgba(96,165,250,.5)",animation:"varing 1.8s ease-out infinite"}}/>}

                {/* Mic icon circle */}
                <div style={{
                  width:"140px",height:"140px",borderRadius:"50%",
                  border:`4px solid ${isRec?"#ef4444":isProc?"#facc15":isSpk?"#60a5fa":"#22c55e"}`,
                  background:isRec?"rgba(239,68,68,.1)":isProc?"rgba(250,204,21,.1)":isSpk?"rgba(96,165,250,.1)":"rgba(34,197,94,.1)",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px",
                  boxShadow:!phase||phase==="idle"?"none":`0 0 50px ${isRec?"#ef444455":isProc?"#facc1555":"#60a5fa55"}`,
                  transition:"all 0.3s",
                }}>
                  <span style={{fontSize:"52px",lineHeight:1}}>
                    {isRec?"🔴":isProc?"⌛":isSpk?"🔊":"🎤"}
                  </span>
                  <span style={{fontSize:"11px",fontWeight:800,letterSpacing:"0.08em",color:isRec?"#ef4444":isProc?"#facc15":isSpk?"#60a5fa":"#22c55e"}}>
                    {isRec?"LISTENING":isProc?"PROCESSING":isSpk?"SPEAKING":"READY"}
                  </span>
                </div>
              </div>

              {/* Status log */}
              <p style={{fontSize:"13px",fontWeight:600,color:isRec?"#ef4444":isProc?"#facc15":isSpk?"#60a5fa":log.startsWith("❌")?"#f87171":"#22c55e",margin:"0 0 20px",minHeight:"20px",lineHeight:1.5}}>
                {log}
              </p>

              {/* ── BUTTONS ── */}
              <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>

                {/* START button — visible when idle */}
                {!isRec&&!isProc&&(
                  <button
                    onClick={startRecording}
                    disabled={isSpk}
                    style={{
                      padding:"14px 36px",borderRadius:"14px",fontSize:"16px",fontWeight:800,
                      background:"#22c55e",color:"#000",border:"none",cursor:isSpk?"not-allowed":"pointer",
                      fontFamily:"inherit",letterSpacing:"0.04em",opacity:isSpk?0.5:1,
                      boxShadow:"0 4px 20px rgba(34,197,94,0.35)",transition:"all 0.2s",
                    }}>
                    🎤 START
                  </button>
                )}

                {/* STOP button — visible when recording */}
                {isRec&&(
                  <button
                    onClick={stopRecording}
                    style={{
                      padding:"14px 36px",borderRadius:"14px",fontSize:"16px",fontWeight:800,
                      background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",
                      fontFamily:"inherit",letterSpacing:"0.04em",
                      boxShadow:"0 4px 20px rgba(239,68,68,0.4)",animation:"vaStopPulse 1s ease-in-out infinite",
                    }}>
                    ⏹ STOP
                  </button>
                )}

                {/* STOP SPEAKING button */}
                {isSpk&&(
                  <button
                    onClick={()=>{window.speechSynthesis.cancel();setPhaseSync("idle");setLog("Ready — click START to begin");}}
                    style={{padding:"10px 24px",borderRadius:"12px",fontSize:"14px",fontWeight:700,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171",cursor:"pointer",fontFamily:"inherit"}}>
                    ⏹ Stop Speaking
                  </button>
                )}
              </div>
            </div>

            {/* Text input */}
            <div style={{display:"flex",gap:"10px"}}>
              <input type="text" placeholder="Or type a command here and press Enter…"
                value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()}
                style={{flex:1,padding:"13px 16px",borderRadius:"12px",fontSize:"14px",fontFamily:"inherit",background:C.inp,border:`2px solid ${C.inB}`,color:C.text,outline:"none"}}/>
              <button onClick={handleSend} disabled={!input.trim()}
                style={{padding:"13px 22px",borderRadius:"12px",background:"#22c55e",color:"#000",border:"none",fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"inherit",opacity:input.trim()?1:0.5}}>
                Send
              </button>
            </div>

            {/* Quick commands */}
            <div style={{borderRadius:"16px",background:C.card,border:`1px solid ${C.border}`,padding:"18px"}}>
              <p style={{fontSize:"11px",fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 12px"}}>⚡ Quick Commands</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {QUICK.map(q=>(
                  <button key={q.cmd} onClick={()=>runCommand(q.cmd)}
                    style={{display:"flex",alignItems:"center",gap:"8px",padding:"11px 12px",borderRadius:"10px",cursor:"pointer",fontSize:"13px",fontWeight:600,fontFamily:"inherit",background:C.card2,border:`1px solid ${C.border}`,color:C.text,textAlign:"left"}}>
                    <span style={{fontSize:"18px"}}>{q.icon}</span>{q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT — chat ═══ */}
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            <div style={{borderRadius:"16px",background:C.card,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"590px"}}>

              <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <span style={{fontSize:"12px",fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em"}}>💬 Conversation</span>
                {msgs.length>0&&<button onClick={()=>setMsgs([])} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Clear</button>}
              </div>

              <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                {msgs.length===0
                  ?<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px",opacity:0.4,textAlign:"center"}}>
                    <span style={{fontSize:"48px"}}>🎤</span>
                    <p style={{fontSize:"13px",color:C.sub,margin:0,lineHeight:1.7}}>Click START and speak a command.<br/>Your conversation appears here.</p>
                  </div>
                  :msgs.map((m,i)=>(
                    <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
                      <span style={{fontSize:"10px",color:C.sub,marginBottom:"3px",padding:m.role==="user"?"0 4px 0 0":"0 0 0 4px"}}>
                        {m.role==="user"?"You":"VisionGuide AI"} · {m.time}
                      </span>
                      <div style={{maxWidth:"90%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?C.uBub:C.aBub,color:m.role==="user"?C.uTxt:C.text,border:`1px solid ${m.role==="user"?C.uTxt+"25":(TYPE_COLOR[m.type]||"#6b7280")+"25"}`,borderLeft:m.role==="assistant"?`3px solid ${TYPE_COLOR[m.type]||"#6b7280"}`:undefined,fontSize:"13px",lineHeight:1.7,wordBreak:"break-word"}}>
                        {m.text}
                      </div>
                      {m.role==="assistant"&&m.type&&m.type!=="unknown"&&(
                        <span style={{marginTop:"3px",padding:"2px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:700,background:(TYPE_COLOR[m.type]||"#6b7280")+"18",color:TYPE_COLOR[m.type]||"#6b7280"}}>{m.type}</span>
                      )}
                    </div>
                  ))
                }
                {isProc&&(
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    {[0,1,2].map(i=><span key={i} style={{width:"7px",height:"7px",borderRadius:"50%",background:"#facc15",display:"inline-block",animation:"vadot 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}
                    <span style={{fontSize:"11px",color:C.sub}}>Processing…</span>
                  </div>
                )}
                <div ref={endRef}/>
              </div>
            </div>

            {/* Reference */}
            <div style={{borderRadius:"16px",background:C.card,border:`1px solid ${C.border}`,padding:"16px"}}>
              <p style={{fontSize:"11px",fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 10px"}}>💡 What to say</p>
              {[["hello","Greet"],["read contacts","Hear contacts"],["read saved locations","Hear places"],["read articles","Hear articles"],["hospital near me","Find hospital"],["send SOS","Emergency alert"],["what time is it","Current time"],["go to dashboard","Switch page"],["stop","Silence voice"],["help","All commands"]].map(([cmd,desc])=>(
                <div key={cmd} onClick={()=>runCommand(cmd)}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer",gap:"8px"}}>
                  <span style={{color:"#facc15",fontWeight:700,fontSize:"12px",flexShrink:0}}>"{cmd}"</span>
                  <span style={{color:C.sub,fontSize:"11px"}}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes varing     { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
        @keyframes vadot      { 0%,80%,100%{transform:scale(.7);opacity:.3} 40%{transform:scale(1.1);opacity:1} }
        @keyframes vaStopPulse{ 0%,100%{box-shadow:0 4px 20px rgba(239,68,68,.4)} 50%{box-shadow:0 4px 40px rgba(239,68,68,.8)} }
      `}</style>
    </DashboardLayout>
  );
}
