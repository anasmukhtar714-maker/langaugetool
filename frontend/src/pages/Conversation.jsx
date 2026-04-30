import { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Globe, LogOut, ChevronDown, Sparkles, X, Square } from 'lucide-react';
import { analyzeHistory } from '../services/api';

const LANG_A = { code: 'en',    label: 'English', flag: '🇺🇸', locale: 'en-US' };
const LANG_B = { code: 'ar',    label: 'Arabic',  flag: '🇸🇦', locale: 'ar-SA' };
const ALL_LANGS = [LANG_A, LANG_B];

// ✅ INSTANT: Direct Google Translate — no backend, no Gemini, no delay
const directTranslate = async (text, from, to) => {
  const sl = from.startsWith('zh') ? 'zh-CN' : from;
  const tl = to.startsWith('zh')  ? 'zh-CN' : to;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data[0].map(s => s[0]).join('');
};

export default function Conversation({ onLogout }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('deal_chat_v5');
      if (saved && saved !== 'undefined') return JSON.parse(saved);
    } catch(e) {}
    return [];
  });
  const [aiSummary, setAiSummary]   = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const langA = LANG_A;
  const langB = LANG_B;
  const [recording, setRecording]   = useState(null);  // code of who is recording
  const [status,    setStatus]      = useState('');
  const scrollRef        = useRef(null);
  const _recognitionRef  = useRef(null);

  useEffect(() => {
    localStorage.setItem('deal_chat_v5', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const speak = (text, langCode) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const localeMap = {
      'ar': 'ar-SA', 'zh-CN': 'zh-CN', 'ur': 'ur-PK',
      'hi': 'hi-IN', 'fr': 'fr-FR',   'es': 'es-ES',
      'de': 'de-DE', 'en': 'en-US',
    };
    utter.lang   = localeMap[langCode] || 'en-US';
    utter.volume = 1;
    utter.rate   = 0.95;
    window.speechSynthesis.speak(utter);
  };

  // ── Recording controls ──────────────────────────────────────────────────────
  const handleActionClick = (active, target) => {
    if (recording === active.code) {
      stopRecognition();
    } else {
      startRecognition(active, target);
    }
  };

  const stopRecognition = () => {
    if (_recognitionRef.current) {
      _recognitionRef.current.stop();
      _recognitionRef.current = null;
    }
  };

  const startRecognition = (active, target) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('❌ Browser not supported — use Safari on iPhone');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    try {
      const r = new SpeechRecognition();
      _recognitionRef.current = r;
      r.lang            = active.locale;
      r.continuous      = false;
      r.interimResults  = false;
      r.maxAlternatives = 1;

      setRecording(active.code);
      setStatus(`🎤 ${active.flag} Listening…`);

      // ── Got speech result ──────────────────────────────────────────────────
      r.onresult = async (e) => {
        const text = e.results[0][0].transcript.trim();
        if (!text) { setStatus(''); return; }

        setStatus('⚡ Translating…');
        try {
          const translated = await directTranslate(text, active.code, target.code);
          setMessages(prev => [
            ...prev,
            {
              id:         Date.now(),
              speaker:    active.code,
              original:   text,
              translated: translated,
              flag:       active.flag,
            },
          ]);
          speak(translated, target.code);
        } catch (err) {
          console.error('Translation failed:', err);
          setStatus('❌ Translation failed — check internet');
          setTimeout(() => setStatus(''), 3000);
          return;
        }
        setStatus('');
      };

      // ── Errors ────────────────────────────────────────────────────────────
      r.onerror = (err) => {
        console.error('Speech Error:', err.error);
        setRecording(null);
        _recognitionRef.current = null;

        const msgs = {
          'not-allowed':          '🔒 Mic blocked — allow mic in Settings',
          'language-not-supported': `❌ ${active.label} not supported on this browser`,
          'no-speech':            '🔇 No speech detected — try again',
          'network':              '📶 Network error — check connection',
          'audio-capture':        '🎙️ Mic not found',
        };
        setStatus(msgs[err.error] || `❌ Error: ${err.error}`);
        setTimeout(() => setStatus(''), 3500);
      };

      r.onend = () => {
        setRecording(null);
        _recognitionRef.current = null;
        setStatus(prev => prev === `🎤 ${active.flag} Listening…` ? '' : prev);
      };

      r.start();
    } catch (e) {
      console.error(e);
      setStatus('❌ Mic init failed');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <audio id="global-audio" style={{ display: 'none' }} playsInline />

      {/* Header */}
      <header className="glass-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onLogout} className="action-btn" style={{ color: '#E53935' }}><LogOut size={22} /></button>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>AI Companion</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setMessages([])} className="action-btn" title="Clear Chat"><Trash2 size={22}/></button>
          <button onClick={() => setShowAiModal(true)} className="action-btn pulse" style={{ background: '#E8F5E9' }}>
            <Sparkles size={22} color="#006C35"/>
          </button>
        </div>
      </header>

      {/* Language Header Bar - Fixed English ↔ Arabic */}
      <div style={{ padding: '14px 5%', background: '#fff', borderBottom: '1px solid #efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 20 }}>
          <span>{langA.flag}</span><span>{langA.label}</span>
        </div>
        <div style={{ fontSize: 22, color: '#bbb', fontWeight: 300 }}>⇄</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 20 }}>
          <span>{langB.flag}</span><span>{langB.label}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <main ref={scrollRef} className="container hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 340px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '35vh', flexDirection: 'column', color: '#ddd', textAlign: 'center' }}>
            <Globe size={120} style={{ opacity: 0.08, marginBottom: 25 }}/>
            <p style={{ fontWeight: 900, fontSize: 24, color: '#aaa' }}>Two-Way Conversation</p>
            <p style={{ fontSize: 14 }}>Tap a mic button to start speaking</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.speaker === langA.code ? 'chat-bubble-ar' : 'chat-bubble-zh'}`}>
              <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.8, marginBottom: 8 }}>
                {m.flag} {m.speaker === langA.code ? langA.label : langB.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{m.translated}</div>
              <div style={{ fontSize: 15, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 12, paddingTop: 12, opacity: 0.9, fontWeight: 600 }}>{m.original}</div>
            </div>
          ))
        )}
      </main>

      {/* Mic Buttons */}
      <div className="chat-input-bar" style={{ height: 'auto', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        <div className="container">
          {status && (
            <div className="flex-center pulse" style={{ marginBottom: 15, fontSize: 16, fontWeight: 900, color: '#006C35' }}>
              {status}
            </div>
          )}
          <div className="mobile-stack">
            {/* Button A */}
            <button
              onClick={() => handleActionClick(langA, langB)}
              disabled={!!recording && recording !== langA.code}
              className="btn-primary"
              style={{
                flex: 1, height: 120,
                background: recording === langA.code ? '#000' : 'var(--saudi-green-gradient)',
                borderRadius: 30, fontSize: 24,
                boxShadow: '0 15px 35px rgba(0,108,53,0.2)',
                opacity: (!!recording && recording !== langA.code) ? 0.35 : 1,
              }}
            >
              {recording === langA.code
                ? <Square size={42} color="#fff" fill="#fff" className="pulse" />
                : <Mic size={42} />}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, fontWeight: 900 }}>
                  {recording === langA.code ? 'Stop' : `${langA.flag} ${langA.label}`}
                </span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>
                  {recording === langA.code ? 'Tap to finish' : 'Tap to speak'}
                </span>
              </div>
            </button>

            {/* Button B */}
            <button
              onClick={() => handleActionClick(langB, langA)}
              disabled={!!recording && recording !== langB.code}
              className="btn-primary"
              style={{
                flex: 1, height: 120,
                background: recording === langB.code ? '#000' : 'var(--zh-red-gradient)',
                borderRadius: 30, fontSize: 24,
                boxShadow: '0 15px 35px rgba(238,28,37,0.2)',
                opacity: (!!recording && recording !== langB.code) ? 0.35 : 1,
              }}
            >
              {recording === langB.code
                ? <Square size={42} color="#fff" fill="#fff" className="pulse" />
                : <Mic size={42} />}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, fontWeight: 900 }}>
                  {recording === langB.code ? 'Stop' : `${langB.flag} ${langB.label}`}
                </span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>
                  {recording === langB.code ? 'Tap to finish' : 'Tap to speak'}
                </span>
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
                {aiSummary || 'Continue your dialogue. AI is listening for key points…'}
              </p>
            </div>
            <button
              onClick={async () => {
                const data = await analyzeHistory(messages);
                setAiSummary(data.summary);
              }}
              className="btn-primary"
              style={{ width: '100%', height: 75, fontSize: 20 }}
            >
              Refresh AI Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
