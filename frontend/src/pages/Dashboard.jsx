import React, { useState, useEffect, useCallback } from 'react';
import { getDashboard, processBatch } from '../services/api';

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_COLOR = {
  pending: '#f59e0b', in_progress: '#3b82f6',
  completed: '#10b981', overdue: '#ef4444',
};
const CAT_LABEL = {
  income_tax: 'Income Tax', gst: 'GST', quotation: 'Quotation',
  invoice: 'Invoice', payment: 'Payment', compliance: 'Compliance', general: 'General',
};
const CAT_COLOR = {
  income_tax: '#6366f1', gst: '#0ea5e9', quotation: '#f59e0b',
  invoice: '#10b981', payment: '#ef4444', compliance: '#8b5cf6', general: '#6b7280',
};

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`,
      minWidth: 140, flex: 1,
    }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color, bg }) {
  return (
    <span style={{
      background: bg || `${color}18`, color: color || '#374151',
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>{text}</span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboard();
      setData(res.data);
      setError('');
    } catch {
      setError('Cannot connect to backend. Make sure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBatch = async () => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await processBatch();
      setBatchResult(res.data);
      await load();
    } catch (e) {
      setBatchResult({ error: e.response?.data?.detail || 'Batch processing failed' });
    } finally {
      setBatchLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      Loading dashboard...
    </div>
  );

  if (error) return (
    <div style={{ padding: 40 }}>
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
        padding: 24, color: '#dc2626',
      }}>
        <strong>⚠️ Connection Error</strong><br />{error}
        <br /><br />
        <code style={{ fontSize: 12 }}>cd backend && uvicorn main:app --reload</code>
      </div>
    </div>
  );

  const stats = data?.stats || {};

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            AI-powered email workflow automation for CA practice
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={load} style={{
            padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb',
            borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#374151',
          }}>
            🔄 Refresh
          </button>
          <button
            onClick={handleBatch}
            disabled={batchLoading}
            style={{
              padding: '8px 20px', background: batchLoading ? '#9ca3af' : '#4f9cf9',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              color: '#fff', fontWeight: 600,
            }}
          >
            {batchLoading ? '⏳ Processing...' : '📨 Process Demo Emails'}
          </button>
        </div>
      </div>

      {/* Batch result */}
      {batchResult && (
        <div style={{
          background: batchResult.error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${batchResult.error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: 10, padding: '16px 20px', marginBottom: 24,
          color: batchResult.error ? '#dc2626' : '#15803d',
        }}>
          {batchResult.error ? (
            <>❌ {batchResult.error}</>
          ) : (
            <>
              ✅ <strong>{batchResult.message}</strong> —{' '}
              {batchResult.tasks_created} tasks created,{' '}
              {batchResult.high_priority} high priority,{' '}
              {batchResult.overdue} overdue
            </>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard label="Companies" value={stats.total_companies || 0} color="#4f9cf9" icon="🏢" />
        <StatCard label="Communications" value={stats.total_communications || 0} color="#6366f1" icon="📨" />
        <StatCard label="Pending Tasks" value={stats.pending_tasks || 0} color="#f59e0b" icon="⏳" />
        <StatCard label="Overdue" value={stats.overdue_tasks || 0} color="#ef4444" icon="⚠️" />
        <StatCard label="Penalty Risk" value={stats.penalty_risk || 0} color="#dc2626" icon="🚨" sub="High risk items" />
        <StatCard label="Completed" value={stats.completed_tasks || 0} color="#10b981" icon="✅" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Risk Alerts */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 16 }}>
            🚨 High Risk Alerts
          </h3>
          {data?.risk_alerts?.length === 0 ? (
            <div style={{ color: '#10b981', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
              ✅ No active risk items
            </div>
          ) : (
            data?.risk_alerts?.map((item, i) => (
              <div key={i} style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '12px 16px', marginBottom: 10,
              }}>
                <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 14 }}>{item.task_title}</div>
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                  🏢 {item.company} &nbsp;|&nbsp; {item.days_overdue} day{item.days_overdue !== 1 ? 's' : ''} overdue
                </div>
                {item.penalty_amount > 0 && (
                  <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                    ⚡ {item.penalty_type}: ₹{item.penalty_amount?.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Category Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            📊 Email Categories
          </h3>
          {Object.keys(data?.category_breakdown || {}).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
              No emails processed yet.<br />Click "Process Demo Emails" to start.
            </div>
          ) : (
            Object.entries(data?.category_breakdown || {}).map(([cat, count]) => {
              const total = stats.total_communications || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>{CAT_LABEL[cat] || cat}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: CAT_COLOR[cat] }}>{count}</span>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                    <div style={{
                      background: CAT_COLOR[cat] || '#6b7280',
                      width: `${pct}%`, height: 6, borderRadius: 4,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent Communications */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
          📨 Recent Communications
        </h3>
        {data?.recent_communications?.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            No communications yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Category', 'Subject', 'Company', 'Priority', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.recent_communications?.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: `${CAT_COLOR[c.category] || '#6b7280'}18`,
                      color: CAT_COLOR[c.category] || '#6b7280',
                      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      {CAT_LABEL[c.category] || c.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.subject || '(no subject)'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{c.company}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge text={c.priority?.toUpperCase()} color={PRIORITY_COLOR[c.priority]} />
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>
                    {c.amount ? `₹${c.amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {c.action_required
                      ? <Badge text="Action Required" color="#ef4444" />
                      : <Badge text="FYI" color="#6b7280" />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Tasks */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
          ✅ Recent Tasks
        </h3>
        {data?.recent_tasks?.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            No tasks yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Task', 'Company', 'Priority', 'Due Date', 'Status', 'Risk'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.recent_tasks?.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '10px 12px', color: '#111827', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{t.company}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge text={t.priority?.toUpperCase()} color={PRIORITY_COLOR[t.priority]} />
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>
                    {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN') : '—'}
                    {t.days_overdue > 0 && (
                      <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 6 }}>
                        (+{t.days_overdue}d)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge
                      text={t.status?.replace('_', ' ').toUpperCase()}
                      color={STATUS_COLOR[t.status]}
                    />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {t.penalty_applicable
                      ? <Badge text={`₹${t.penalty_amount?.toLocaleString('en-IN')}`} color="#dc2626" />
                      : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
