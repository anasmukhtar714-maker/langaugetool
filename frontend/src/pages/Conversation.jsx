import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Share2, Trash2, Globe, PlayCircle, LogOut, ChevronDown, Sparkles, Volume2, Info, X } from 'lucide-react';
import { BottomNav } from '../App';

const API_BASE = import.meta.env.VITE_API_URL || "https://web-production-c92ac.up.railway.app";

const SYSTEM_LANGS = [
  { code: 'ur', label: 'Urdu', flag: '🇵🇰', locale: 'ur-PK' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'en', label: 'English', flag: '🇺🇸', locale: 'en-US' },
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
  const recognitionRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('deal_chat_v5', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (messages.length === 0) return;
      try {
        const res = await fetch(`${API_BASE}/analyze-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: messages.slice(-15) })
        });
        const data = await res.json();
        setAiSummary(data.summary);
      } catch (err) {}
    };
    fetchSummary();
  }, []);

  const speak = async (text, lang) => {
    try {
      const res = await fetch(`${API_BASE}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang })
      });
      const data = await res.json();
      if (data.audio) {
        new Audio(`data:audio/mp3;base64,${data.audio}`).play().catch(() => {});
      }
    } catch (err) {}
  };

  const translate = async (text, source, target) => {
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, target }),
    });
    const data = await res.json();
    return data.translation || "(Error)";
  };

  const startRecognition = (active, target) => {
    if (recording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.Recognition;
    if (!SpeechRecognition) return;

    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang = active.locale;
    r.continuous = false;

    setRecording(active.code);
    setStatus(`Listening to ${active.label}...`);

    r.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      setStatus('Translating...');
      const trans = await translate(text, active.code, target.code);
      setMessages(p => [...p, { id: Date.now(), speaker: active.code, original: text, translated: trans, flag: active.flag }]);
      speak(trans, target.code);
      setStatus('');
    };

    r.onend = () => { setRecording(null); setStatus(''); };
    r.start();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header className="glass-header" style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="action-btn" onClick={onLogout} style={{ color: '#E53935', background: '#fff' }}><LogOut size={18} /></button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 900 }}>AI Companion</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {aiSummary && (
            <button className="action-btn" onClick={() => setShowAiModal(true)} style={{ background: 'var(--saudi-green)', color: '#fff', borderRadius: '50%', width: 36, height: 36, animation: 'pulse 2s infinite' }}>
              <Sparkles size={18}/>
            </button>
          )}
          <button className="action-btn" onClick={() => {if(confirm('Clear session?')) setMessages([])}} style={{ background: '#f8f9fa' }}><Trash2 size={16}/></button>
          <button className="action-btn" style={{ background: '#f8f9fa' }} onClick={() => {
             const log = messages.map(m => `${m.flag} ${m.original}\n✨ ${m.translated}`).join('\n\n');
             window.open(`https://wa.me/?text=${encodeURIComponent(log)}`);
          }}><Share2 size={16}/></button>
        </div>
      </header>

      {/* Optimized Language Bar - Larger and cleaner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '15px 20px', background: '#fff', borderBottom: '1px solid #f1f3f5' }}>
        <div style={{ flex: '1 1 150px', position: 'relative' }}>
          <select value={langA.code} onChange={(e) => setLangA(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid #eee', background: '#fcfcfc', fontWeight: 900, fontSize: 14, color: '#000', appearance: 'none' }}>
            {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 18, opacity: 0.3 }}/>
        </div>
        <div style={{ display: 'none', alignItems: 'center', opacity: 0.2 }} id="desktop-globe"><Globe size={18}/></div>
        <div style={{ flex: '1 1 150px', position: 'relative' }}>
          <select value={langB.code} onChange={(e) => setLangB(SYSTEM_LANGS.find(l => l.code === e.target.value))} style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid #eee', background: '#fcfcfc', fontWeight: 900, fontSize: 14, color: '#000', appearance: 'none' }}>
            {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 18, opacity: 0.3 }}/>
        </div>
      </div>

      {/* Main Chat Area - Now maximized */}
      <main ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '220px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.2 }}>
             <Globe size={80} style={{ marginBottom: 20 }}/>
             <h2 style={{ fontWeight: 900 }}>Ready to Talk</h2>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.speaker === langA.code ? 'flex-end' : 'flex-start', maxWidth: '85%', animation: 'slideInUp 0.3s' }}>
            <div style={{ background: m.speaker === langA.code ? '#006C35' : '#f1f3f5', color: m.speaker === langA.code ? '#fff' : '#000', padding: '14px 18px', borderRadius: 24, fontSize: 16, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              {m.original}
            </div>
            {m.translated && (
              <div style={{ marginTop: 8, background: '#fff', border: '1px solid #eee', padding: '12px 16px', borderRadius: 18, fontSize: 15, display: 'flex', alignItems: 'center', gap: 12 }}>
                 <span style={{ flex: 1, fontWeight: 600 }}>{m.translated}</span>
                 <button onClick={() => speak(m.translated, m.speaker === langA.code ? langB.code : langA.code)} style={{ background: '#006C35', color: '#fff', border: 'none', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlayCircle size={16}/>
                 </button>
              </div>
            )}
          </div>
        ))}
        {status && <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#006C35' }}>{status}</div>}
      </main>

      {/* AI Intelligence Modal - Clean Overlay */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
           <div style={{ background: '#fff', width: '100%', maxWidth: 400, borderRadius: 32, padding: 30, position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <button onClick={() => setShowAiModal(false)} style={{ position: 'absolute', right: 20, top: 20, background: '#f1f3f5', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18}/></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                 <div style={{ background: 'var(--saudi-green-gradient)', padding: 10, borderRadius: 14 }}><Sparkles size={24} color="#fff"/></div>
                 <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900 }}>AI Analysis</h3>
                    <p style={{ fontSize: 11, opacity: 0.5, fontWeight: 800 }}>BUSINESS INTELLIGENCE</p>
                 </div>
              </div>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6, fontWeight: 600, fontStyle: 'italic', background: '#f8f9fa', padding: 20, borderRadius: 20 }}>"{aiSummary}"</p>
              <button onClick={() => setShowAiModal(false)} style={{ width: '100%', marginTop: 25, padding: '15px', background: 'var(--saudi-green-gradient)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, cursor: 'pointer' }}>GOT IT, THANKS!</button>
           </div>
        </div>
      )}

      {/* Unified Action Buttons - Large and clear */}
      <footer style={{ position: 'fixed', bottom: 75, left: 0, right: 0, zIndex: 1000, background: '#fff', padding: '15px', borderTop: '1px solid #eee' }}>
          <div className="action-button-container" style={{ display: 'flex', flexDirection: window.innerWidth < 640 ? 'column' : 'row', gap: 10 }}>
            <button 
              onClick={() => startRecognition(langA, langB)} 
              disabled={!!recording}
              style={{ flex: 1, height: 75, background: recording === langA.code ? '#1A1A1A' : 'var(--saudi-green)', color: '#fff', borderRadius: 20, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,108,53,0.15)' }}
            >
              <Mic size={24}/> <span style={{ fontWeight: 900, fontSize: 13 }}>Talk {langA.label}</span>
            </button>
            <button 
              onClick={() => startRecognition(langB, langA)} 
              disabled={!!recording}
              style={{ flex: 1, height: 75, background: recording === langB.code ? '#1A1A1A' : '#EE1C25', color: '#fff', borderRadius: 20, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 8px 20px rgba(238,28,37,0.15)' }}
            >
              <Mic size={24}/> <span style={{ fontWeight: 900, fontSize: 13 }}>Talk {langB.label}</span>
            </button>
          </div>
      </footer>
      <BottomNav />
    </div>
  );
}
