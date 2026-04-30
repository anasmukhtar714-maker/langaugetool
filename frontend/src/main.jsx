import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#E53935', fontSize: 24, fontWeight: 900, marginBottom: 20 }}>Something went wrong.</h1>
          <p style={{ color: '#666', marginBottom: 20 }}>The app crashed. Please try refreshing.</p>
          <pre style={{ background: '#f5f5f5', padding: 20, borderRadius: 12, fontSize: 12, textAlign: 'left', maxWidth: '100%', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: 20, padding: '12px 24px', background: '#006C35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }}
          >
            Refresh App
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
