import { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Globe, LogOut, ChevronDown, Sparkles, X, Square } from 'lucide-react';
import { translateAudio, analyzeHistory, speakText } from '../services/api';

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
  
  const [status, setStatus] = useState('');
  
  // Audio Recording State
  const [recordingLang, setRecordingLang] = useState(null); // Which language code is currently recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const scrollRef = useRef(null);

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

  const startRecording = async (activeLangObj) => {
    // Unlock iOS Audio play early
    const audioNode = document.getElementById('global-audio');
    if (audioNode) audioNode.play().catch(() => {});

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Stop all tracks in stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        setStatus('Translating with AI...');
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
           let base64String = reader.result;
           const targetLangObj = activeLangObj.code === langA.code ? langB : langA;
           
           try {
             // Hit the new LLM Audio Pipeline
             const res = await translateAudio(base64String, mimeType, activeLangObj.code, targetLangObj.code);
             
             if (res && res.translation) {
                setMessages(p => [...p, { 
                  id: Date.now(), 
                  speaker: activeLangObj.code, 
                  original: res.original || "(Captured Audio)", 
                  translated: res.translation, 
                  flag: activeLangObj.flag 
                }]);
                
                speak(res.translation, targetLangObj.code);
             }
           } catch (error) {
              console.error(error);
           }
           setStatus('');
           setRecordingLang(null);
        };
      };

      recorder.start();
      setRecordingLang(activeLangObj.code);
      setStatus(`Recording ${activeLangObj.label}...`);

    } catch (err) {
      console.error(err);
      setStatus('Mic Permission Denied');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setStatus('Processing...');
    }
  };

  const handleActionClick = (clickedLangObj) => {
     if (recordingLang === clickedLangObj.code) {
         // Stop recording
         stopRecording();
     } else if (!recordingLang) {
         // Start recording
         startRecording(clickedLangObj);
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

      {/* Language Bar */}
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

      {/* Chat Area */}
      <main ref={scrollRef} className="container hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 340px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '35vh', flexDirection: 'column', color: '#ddd', textAlign: 'center' }}>
            <Globe size={120} style={{ opacity: 0.08, marginBottom: 25 }}/>
            <p style={{ fontWeight: 900, fontSize: 24, color: '#aaa' }}>Global Conversation</p>
            <p style={{ fontSize: 14 }}>Tap to record audio. Tap again to send.</p>
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

      {/* FIXED ACTION AREA */}
      <div className="chat-input-bar" style={{ height: 'auto', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
         <div className="container">
            {status && <div className="flex-center pulse" style={{ marginBottom: 15, fontSize: 16, fontWeight: 900, color: '#006C35' }}>{status}</div>}
            <div className="mobile-stack">
               <button 
                 onClick={() => handleActionClick(langA)}
                 disabled={recordingLang && recordingLang !== langA.code}
                 className={`btn-primary ${recordingLang === langA.code ? 'pulse' : ''}`}
                 style={{ 
                    flex: 1, height: 120, 
                    background: recordingLang === langA.code ? '#111' : 'var(--saudi-green-gradient)', 
                    borderRadius: 30, fontSize: 24, boxShadow: '0 15px 35px rgba(0,108,53,0.2)' 
                 }}
               >
                  {recordingLang === langA.code ? <Square size={42} fill="#fff"/> : <Mic size={42} />} 
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, fontWeight: 900 }}>{recordingLang === langA.code ? 'Stop' : `Talk ${langA.label}`}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{recordingLang === langA.code ? 'Analyzing...' : 'Tap to Record'}</span>
                  </div>
               </button>
               <button 
                 onClick={() => handleActionClick(langB)}
                 disabled={recordingLang && recordingLang !== langB.code}
                 className={`btn-primary ${recordingLang === langB.code ? 'pulse' : ''}`}
                 style={{ 
                    flex: 1, height: 120, 
                    background: recordingLang === langB.code ? '#111' : 'var(--zh-red-gradient)', 
                    borderRadius: 30, fontSize: 24, boxShadow: '0 15px 35px rgba(238,28,37,0.2)' 
                 }}
               >
                  {recordingLang === langB.code ? <Square size={42} fill="#fff"/> : <Mic size={42} />}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, fontWeight: 900 }}>{recordingLang === langB.code ? 'Stop' : `Talk ${langB.label}`}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{recordingLang === langB.code ? 'Analyzing...' : 'Tap to Record'}</span>
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
