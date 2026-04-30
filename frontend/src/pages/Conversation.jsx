import { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Globe, LogOut, ChevronDown, Sparkles, X } from 'lucide-react';
import { translateText, translateAudio, analyzeHistory, speakText } from '../services/api';

const SYSTEM_LANGS = [
  { code: 'ur', label: 'Urdu', flag: '🇵🇰', locale: 'ur-IN' },
  { code: 'en', label: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'fr', label: 'French', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'de', label: 'German', flag: '🇩🇪', locale: 'de-DE' },
];

export default function Conversation({ onLogout }) {
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('deal_chat_v5') || '[]'));
  const [aiSummary, setAiSummary] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [langA, setLangA] = useState(SYSTEM_LANGS[0]); 
  const [langB, setLangB] = useState(SYSTEM_LANGS[2]); 
  const [recording, setRecording] = useState(null);
  const [status, setStatus] = useState('');
  
  const scrollRef = useRef(null);
  const _mediaRecorderRef = useRef(null);
  const _audioStreamRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('deal_chat_v5', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const speak = async (text, lang) => {
    try {
      const data = await speakText(text, lang);
      if (data.audio) {
        const audioNode = document.getElementById('global-audio');
        if (audioNode) {
           audioNode.src = `data:audio/mp3;base64,${data.audio}`;
           audioNode.play().catch(e => console.error("Audio block:", e));
        }
      }
    } catch (err) {}
  };

  const startRecognition = async (active, target) => {
    const audioNode = document.getElementById('global-audio');
    if (audioNode) {
       audioNode.play().catch(() => {});
    }

    // ============================================
    // HYBRID ENGINE 1: GEMINI AUDIO VAD FOR URDU
    // ============================================
    if (active.code === 'ur') {
       try {
           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
           _audioStreamRef.current = stream;
           
           const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
           const recorder = new MediaRecorder(stream, { mimeType });
           _mediaRecorderRef.current = recorder;
           
           let audioChunks = [];
           recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
           
           recorder.onstop = async () => {
               if (_audioStreamRef.current) _audioStreamRef.current.getTracks().forEach(t => t.stop());
               
               setStatus('Analyzing audio...');
               
               const blob = new Blob(audioChunks, { type: mimeType });
               const reader = new FileReader();
               reader.readAsDataURL(blob);
               reader.onloadend = async () => {
                   const base64Str = reader.result;
                   try {
                       const res = await translateAudio(base64Str, mimeType, active.code, target.code);
                       if (res && res.translation && !res.translation.includes("(Error")) {
                           setMessages(p => [...p, { id: Date.now(), speaker: active.code, original: res.original, translated: res.translation, flag: active.flag }]);
                           speak(res.translation, target.code);
                       } else {
                           setStatus('Could not map audio');
                           setTimeout(()=>setStatus(''), 2000);
                       }
                   } catch(e) {}
                   setRecording(null);
                   setStatus('');
               };
           };

           // --- CUSTOM SILENCE DETECTION (VAD) ---
           const AudioContext = window.AudioContext || window.webkitAudioContext;
           const audioCtx = new AudioContext();
           const analyser = audioCtx.createAnalyser();
           const mediaNode = audioCtx.createMediaStreamSource(stream);
           mediaNode.connect(analyser);
           analyser.fftSize = 512;
           const dataArray = new Uint8Array(analyser.frequencyBinCount);
           
           let silenceTimer = null;
           let hasSpoken = false;

           const checkSilence = () => {
               if(recorder.state !== 'recording') return;
               analyser.getByteFrequencyData(dataArray);
               let sum = 0;
               for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
               let avg = sum / dataArray.length;

               if (avg > 12) { // 12/255 Volume threshold for Speech
                   hasSpoken = true;
                   if (silenceTimer) clearTimeout(silenceTimer);
                   silenceTimer = setTimeout(() => {
                       if (hasSpoken && recorder.state === 'recording') {
                           recorder.stop();
                           audioCtx.close().catch(()=>{});
                       }
                   }, 1500); // Wait 1.5 seconds of silence before Auto-Stop
               }
               requestAnimationFrame(checkSilence);
           };

           recorder.start();
           setRecording(active.code);
           setStatus(`Listening to ${active.label}...`);
           checkSilence();
           
           // Hard failsafe auto-stop at 15s to prevent runaway recording
           setTimeout(()=>{
               if (recorder.state === 'recording') {
                   recorder.stop();
                   audioCtx.close().catch(()=>{});
               }
           }, 15000);

       } catch(err) {
           console.error("VAD Mic Error:", err);
           setStatus('Mic Blocked');
           setRecording(null);
           setTimeout(()=>setStatus(''), 2000);
       }
       return;
    }

    // ============================================
    // HYBRID ENGINE 2: NATIVE SYSTEM FOR ALL OTHERS
    // ============================================
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Error: Browser not supported");
      return;
    }

    try {
      const r = new SpeechRecognition();
      r.lang = active.locale;
      r.continuous = false;
      r.interimResults = false;

      setRecording(active.code);
      setStatus(`Listening to ${active.label}...`);

      r.onresult = async (e) => {
        const text = e.results[0][0].transcript;
        if (!text) return;
        setStatus('Processing...');
        try {
          const data = await translateText(text, active.code, target.code);
          const trans = data.translation || "(Error)";
          setMessages(p => [...p, { id: Date.now(), speaker: active.code, original: text, translated: trans, flag: active.flag }]);
          speak(trans, target.code);
        } catch (err) {}
        setStatus('');
      };

      r.onerror = (err) => {
        console.error("Speech Error:", err.error);
        setRecording(null);
        setStatus(err.error === 'not-allowed' ? 'Mic Blocked' : 'Try Again');
        setTimeout(() => setStatus(''), 2000);
      };

      r.onend = () => {
        setRecording(null);
        if (status !== 'Processing...') setStatus('');
      };

      r.start();
    } catch (e) {
      console.error(e);
      setStatus("Error: Mic Init Failed");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <audio id="global-audio" style={{ display: 'none' }} playsInline />
      <header className="glass-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onLogout} className="action-btn" style={{ color: '#E53935' }}><LogOut size={22} /></button>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>AI Companion</h1>
         </div>
         <div style={{ display: 'flex', gap: 12 }}>
             <button onClick={() => setMessages([])} className="action-btn" title="Clear Chat"><Trash2 size={22}/></button>
             <button onClick={() => setShowAiModal(true)} className="action-btn pulse" style={{ background: '#E8F5E9' }}><Sparkles size={22} color="#006C35"/></button>
         </div>
      </header>

      {/* Language Bar - BIGGER & SMOOTHER */}
      <div style={{ padding: '20px 5%', background: '#fff', borderBottom: '1px solid #efefef' }}>
         <div className="mobile-stack" style={{ gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
               <select value={langA.code} onChange={(e) => setLangA(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '22px 20px', borderRadius: 24, border: '2px solid #f0f0f0', fontWeight: 900, appearance: 'none', background: '#fff', fontSize: 18, cursor: 'pointer' }}>
                  {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
               </select>
               <ChevronDown size={18} style={{ position: 'absolute', right: 20, top: 26, opacity: 0.3 }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
               <select value={langB.code} onChange={(e) => setLangB(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '22px 20px', borderRadius: 24, border: '2px solid #f0f0f0', fontWeight: 900, appearance: 'none', background: '#fff', fontSize: 18, cursor: 'pointer' }}>
                  {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
               </select>
               <ChevronDown size={18} style={{ position: 'absolute', right: 20, top: 26, opacity: 0.3 }} />
            </div>
         </div>
      </div>

      {/* Chat Area - MORE ROOM */}
      <main ref={scrollRef} className="container hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 340px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '35vh', flexDirection: 'column', color: '#ddd', textAlign: 'center' }}>
            <Globe size={120} style={{ opacity: 0.08, marginBottom: 25 }}/>
            <p style={{ fontWeight: 900, fontSize: 24, color: '#aaa' }}>Global Conversation</p>
            <p style={{ fontSize: 14 }}>Tap a mic to translate</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.speaker === langA.code ? 'chat-bubble-ar' : 'chat-bubble-zh'}`}>
               <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.8, marginBottom: 8 }}>{m.flag} {SYSTEM_LANGS.find(l => l.code === m.speaker)?.label}</div>
               <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{m.translated}</div>
               <div style={{ fontSize: 15, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 12, paddingTop: 12, opacity: 0.9, fontWeight: 600 }}>{m.original}</div>
            </div>
          ))
        )}
      </main>

      {/* FIXED ACTION AREA - CHORA & SMOOTH */}
      <div className="chat-input-bar" style={{ height: 'auto', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
         <div className="container">
            {status && <div className="flex-center pulse" style={{ marginBottom: 15, fontSize: 16, fontWeight: 900, color: '#006C35' }}>{status}</div>}
            <div className="mobile-stack">
               <button 
                 onClick={() => startRecognition(langA, langB)} 
                 disabled={!!recording}
                 className="btn-primary" 
                 style={{ 
                    flex: 1, height: 120, 
                    background: recording === langA.code ? '#000' : 'var(--saudi-green-gradient)', 
                    borderRadius: 30, fontSize: 24, boxShadow: '0 15px 35px rgba(0,108,53,0.2)' 
                 }}
               >
                  <Mic size={42} /> 
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, fontWeight: 900 }}>Talk {langA.label}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>Tap to translate</span>
                  </div>
               </button>
               <button 
                 onClick={() => startRecognition(langB, langA)} 
                 disabled={!!recording}
                 className="btn-primary" 
                 style={{ 
                    flex: 1, height: 120, 
                    background: recording === langB.code ? '#000' : 'var(--zh-red-gradient)', 
                    borderRadius: 30, fontSize: 24, boxShadow: '0 15px 35px rgba(238,28,37,0.2)' 
                 }}
               >
                  <Mic size={42} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, fontWeight: 900 }}>Talk {langB.label}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>Tap to translate</span>
                  </div>
               </button>
            </div>
         </div>
      </div>

      {/* AI Intelligence Overlay */}
      {showAiModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, padding: 25 }}>
          <div className="glass-card" style={{ padding: 40, width: '100%', maxWidth: 550 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ fontSize: 24, fontWeight: 900 }}>Intelligence Summary</h3>
                <button onClick={() => setShowAiModal(false)} className="action-btn"><X size={24}/></button> 
             </div>
             <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: 30 }} className="hide-scroll">
                <p style={{ fontSize: 18, lineHeight: 1.6, color: '#555' }}>
                   {aiSummary || "Continue your business dialogue. AI is listening for key deal points..."}
                </p>
             </div>
             <button onClick={async () => {
                 const data = await analyzeHistory(messages);
                 setAiSummary(data.summary);
             }} className="btn-primary" style={{ width: '100%', height: 75, fontSize: 20 }}>Refresh AI Analysis</button>
          </div>
        </div>
      )}
    </div>
  );
}
