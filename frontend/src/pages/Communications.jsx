import React, { useState, useEffect, useCallback } from 'react';
import { getCommunications } from '../services/api';

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const CAT_COLOR = {
  income_tax: '#6366f1', gst: '#0ea5e9', quotation: '#f59e0b',
  invoice: '#10b981', payment: '#ef4444', compliance: '#8b5cf6', general: '#6b7280',
};
const CAT_LABEL = {
  income_tax: 'Income Tax', gst: 'GST', quotation: 'Quotation',
  invoice: 'Invoice', payment: 'Payment', compliance: 'Compliance', general: 'General',
};

function Badge({ text, color }) {
  return (
    <span style={{
      background: `${color}18`, color, borderRadius: 6,
      padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>{text}</span>
  );
}

export default function Communications() {
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCommunications();
      setComms(res.data);
    } catch {
      setComms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? comms : comms.filter(c => c.category === filter);
  const cats = [...new Set(comms.map(c => c.category).filter(Boolean))];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>📨 Communications</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            All processed email communications
          </p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid #6b7280',
            background: filter === 'all' ? '#6b7280' : '#fff',
            color: filter === 'all' ? '#fff' : '#6b7280',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          All ({comms.length})
        </button>
        {cats.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${CAT_COLOR[cat] || '#6b7280'}`,
              background: filter === cat ? (CAT_COLOR[cat] || '#6b7280') : '#fff',
              color: filter === cat ? '#fff' : (CAT_COLOR[cat] || '#6b7280'),
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            {CAT_LABEL[cat] || cat} ({comms.filter(c => c.category === cat).length})
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 20 }}>
        {/* List */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              No communications yet. Use "Process Email" to add some.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #f3f4f6' }}>
                  {['Category', 'Subject', 'Company', 'Priority', 'Amount', 'Action', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    style={{
                      borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                      background: selected?.id === c.id ? '#eff6ff' : '',
                    }}
                    onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = ''; }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <Badge text={CAT_LABEL[c.category] || c.category} color={CAT_COLOR[c.category] || '#6b7280'} />
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111827' }}>
                      {c.subject || '(no subject)'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>
                      {c.extracted_company || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge text={c.priority?.toUpperCase()} color={PRIORITY_COLOR[c.priority] || '#6b7280'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>
                      {c.extracted_amount ? `₹${c.extracted_amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.action_required
                        ? <Badge text="Required" color="#ef4444" />
                        : <Badge text="FYI" color="#6b7280" />
                      }
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12 }}>
                      {new Date(c.received_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24, position: 'sticky', top: 0, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Communication #{selected.id}</h3>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}
              >×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <Badge text={CAT_LABEL[selected.category]} color={CAT_COLOR[selected.category]} />
              <Badge text={selected.priority?.toUpperCase()} color={PRIORITY_COLOR[selected.priority]} />
              {selected.action_required && <Badge text="Action Required" color="#ef4444" />}
            </div>

            {[
              { label: 'Subject', value: selected.subject },
              { label: 'Sender', value: selected.sender_email },
              { label: 'AI Summary', value: selected.ai_summary },
              { label: 'Extracted Action', value: selected.extracted_action },
              { label: 'Company', value: selected.extracted_company },
              { label: 'Amount', value: selected.extracted_amount ? `₹${selected.extracted_amount.toLocaleString('en-IN')}` : null },
              { label: 'Received', value: selected.received_at ? new Date(selected.received_at).toLocaleString('en-IN') : null },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>{row.label.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: '#374151' }}>{row.value}</div>
              </div>
            ))}

            {selected.message && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 6 }}>ORIGINAL MESSAGE</div>
                <div style={{
                  background: '#f9fafb', borderRadius: 8, padding: 12,
                  fontSize: 12, color: '#374151', lineHeight: 1.6,
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {selected.message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
