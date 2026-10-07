import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Communications from './pages/Communications';
import ProcessEmail from './pages/ProcessEmail';
import Companies from './pages/Companies';
import './App.css';

const NAV = [
  { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
  { id: 'process', label: '✉️ Process Email', icon: '✉️' },
  { id: 'communications', label: '📨 Communications', icon: '📨' },
  { id: 'tasks', label: '✅ Tasks', icon: '✅' },
  { id: 'companies', label: '🏢 Companies', icon: '🏢' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard />;
      case 'process':       return <ProcessEmail />;
      case 'communications':return <Communications />;
      case 'tasks':         return <Tasks />;
      case 'companies':     return <Companies />;
      default:              return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, system-ui, sans-serif', background: '#f0f2f5' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1a1f2e', color: '#fff', padding: '0',
        display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #2d3447' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4f9cf9' }}>📬 CRM AI</div>
          <div style={{ fontSize: 12, color: '#8892a4', marginTop: 4 }}>Email Workflow Automation</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 20px', background: page === n.id ? '#4f9cf9' : 'transparent',
                color: page === n.id ? '#fff' : '#8892a4', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: page === n.id ? 600 : 400,
                transition: 'all 0.15s',
                borderLeft: page === n.id ? '3px solid #fff' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (page !== n.id) { e.target.style.background = '#2d3447'; e.target.style.color = '#fff'; } }}
              onMouseLeave={e => { if (page !== n.id) { e.target.style.background = 'transparent'; e.target.style.color = '#8892a4'; } }}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #2d3447', fontSize: 11, color: '#4d5568' }}>
          FastAPI + React + MySQL<br/>
          AI-Powered CRM v2.0
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {renderPage()}
      </main>
    </div>
  );
}
