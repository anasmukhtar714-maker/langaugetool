import { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Globe, LogOut, ChevronDown, Sparkles, X, Square, Volume2 } from 'lucide-react';
import { analyzeHistory } from '../services/api';

const RAILWAY = import.meta.env.VITE_API_URL || 'https://web-production-c92ac.up.railway.app';

// Pre-warm voices on page load (iOS needs this)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
}

const SYSTEM_LANGS = [
  { code: 'en',    label: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'ar',    label: 'Arabic',  flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'ur',    label: 'Urdu',    flag: '🇵🇰', locale: 'ur-PK' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'hi',    label: 'Hindi',   flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'fr',    label: 'French',  flag: '🇫🇷', locale: 'fr-FR' },
];

// ✅ Fast translation: Google Translate direct → Railway fallback
const directTranslate = async (text, from, to) => {
  const sl = from.startsWith('zh') ? 'zh-CN' : from;
  const tl = to.startsWith('zh')  ? 'zh-CN' : to;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error('gtx failed');
    const data   = await res.json();
    const result = data[0].map(s => s[0]).join('');
    if (!result) throw new Error('empty');
    return result;
  } catch {
    const res  = await fetch(`${RAILWAY}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: from, target: to }),
    });
    const data = await res.json();
    return data.translation || text;
  }
};

// ✅ iOS-safe TTS with voice-load wait + stuck-synthesis fix
const playAudio = (text, lang) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const localeMap = {
    'ar': 'ar-SA', 'en': 'en-US', 'zh-CN': 'zh-CN',
    'ur': 'ur-PK', 'hi': 'hi-IN', 'fr': 'fr-FR',
  };
  const targetLocale = localeMap[lang] || 'en-US';

  const doSpeak = () => {
    const u = new SpeechSynthesisUtterance(text);
    // Pick best available voice for the language
    const voices = window.speechSynthesis.getVoices();
    const match  = voices.find(v => v.lang.startsWith(lang === 'zh-CN' ? 'zh' : lang))
                || voices.find(v => v.lang.startsWith('en')); // fallback to English voice
    if (match) u.voice = match;
    u.lang   = targetLocale;
    u.volume = 1;
    u.rate   = 0.88;
    u.onerror = e => console.warn('TTS error:', e.error);
    window.speechSynthesis.speak(u);

    // iOS bug: synthesis silently pauses — keep it alive
    const resume = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(resume); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 5000);
  };

  // iOS: wait for voices to be ready if not yet loaded
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    setTimeout(doSpeak, 300); // safety fallback
  }
};

export default function Conversation({ onLogout }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('deal_chat_v5');
      if (saved && saved !== 'undefined') return JSON.parse(saved);
    } catch(e) {}
    return [];
  });
  const [aiSummary,   setAiSummary]   = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [langA, setLangA] = useState(SYSTEM_LANGS[0]);
  const [langB, setLangB] = useState(SYSTEM_LANGS[1]);
  const [recording, setRecording] = useState(null);
  const [status,    setStatus]    = useState('');
  const [textFallback, setTextFallback] = useState(null);
  const [typedText,    setTypedText]    = useState('');

  // When language changes, reset recording state
  const changeLangA = (lang) => { stopRecognition(); setTextFallback(null); setTypedText(''); setLangA(lang); };
  const changeLangB = (lang) => { stopRecognition(); setTextFallback(null); setTypedText(''); setLangB(lang); };
  const scrollRef       = useRef(null);
  const recognitionRef  = useRef(null);

  useEffect(() => {
    localStorage.setItem('deal_chat_v5', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Controls ────────────────────────────────────────────────────────────────
  // ⚠️ Do NOT call audio.play() before r.start() — consumes iOS gesture token
  const handleActionClick = (active, target) => {
    setTextFallback(null); // clear any stale text fallback
    setTypedText('');
    if (recording === active.code) stopRecognition();
    else startRecognition(active, target);
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const startRecognition = (active, target) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus('❌ Use Safari on iPhone');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    try {
      const r = new SR();
      recognitionRef.current = r;
      r.lang            = active.locale;
      r.continuous      = false;
      r.interimResults  = false;
      r.maxAlternatives = 1;

      setRecording(active.code);
      setTextFallback(null); // clear fallback if user tries mic again
      setStatus(`🎤 ${active.flag} Listening…`);

      r.onresult = async (e) => {
        const text = e.results[0][0].transcript.trim();
        if (!text) { setStatus(''); return; }
        setStatus('⚡ Translating…');
        try {
          const translated = await directTranslate(text, active.code, target.code);
          setMessages(prev => [...prev, {
            id: Date.now(), speaker: active.code,
            original: text, translated,
            flag: active.flag, targetLang: target.code,
          }]);
          playAudio(translated, target.code);
        } catch {
          setStatus('❌ Translation failed');
          setTimeout(() => setStatus(''), 3000);
          return;
        }
        setStatus('');
      };

      r.onerror = (err) => {
        setRecording(null);
        recognitionRef.current = null;
        const msgs = {
          'not-allowed':            '🔒 Mic blocked — allow in Settings',
          'language-not-supported': null, // handled below with text fallback
          'no-speech':              '🔇 No speech — try again',
          'network':                '📶 Network error',
          'audio-capture':          '🎙️ Mic not found',
        };
        if (err.error === 'language-not-supported') {
          // Show text input so user can type instead
          setStatus('');
          setTextFallback({ active, target });
        } else {
          setStatus(msgs[err.error] || `❌ ${err.error}`);
          setTimeout(() => setStatus(''), 3500);
        }
      };

      r.onend = () => {
        setRecording(null);
        recognitionRef.current = null;
        setStatus(prev => prev.includes('Listening') ? '' : prev);
      };

      r.start();
    } catch (e) {
      setStatus('❌ Mic init failed');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  // Submit typed text as fallback
  const submitTyped = async () => {
    if (!typedText.trim() || !textFallback) return;
    const { active, target } = textFallback;
    setTextFallback(null);
    setTypedText('');
    setStatus('⚡ Translating…');
    try {
      const translated = await directTranslate(typedText.trim(), active.code, target.code);
      setMessages(prev => [...prev, {
        id: Date.now(), speaker: active.code,
        original: typedText.trim(), translated,
        flag: active.flag, targetLang: target.code,
      }]);
      playAudio(translated, target.code);
    } catch { setStatus('❌ Translation failed'); }
    setStatus('');
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
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
          <button onClick={() => setMessages([])} className="action-btn" title="Clear"><Trash2 size={22}/></button>
          <button onClick={() => setShowAiModal(true)} className="action-btn pulse" style={{ background: '#E8F5E9' }}>
            <Sparkles size={22} color="#006C35"/>
          </button>
        </div>
      </header>

      {/* ── Language Selectors ── */}
      <div style={{ padding: '16px 5%', background: '#fff', borderBottom: '1px solid #efefef' }}>
        <div className="mobile-stack" style={{ gap: 12 }}>
          {/* Lang A */}
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={langA.code}
              onChange={e => changeLangA(SYSTEM_LANGS.find(l => l.code === e.target.value))}
              style={{ width: '100%', padding: '18px 20px', borderRadius: 20, border: '2px solid #f0f0f0', fontWeight: 900, appearance: 'none', background: '#fff', fontSize: 17, cursor: 'pointer' }}
            >
              {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: 22, opacity: 0.3, pointerEvents: 'none' }} />
          </div>

          {/* Swap arrow */}
          <div style={{ fontSize: 22, color: '#bbb', display: 'flex', alignItems: 'center' }}>⇄</div>

          {/* Lang B */}
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={langB.code}
              onChange={e => changeLangB(SYSTEM_LANGS.find(l => l.code === e.target.value))}
              style={{ width: '100%', padding: '18px 20px', borderRadius: 20, border: '2px solid #f0f0f0', fontWeight: 900, appearance: 'none', background: '#fff', fontSize: 17, cursor: 'pointer' }}
            >
              {SYSTEM_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: 22, opacity: 0.3, pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* ── Chat messages ── */}
      <main ref={scrollRef} className="container hide-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 340px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '35vh', flexDirection: 'column', textAlign: 'center' }}>
            <Globe size={100} style={{ opacity: 0.07, marginBottom: 20 }}/>
            <p style={{ fontWeight: 900, fontSize: 22, color: '#aaa' }}>Two-Way Conversation</p>
            <p style={{ fontSize: 14, color: '#ccc' }}>Tap a mic button to start speaking</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.speaker === langA.code ? 'chat-bubble-ar' : 'chat-bubble-zh'}`}>
              {/* Speaker label */}
              <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{m.flag} {SYSTEM_LANGS.find(l => l.code === m.speaker)?.label ?? m.speaker}</span>
                {/* 🔊 Replay button */}
                <button
                  onClick={() => playAudio(m.translated, m.targetLang)}
                  style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Volume2 size={14} color="#fff" />
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>Play</span>
                </button>
              </div>
              {/* Translated text (big) */}
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{m.translated}</div>
              {/* Original text (small) */}
              <div style={{ fontSize: 14, borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 10, paddingTop: 10, opacity: 0.85, fontWeight: 500 }}>{m.original}</div>
            </div>
          ))
        )}
      </main>

      {/* ── Mic Buttons ── */}
      <div className="chat-input-bar" style={{ height: 'auto', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        <div className="container">
          {status && (
            <div className="flex-center pulse" style={{ marginBottom: 12, fontSize: 16, fontWeight: 900, color: '#006C35' }}>
              {status}
            </div>
          )}

          {/* Text input fallback for unsupported speech languages */}
          {textFallback && (
            <div style={{ marginBottom: 14, background: '#f9f9f9', borderRadius: 18, padding: '14px 16px', border: '2px solid #e0e0e0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 8 }}>
                🎙️ {textFallback.active.label} mic not supported — type instead:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={typedText}
                  onChange={e => setTypedText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitTyped()}
                  placeholder={`Type in ${textFallback.active.label}…`}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 14, border: '2px solid #ddd', fontSize: 16, outline: 'none' }}
                />
                <button
                  onClick={submitTyped}
                  style={{ padding: '12px 20px', borderRadius: 14, background: '#006C35', color: '#fff', fontWeight: 900, border: 'none', fontSize: 16, cursor: 'pointer' }}
                >
                  ➤
                </button>
                <button
                  onClick={() => { setTextFallback(null); setTypedText(''); }}
                  style={{ padding: '12px 16px', borderRadius: 14, background: '#f0f0f0', border: 'none', fontSize: 16, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <div className="mobile-stack">
            {/* Button A */}
            <button
              onClick={() => handleActionClick(langA, langB)}
              disabled={!!recording && recording !== langA.code}
              className="btn-primary"
              style={{
                flex: 1, height: 115,
                background: recording === langA.code ? '#111' : 'var(--saudi-green-gradient)',
                borderRadius: 28, fontSize: 22,
                boxShadow: '0 12px 30px rgba(0,108,53,0.25)',
                opacity: (!!recording && recording !== langA.code) ? 0.3 : 1,
                transition: 'all 0.2s',
              }}
            >
              {recording === langA.code ? <Square size={38} color="#fff" fill="#fff" className="pulse"/> : <Mic size={38}/>}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>
                  {recording === langA.code ? 'Stop' : `${langA.flag} ${langA.label}`}
                </span>
                <span style={{ fontSize: 12, opacity: 0.75 }}>
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
                flex: 1, height: 115,
                background: recording === langB.code ? '#111' : 'var(--zh-red-gradient)',
                borderRadius: 28, fontSize: 22,
                boxShadow: '0 12px 30px rgba(238,28,37,0.25)',
                opacity: (!!recording && recording !== langB.code) ? 0.3 : 1,
                transition: 'all 0.2s',
              }}
            >
              {recording === langB.code ? <Square size={38} color="#fff" fill="#fff" className="pulse"/> : <Mic size={38}/>}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>
                  {recording === langB.code ? 'Stop' : `${langB.flag} ${langB.label}`}
                </span>
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {recording === langB.code ? 'Tap to finish' : 'Tap to speak'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Modal ── */}
      {showAiModal && (
        <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, padding: 25 }}>
          <div className="glass-card" style={{ padding: 36, width: '100%', maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ fontSize: 22, fontWeight: 900 }}>Intelligence Summary</h3>
              <button onClick={() => setShowAiModal(false)} className="action-btn"><X size={22}/></button>
            </div>
            <div style={{ maxHeight: '55vh', overflowY: 'auto', marginBottom: 26 }} className="hide-scroll">
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#555' }}>
                {aiSummary || 'Start a conversation — AI will analyze key points here.'}
              </p>
            </div>
            <button
              onClick={async () => { const d = await analyzeHistory(messages); setAiSummary(d.summary); }}
              className="btn-primary"
              style={{ width: '100%', height: 70, fontSize: 18 }}
            >
              Refresh AI Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
