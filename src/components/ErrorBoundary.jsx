import React from 'react';
import { saveErrorLog } from '../database/telemetryRepository.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    saveErrorLog(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1c1916',
          color: '#e6e1d8',
          fontFamily: 'monospace',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#c1442c', marginBottom: '1rem' }}>System Error</h1>
          <p style={{ marginBottom: '2rem', maxWidth: '400px' }}>
            The app encountered an unexpected error. It has been logged for analysis.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#c4821a',
              color: '#1c1916',
              border: 'none',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
