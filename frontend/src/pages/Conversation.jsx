import { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Globe, LogOut, ChevronDown, Sparkles, X } from 'lucide-react';
import { translateText, analyzeHistory, speakText } from '../services/api';

const SYSTEM_LANGS = [
  { code: 'ur', label: 'Urdu', flag: '🇵🇰', locale: 'ur-PK' },
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

  useEffect(() => {
    localStorage.setItem('deal_chat_v5', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const speak = async (text, lang) => {
    try {
      const data = await speakText(text, lang);
      if (data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.play().catch(() => {});
      }
    } catch (err) {}
  };

  const startRecognition = (active, target) => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const r = new SpeechRecognition();
    r.lang = active.locale;
    r.continuous = false;
    r.interimResults = false;

    setRecording(active.code);
    setStatus(`Listening to ${active.label}...`);

    r.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      if (!text) return;
      
      setStatus('Translating...');
      try {
        const data = await translateText(text, active.code, target.code);
        const trans = data.translation || "(Error)";
        
        setMessages(p => [...p, { 
            id: Date.now(), 
            speaker: active.code, 
            original: text, 
            translated: trans, 
            flag: active.flag 
        }]);
        
        speak(trans, target.code);
      } catch (err) {
        console.error(err);
      }
      setStatus('');
    };

    r.onerror = (e) => {
      setRecording(null);
      setStatus('Retry...');
      setTimeout(() => setStatus(''), 2000);
    };

    r.onend = () => {
      setRecording(null);
      if (status !== 'Translating...') setStatus('');
    };

    r.start();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
      <header className="glass-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onLogout} className="action-btn" style={{ color: '#E53935' }}><LogOut size={18} /></button>
            <h1 style={{ fontSize: 20, fontWeight: 900 }}>Global AI</h1>
         </div>
         <div style={{ display: 'flex', gap: 10 }}>
             <button onClick={() => setMessages([])} className="action-btn"><Trash2 size={18}/></button>
             <button onClick={() => setShowAiModal(true)} className="action-btn pulse" style={{ background: '#E8F5E9' }}><Sparkles size={18} color="#006C35"/></button>
         </div>
      </header>

      {/* Language Bar */}
      <div style={{ padding: '15px 5%', background: '#fff', borderBottom: '1px solid #eee' }}>
         <div className="container mobile-stack">
            <div style={{ flex: 1, position: 'relative' }}>
               <select value={langA.code} onChange={(e) => setLangA(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '16px', borderRadius: 16, border: '1px solid #eee', fontWeight: 900, appearance: 'none', background: '#fff' }}>
                  {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
               </select>
               <ChevronDown size={14} style={{ position: 'absolute', right: 15, top: 22, opacity: 0.3 }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
               <select value={langB.code} onChange={(e) => setLangB(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '16px', borderRadius: 16, border: '1px solid #eee', fontWeight: 900, appearance: 'none', background: '#fff' }}>
                  {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
               </select>
               <ChevronDown size={14} style={{ position: 'absolute', right: 15, top: 22, opacity: 0.3 }} />
            </div>
         </div>
      </div>

      {/* Chat Area */}
      <main ref={scrollRef} className="container hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 220px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '40vh', flexDirection: 'column', color: '#999', textAlign: 'center' }}>
            <Globe size={80} style={{ opacity: 0.05, marginBottom: 20 }}/>
            <p style={{ fontWeight: 900, fontSize: 18 }}>Start Conversation</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.speaker === langA.code ? 'chat-bubble-ar' : 'chat-bubble-zh'}`}>
               <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.6, marginBottom: 5 }}>{m.flag} {SYSTEM_LANGS.find(l => l.code === m.speaker)?.label}</div>
               <div style={{ fontSize: 18, fontWeight: 800 }}>{m.translated}</div>
               <div style={{ fontSize: 13, borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 10, paddingTop: 10, opacity: 0.8 }}>{m.original}</div>
            </div>
          ))
        )}
      </main>

      {/* FIXED FOOTER */}
      <div className="chat-input-bar">
         <div className="container">
            {status && <div className="flex-center" style={{ marginBottom: 15, fontSize: 13, fontWeight: 900, color: '#006C35' }}>{status}</div>}
            <div className="mobile-stack">
               <button 
                 onClick={() => startRecognition(langA, langB)} 
                 disabled={!!recording}
                 className="btn-primary" 
                 style={{ flex: 1, height: 90, background: recording === langA.code ? '#000' : '#006C35', borderRadius: 24, fontSize: 18 }}
               >
                  <Mic size={32} /> <span>Talk {langA.label}</span>
               </button>
               <button 
                 onClick={() => startRecognition(langB, langA)} 
                 disabled={!!recording}
                 className="btn-primary" 
                 style={{ flex: 1, height: 90, background: recording === langB.code ? '#000' : '#EE1C25', borderRadius: 24, fontSize: 18 }}
               >
                  <Mic size={32} /> <span>Talk {langB.label}</span>
               </button>
            </div>
         </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, padding: 20 }}>
          <div className="glass-card" style={{ padding: 30, width: '100%', maxWidth: 500 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 22, fontWeight: 900 }}>Business Summary</h3>
                <button onClick={() => setShowAiModal(false)} className="action-btn"><X size={20}/></button> 
             </div>
             <p style={{ fontSize: 16, lineHeight: 1.6, color: '#666', marginBottom: 25 }}>
                {aiSummary || "Analysis in progress..."}
             </p>
             <button onClick={async () => {
                 const data = await analyzeHistory(messages);
                 setAiSummary(data.summary);
             }} className="btn-primary" style={{ width: '100%', height: 60 }}>Analyze Now</button>
          </div>
        </div>
      )}
    </div>
  );
}
