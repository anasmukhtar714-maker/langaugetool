import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Globe, Scan, Heart, ChevronRight, User, Lock, Mail, Sparkles, MessageCircle, Smile, ArrowRight, Eye, EyeOff, Play, MapPin, Coffee, Users } from 'lucide-react';

const LandingPage = ({ onUnlock }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const navigate = useNavigate();

  // Memoize demoSpeeches to keep dependency size constant
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onUnlock();
    navigate('/chat');
  };

  // Safe access to currently active demo
  const activeDemo = demoSpeeches[demoStep] || demoSpeeches[0];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#1a1a1a', overflowX: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Friendly Header */}
      <nav style={{ padding: '20px 8%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 1000, borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--saudi-green-gradient)', padding: 10, borderRadius: 14 }}>
             <Globe size={24} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Global Companion</span>
        </div>
        <button onClick={() => document.getElementById('auth').scrollIntoView({ behavior: 'smooth' })} style={{ color: 'var(--saudi-green)', background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>
          Log In
        </button>
      </nav>

      {/* Hero Section */}
      <section style={{ display: 'flex', flexWrap: 'wrap', padding: '60px 5%', alignItems: 'center', gap: 40, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e8f5e9', padding: '8px 16px', borderRadius: 100, marginBottom: 25 }}>
             <Heart size={16} color="var(--saudi-green)" />
             <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--saudi-green)', textTransform: 'uppercase', letterSpacing: 1 }}>Real-Time Interpreter</span>
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, marginBottom: 24 }}>
             تحدث مع العالم <br/>
             <span style={{ color: 'var(--saudi-green)' }}>Everywhere</span> You Go.
          </h1>
          <p style={{ fontSize: 18, color: '#666', lineHeight: 1.6, marginBottom: 40, maxWidth: 600 }}>
             Forget the language gap. Simple, fast, and secure voice translation for everyone. 
             Bringing people together, one word at a time.
          </p>
          <div style={{ display: 'flex', gap: 15 }}>
             <button onClick={() => document.getElementById('auth').scrollIntoView({ behavior: 'smooth' })} style={{ padding: '18px 36px', background: 'var(--saudi-green-gradient)', color: '#fff', border: 'none', borderRadius: 100, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,108,53,0.15)' }}>
                Get Started Free
             </button>
          </div>
        </div>

        <div style={{ flex: '1 1 300px' }}>
           <div style={{ 
             background: '#0D1117', borderRadius: 32, padding: 30, boxShadow: '0 30px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)',
             animation: 'float 6s infinite ease-in-out'
           }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 10px #4CAF50' }}></div>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#999', letterSpacing: 2 }}>VOICE ACTIVE</span>
                 </div>
                 <Mic size={18} color="var(--saudi-green)" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 3, height: 36, alignItems: 'center' }}>
                       {[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1].map((h, i) => (
                         <div key={i} style={{ width: 3, height: h * 4, background: 'var(--saudi-green)', borderRadius: 2, animation: 'wave 0.8s infinite', animationDelay: `${i * 0.05}s` }}></div>
                       ))}
                    </div>
                 </div>

                 <div key={demoStep}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 900, marginBottom: 8, letterSpacing: 1 }}>
                       {activeDemo.icon} Translation
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
                       "{activeDemo.text}"
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#666', borderTop: '1px solid #333', paddingTop: 15 }}>
                       ✨ {activeDemo.trans}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ padding: '80px 8%', background: '#fcfcfc' }}>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 30, maxWidth: 1200, margin: '0 auto' }}>
            {[
              { icon: <MapPin size={32} color="var(--saudi-green)"/>, title: "Travel Easy", desc: "Never feel lost. Talk to locals, drivers, and helpers in their native tongue." },
              { icon: <Coffee size={32} color="#EE1C25"/>, title: "Order Anything", desc: "Scan menus and talk to restaurants about exactly what you want to eat." },
              { icon: <Users size={32} color="var(--gold)"/>, title: "Global Friends", desc: "Break language barriers and build real human connections across the world." }
            ].map((item, i) => (
              <div key={i} style={{ padding: 40, background: '#fff', borderRadius: 32, border: '1px solid #f0f0f0', transition: '0.3s' }}>
                 <div style={{ width: 64, height: 64, background: '#f8f9fa', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                    {item.icon}
                 </div>
                 <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 15 }}>{item.title}</h3>
                 <p style={{ color: '#666', lineHeight: 1.8 }}>{item.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Auth Portal */}
      <section id="auth" style={{ padding: '80px 8% 100px', background: '#fff' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
           <div style={{ background: '#fff', borderRadius: 44, padding: '50px 40px', boxShadow: '0 40px 100px rgba(0,0,0,0.06)', border: '1px solid #eee' }}>
              <div style={{ textAlign: 'center', marginBottom: 35 }}>
                 <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                 <p style={{ color: '#888', marginTop: 10 }}>Start your conversation in seconds</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                 {!isLogin && <input required placeholder="Name" style={{ padding: '18px', borderRadius: 16, border: '1px solid #eee', background: '#fcfcfc', outline: 'none' }} />}
                 <input required type="email" placeholder="Email" style={{ padding: '18px', borderRadius: 16, border: '1px solid #eee', background: '#fcfcfc', outline: 'none' }} />
                 <input required type={showPassword ? "text" : "password"} placeholder="Password" style={{ padding: '18px', borderRadius: 16, border: '1px solid #eee', background: '#fcfcfc', outline: 'none' }} />
                 {!isLogin && <input required type="password" placeholder="Confirm Password" style={{ padding: '18px', borderRadius: 16, border: '1px solid #eee', background: '#fcfcfc', outline: 'none' }} />}

                 <button type="submit" style={{ padding: '20px', background: 'var(--saudi-green-gradient)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,108,53,0.1)', marginTop: 10 }}>
                    {isLogin ? 'Sign In' : 'Join Now'} <ArrowRight size={20} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
                 </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 30 }}>
                 <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--saudi-green)', fontWeight: 800, cursor: 'pointer' }}>
                    {isLogin ? "New user? Sign up" : "Member? Sign in"}
                 </button>
              </div>
           </div>
        </div>
      </section>

      <footer style={{ padding: '60px 40px', textAlign: 'center', borderTop: '1px solid #f0f0f0', color: '#ccc', fontSize: 12 }}>
          © 2026 Global Companion. Talking together.
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
