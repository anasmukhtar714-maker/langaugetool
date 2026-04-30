import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Globe, Heart, Sparkles, MapPin, Coffee, Users } from 'lucide-react';

const LandingPage = ({ onUnlock }) => {
  const [demoStep, setDemoStep] = useState(0);
  const navigate = useNavigate();

  const demoSpeeches = useMemo(() => [
    { lang: 'ar', text: 'أهلاً بك في مكة', trans: 'Welcome to Makkah', icon: '🇸🇦' },
    { lang: 'zh', text: '很高兴见到你', trans: 'Nice to meet you', icon: '🇨🇳' },
    { lang: 'en', text: 'How can I help?', trans: 'كيف يمكنني مساعدتك؟', icon: '🇺🇸' }
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoSpeeches.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [demoSpeeches.length]);

  const handleAuth = (e) => {
    e.preventDefault();
    onUnlock();
    navigate('/chat');
  };

  const activeDemo = demoSpeeches[demoStep] || demoSpeeches[0];

  return (
    <div className="app-content-wrapper">
      {/* Header */}
      <nav className="glass-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: '8px', background: 'var(--saudi-green)', borderRadius: 12 }}>
               <Sparkles color="#fff" size={20} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 18 }}>Interpreter<span style={{ color: 'var(--saudi-green)' }}>.AI</span></span>
         </div>
         <button onClick={() => document.getElementById('auth').scrollIntoView({ behavior: 'smooth' })} className="action-btn" style={{ background: 'none', fontWeight: 800 }}>Login</button>
      </nav>

      <div className="container">
        {/* Hero */}
        <section className="landing-hero">
          <div style={{ animation: 'slideInUp 0.6s ease-out' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e8f5e9', padding: '8px 16px', borderRadius: 100, marginBottom: 25 }}>
               <Heart size={16} color="var(--saudi-green)" />
               <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--saudi-green)', textTransform: 'uppercase' }}>Live Voice Translation</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, marginBottom: 24 }}>
               تحدث مع العالم <br/>
               <span style={{ color: 'var(--saudi-green)' }}>Everywhere</span> You Go.
            </h1>
            <p style={{ fontSize: 18, color: '#666', lineHeight: 1.6, marginBottom: 40 }}>
               Break language barriers instantly. Professional voice interpretation for business meetings, travel, and logistics.
            </p>
            <button onClick={() => document.getElementById('auth').scrollIntoView({ behavior: 'smooth' })} className="btn-primary" style={{ padding: '20px 40px', fontSize: 18, boxShadow: '0 20px 40px rgba(0,108,53,0.15)' }}>
                Get Started Free
            </button>
          </div>

          <div className="flex-center" style={{ animation: 'slideInUp 0.8s ease-out' }}>
             <div className="glass-card" style={{ background: '#0D1117', padding: 30, width: '100%', maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                   <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div className="pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50' }}></div>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#999', letterSpacing: 2 }}>VOICE ACTIVE</span>
                   </div>
                   <Mic size={18} color="var(--saudi-green)" />
                </div>

                <div key={demoStep} style={{ minHeight: 120 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 900, marginBottom: 8 }}>
                       {activeDemo.icon} Live Translation
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
                       "{activeDemo.text}"
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#999', borderTop: '1px solid #333', paddingTop: 15 }}>
                       ✨ {activeDemo.trans}
                    </div>
                </div>
             </div>
          </div>
        </section>

        {/* Benefits */}
        <section style={{ padding: '60px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: <MapPin size={24} color="var(--saudi-green)"/>, title: "Travel & Logistics", desc: "Talk to drivers and vendors instantly in Arabic, Chinese, or English." },
              { icon: <Coffee size={24} color="#EE1C25"/>, title: "Business Meetings", desc: "Clear communication for trade deals and negotiations without a human translator." },
              { icon: <Users size={24} color="var(--gold)"/>, title: "Global Network", desc: "Connect with partners across the globe using real-time AI interpreted speech." }
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ padding: 40 }}>
                 <div style={{ width: 50, height: 50, background: '#f8f9fa', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    {item.icon}
                 </div>
                 <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>{item.title}</h3>
                 <p style={{ color: '#666', lineHeight: 1.6, fontSize: 15 }}>{item.desc}</p>
              </div>
            ))}
        </section>
      </div>

      {/* Auth */}
      <section id="auth" style={{ padding: '80px 0', background: '#F8F9FA' }}>
         <div className="container flex-center">
            <div className="glass-card" style={{ padding: 40, width: '100%', maxWidth: 450, textAlign: 'center' }}>
               <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 16 }}>Ready to Begin?</h2>
               <p style={{ color: '#666', marginBottom: 30 }}>Secure access for partners. One tap away from global communication.</p>
               <button onClick={handleAuth} className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: 18 }}>
                  Unlock Full Access
               </button>
            </div>
         </div>
      </section>

      <footer style={{ padding: '40px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
        © 2026 Global Interpreter AI. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
