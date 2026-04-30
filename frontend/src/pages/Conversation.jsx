import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Share2, Trash2, Globe, PlayCircle, LogOut, ChevronDown, Sparkles, Volume2, X } from 'lucide-react';
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
      console.error('Speech error:', e.error);
      setStatus(e.error === 'not-allowed' ? 'Access Denied' : 'Retry...');
      setTimeout(() => setStatus(''), 2000);
    };

    r.onend = () => {
      setRecording(null);
      if (status !== 'Translating...') setStatus('');
    };

    r.start();
  };

  return (
    <div className="app-content-wrapper">
      <header className="convo-header">
         <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <button onClick={onLogout} className="action-btn" style={{ color: '#E53935' }}><LogOut size={18} /></button>
               <h1 style={{ fontSize: 18, fontWeight: 900 }}>AI Companion</h1>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setMessages([])} className="action-btn"><Trash2 size={18}/></button>
                <button onClick={() => setShowAiModal(true)} className="action-btn pulse" style={{ background: '#E8F5E9', borderColor: '#C8E6C9' }}><Sparkles size={18} color="var(--saudi-green)"/></button>
            </div>
         </div>
      </header>

      {/* Language Selectors */}
      <div className="convo-header" style={{ borderBottom: '1px solid #eee' }}>
        <div className="container mobile-stack" style={{ padding: '15px 0' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <select value={langA.code} onChange={(e) => setLangA(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid #eee', fontWeight: 900, appearance: 'none' }}>
              {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 18, opacity: 0.3 }}/>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <select value={langB.code} onChange={(e) => setLangB(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid #eee', fontWeight: 900, appearance: 'none' }}>
              {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 18, opacity: 0.3 }}/>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <main ref={scrollRef} className="container hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 0 160px' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '50vh', flexDirection: 'column', color: '#999', textAlign: 'center' }}>
            <Globe size={64} style={{ opacity: 0.1, marginBottom: 20 }}/>
            <p style={{ fontWeight: 800 }}>Ready to Translate</p>
            <p style={{ fontSize: 13 }}>Tap a microphone below to start</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(m => (
              <div key={m.id} style={{ alignSelf: m.speaker === langA.code ? 'flex-end' : 'flex-start', maxWidth: '85%', animation: 'slideInUp 0.3s' }}>
                <div className={m.speaker === langA.code ? 'chat-bubble-ar' : 'chat-bubble-zh'}>
                   <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{m.flag} {SYSTEM_LANGS.find(l => l.code === m.speaker)?.label}</span>
                   </div>
                   <div style={{ fontSize: 16, fontWeight: 700 }}>{m.translated}</div>
                   <div style={{ fontSize: 13, borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 8, paddingTop: 8, opacity: 0.8 }}>{m.original}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Status & Actions */}
      <div className="chat-input-bar">
        <div className="container">
          {status && <div className="flex-center" style={{ marginBottom: 15, fontSize: 12, fontWeight: 900, color: 'var(--saudi-green)' }}>{status}</div>}
          <div className="mobile-stack">
            <button 
              onClick={() => startRecognition(langA, langB)} 
              disabled={!!recording}
              className="btn-primary"
              style={{ flex: 1, height: 90, background: recording === langA.code ? '#1A1A1A' : 'var(--saudi-green)', borderRadius: 24, fontSize: 16, display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              <Mic size={32}/> <span>Talk {langA.label}</span>
            </button>
            <button 
              onClick={() => startRecognition(langB, langA)} 
              disabled={!!recording}
              className="btn-primary"
              style={{ flex: 1, height: 90, background: recording === langB.code ? '#1A1A1A' : '#EE1C25', borderRadius: 24, fontSize: 16, display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              <Mic size={32}/> <span>Talk {langB.label}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Intelligence Modal */}
      {showAiModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, padding: 20 }}>
          <div className="glass-card" style={{ background: '#fff', padding: 30, width: '100%', maxWidth: 500 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 900 }}>AI Business Intelligence</h3>
                <button onClick={() => setShowAiModal(false)} className="action-btn"><X size={18}/></button> 
             </div>
             <p style={{ fontSize: 15, lineHeight: 1.6, color: '#444', marginBottom: 20 }}>
                {aiSummary || "Analysis in progress... Continue your conversation to see live insights."}
             </p>
             <button onClick={async () => {
                 const data = await analyzeHistory(messages);
                 setAiSummary(data.summary);
             }} className="btn-primary" style={{ width: '100%', padding: '15px' }}>Analyze Transcript</button>
          </div>
        </div>
      )}
    </div>
  );
}
