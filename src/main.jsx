import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0A0A0F',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif', color: '#f87171', padding: 40
        }}>
          <div style={{ maxWidth: 500, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#fff' }}>
              Qualcosa è andato storto
            </div>
            <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(244,63,94,0.1)', padding: 16, borderRadius: 12, textAlign: 'left', wordBreak: 'break-all' }}>
              {this.state.error?.message || 'Errore sconosciuto'}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
