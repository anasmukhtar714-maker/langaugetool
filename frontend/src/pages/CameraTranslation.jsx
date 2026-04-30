import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import { analyzeVision } from '../services/api';

const CameraTranslation = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [targetLang, setTargetLang] = useState('ar'); // ar or zh
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        processImage(reader.result, targetLang);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Image, lang) => {
    setLoading(true);
    setResult('');
    try {
      const data = await analyzeVision(base64Image, lang);
      setResult(data.analysis);
      
      // Save to log
      const log = JSON.parse(localStorage.getItem('deal_log') || '[]');
      log.unshift({ id: Date.now(), type: 'camera', original: 'Document Scan', translated: data.analysis, timestamp: new Date().toISOString() });
      localStorage.setItem('deal_log', JSON.stringify(log.slice(0, 100)));

    } catch (err) {
      setResult('Error processing document. Please try again.');
    }
    setLoading(false);
  };

  const reset = () => {
    setImage(null);
    setResult('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F0F2F5', height: '100%' }}>
      
      {/* Header Area */}
      <div style={{ padding: '24px 20px', background: 'var(--saudi-green-gradient)', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
          <FileText style={{ verticalAlign: 'middle', marginRight: 8 }} /> Document Scanner
        </h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Scan Contracts, Invoices, or Price Lists</p>
      </div>

      <main style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        {!image ? (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ 
              background: '#fff', borderRadius: 24, padding: 40, textAlign: 'center', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '2px dashed #D4AF37' 
            }}>
              <div style={{ 
                width: 80, height: 80, background: '#FDF7E7', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
              }}>
                <Camera size={32} color="#D4AF37" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Take a Photo</h3>
              <p style={{ fontSize: 14, color: '#666', marginTop: 8, lineHeight: 1.5 }}>
                Point your camera at a Chinese invoice or Arabic contract to translate instantly.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 30 }}>
                <button 
                  onClick={() => { setTargetLang('ar'); fileInputRef.current.click(); }}
                  style={{ flex: '1 1 140px', padding: '14px', background: 'var(--saudi-green-gradient)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                   🇸🇦 To Arabic
                </button>
                <button 
                  onClick={() => { setTargetLang('zh'); fileInputRef.current.click(); }}
                  style={{ flex: '1 1 140px', padding: '14px', background: 'var(--zh-red-gradient)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                   🇨🇳 To Chinese
                </button>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
            </div>

            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.05)' }}>
              <CheckCircle size={20} color="var(--saudi-green)" />
              <p style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>Supports contracts & price lists</p>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Image Preview Card */}
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', height: 200, marginBottom: 20 }}>
              <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}></div>
              <div style={{ position: 'absolute', bottom: 15, left: 15, color: '#fff' }}>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                  Captured Document
                </span>
              </div>
            </div>

            {/* Result Card */}
            <div style={{ 
              background: '#fff', borderRadius: 24, padding: 24, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)',
              minHeight: 200
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Loader2 size={32} className="recording-ar" style={{ margin: '0 auto 10px', color: 'var(--saudi-green)' }} />
                  <p style={{ fontWeight: 600, color: '#666' }}>Analyzing document...</p>
                </div>
              ) : (
                <div dir={targetLang === 'ar' ? 'rtl' : 'ltr'}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
                      <FileText size={18} color="var(--gold)" />
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#1A1A1A' }}>TRANSLATED DOCUMENT</span>
                   </div>
                   <div style={{ fontSize: 15, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {result || "Waiting for analysis..."}
                   </div>
                </div>
              )}
            </div>

            <button 
              onClick={reset}
              style={{
                width: '100%', marginTop: 20, padding: '16px', background: '#fff', color: '#1A1A1A',
                border: '1px solid #ddd', borderRadius: 20, fontWeight: 700, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer'
              }}
            >
              <RefreshCw size={18} /> Rescan New Document
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CameraTranslation;
