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
    if (!SpeechRecognition) return;

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
        setMessages(p => [...p, { id: Date.now(), speaker: active.code, original: text, translated: trans, flag: active.flag }]);
        speak(trans, target.code);
      } catch (err) {}
      setStatus('');
    };

    r.onerror = () => { setRecording(null); setStatus(''); };
    r.onend = () => { setRecording(null); if (status !== 'Translating...') setStatus(''); };
    r.start();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
      <header className="glass-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onLogout} className="action-btn" style={{ color: '#E53935' }}><LogOut size={22} /></button>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>Global AI</h1>
         </div>
         <div style={{ display: 'flex', gap: 12 }}>
             <button onClick={() => setMessages([])} className="action-btn"><Trash2 size={22}/></button>
             <button onClick={() => setShowAiModal(true)} className="action-btn pulse" style={{ background: '#E8F5E9' }}><Sparkles size={22} color="#006C35"/></button>
         </div>
      </header>

      {/* Language Bar - BIGGER */}
      <div style={{ padding: '20px 5%', background: '#fff', borderBottom: '1px solid #eee' }}>
         <div className="container mobile-stack" style={{ gap: 15 }}>
            <div style={{ flex: 1, position: 'relative' }}>
               <select value={langA.code} onChange={(e) => setLangA(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '20px', borderRadius: 20, border: '1px solid #eee', fontWeight: 900, appearance: 'none', background: '#fcfcfc', fontSize: 18 }}>
                  {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
               </select>
               <ChevronDown size={18} style={{ position: 'absolute', right: 18, top: 25, opacity: 0.3 }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
               <select value={langB.code} onChange={(e) => setLangB(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '20px', borderRadius: 20, border: '1px solid #eee', fontWeight: 900, appearance: 'none', background: '#fcfcfc', fontSize: 18 }}>
                  {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
               </select>
               <ChevronDown size={18} style={{ position: 'absolute', right: 18, top: 25, opacity: 0.3 }} />
            </div>
         </div>
      </div>

      {/* Chat Area - BIGGER */}
      <main ref={scrollRef} className="container hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 300px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '30vh', flexDirection: 'column', color: '#ccc', textAlign: 'center' }}>
            <Globe size={110} style={{ opacity: 0.1, marginBottom: 25 }}/>
            <p style={{ fontWeight: 900, fontSize: 22 }}>Ready to Speak</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.speaker === langA.code ? 'chat-bubble-ar' : 'chat-bubble-zh'}`}>
               <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, marginBottom: 8 }}>{m.flag} {SYSTEM_LANGS.find(l => l.code === m.speaker)?.label}</div>
               <div style={{ fontSize: 21, fontWeight: 800 }}>{m.translated}</div>
               <div style={{ fontSize: 15, borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 12, paddingTop: 12, opacity: 0.8, fontWeight: 600 }}>{m.original}</div>
            </div>
          ))
        )}
      </main>

      {/* FIXED ACTION BAR - MASSIVE */}
      <div className="chat-input-bar">
         <div className="container">
            {status && <div className="flex-center" style={{ marginBottom: 20, fontSize: 15, fontWeight: 900, color: '#006C35' }}>{status}</div>}
            <div className="mobile-stack">
               <button 
                 onClick={() => startRecognition(langA, langB)} 
                 disabled={!!recording}
                 className="btn-primary" 
                 style={{ flex: 1, height: 110, background: recording === langA.code ? '#000' : '#006C35', borderRadius: 28, fontSize: 22 }}
               >
                  <Mic size={38} /> <span>Talk {langA.label}</span>
               </button>
               <button 
                 onClick={() => startRecognition(langB, langA)} 
                 disabled={!!recording}
                 className="btn-primary" 
                 style={{ flex: 1, height: 110, background: recording === langB.code ? '#000' : '#EE1C25', borderRadius: 28, fontSize: 22 }}
               >
                  <Mic size={38} /> <span>Talk {langB.label}</span>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
