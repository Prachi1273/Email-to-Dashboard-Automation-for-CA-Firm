import React, { useState, useEffect } from 'react';
import { processEmail, getCompanies } from '../services/api';

const SAMPLE_EMAILS = [
  {
    label: 'Income Tax Notice (Urgent)',
    subject: 'Urgent: Income Tax Notice - ABC Industries Pvt Ltd',
    message: 'Dear Sir, ABC Industries Pvt Ltd has an outstanding income tax demand of Rs. 1,85,000 for AY 2024-25. Please provide all required documents immediately. Last date to respond is 5 October 2026. Failure to respond will result in penalty proceedings.',
  },
  {
    label: 'GST Demand Notice',
    subject: 'GST Demand Notice - PQR Enterprises',
    message: 'There is a discrepancy of Rs. 75,000 in GSTR-1 vs GSTR-3B for PQR Enterprises. Please submit reconciliation documents immediately. Last date: 10 October 2026. Non-compliance will attract penalty under GST Act.',
  },
  {
    label: 'Quotation Approval',
    subject: 'Quotation Approval Required - MNO Technologies Ltd',
    message: 'Please find attached the quotation for audit services for MNO Technologies Ltd amounting to Rs. 2,50,000. Kindly review and confirm approval by 25 September 2026 so we can raise the purchase order.',
  },
  {
    label: 'Invoice Payment',
    subject: 'Invoice #INV-2026-089 - GHI Corp',
    message: 'Please find Tax Invoice for Rs. 85,000 for professional services to GHI Corp. Payment is due by 30 September 2026. Kindly process the payment and send us the transaction reference.',
  },
  {
    label: 'ROC Compliance',
    subject: 'Annual Return Filing Due - STU Pvt Ltd',
    message: 'Please file Annual Return (MGT-7) and Financial Statements (AOC-4) for STU Pvt Ltd with ROC by 31 October 2026. Non-filing will attract a penalty of Rs. 100 per day. Please send us the draft financials for review.',
  },
];

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const CAT_COLOR = {
  income_tax: '#6366f1', gst: '#0ea5e9', quotation: '#f59e0b',
  invoice: '#10b981', payment: '#ef4444', compliance: '#8b5cf6', general: '#6b7280',
};

export default function ProcessEmail() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ company_id: '', subject: '', sender_email: '', message: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCompanies().then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  const loadSample = (sample) => {
    setForm(f => ({ ...f, subject: sample.subject, message: sample.message }));
    setResult(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.message && !form.subject) {
      setError('Please enter an email subject or message.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = {
        subject: form.subject || null,
        message: form.message || null,
        sender_email: form.sender_email || null,
        company_id: form.company_id ? parseInt(form.company_id) : null,
      };
      const res = await processEmail(payload);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Processing failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, background: '#fafafa', outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 6 }}>✉️ Process Email</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
        Submit any email → AI classifies it, extracts key info, and auto-creates a task.
      </p>

      {/* Sample Emails */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
          📋 Quick Load Sample Email
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SAMPLE_EMAILS.map((s, i) => (
            <button
              key={i}
              onClick={() => loadSample(s)}
              style={{
                padding: '6px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                borderRadius: 20, cursor: 'pointer', fontSize: 13, color: '#374151',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = '#4f9cf9'; e.target.style.color = '#fff'; }}
              onMouseLeave={e => { e.target.style.background = '#f3f4f6'; e.target.style.color = '#374151'; }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Email Form */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Email Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Subject
            </label>
            <input
              style={inputStyle}
              placeholder="Email subject..."
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Sender Email (optional)
            </label>
            <input
              style={inputStyle}
              placeholder="sender@example.com"
              value={form.sender_email}
              onChange={e => setForm(f => ({ ...f, sender_email: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Link to Company (optional)
          </label>
          <select
            style={{ ...inputStyle, background: '#fafafa' }}
            value={form.company_id}
            onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
          >
            <option value="">— Auto-detect from email —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Email Message *
          </label>
          <textarea
            style={{ ...inputStyle, height: 140, resize: 'vertical' }}
            placeholder="Paste the email body here..."
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          />
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: '12px 32px', background: loading ? '#9ca3af' : '#4f9cf9',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 15, fontWeight: 600, width: '100%', transition: 'background 0.15s',
          }}
        >
          {loading ? '⏳ Processing with AI...' : '🤖 Process Email with AI'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 20 }}>
            ✅ Processing Result
          </h3>

          {/* AI Analysis */}
          <div style={{ background: '#f8faff', border: '1px solid #c7d7fd', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: '#1d4ed8', fontSize: 14, marginBottom: 14 }}>🤖 AI Analysis</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Category', value: result.ai_result?.category?.replace('_', ' ').toUpperCase(), color: CAT_COLOR[result.ai_result?.category] },
                { label: 'Priority', value: result.ai_result?.priority?.toUpperCase(), color: PRIORITY_COLOR[result.ai_result?.priority] },
                { label: 'Action Required', value: result.ai_result?.action_required ? 'YES' : 'NO', color: result.ai_result?.action_required ? '#ef4444' : '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: item.color, fontSize: 16 }}>{item.value}</div>
                </div>
              ))}
              {result.ai_result?.company_name && (
                <div style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Company Extracted</div>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>{result.ai_result?.company_name}</div>
                </div>
              )}
              {result.ai_result?.amount && (
                <div style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Amount Extracted</div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 16 }}>₹{result.ai_result?.amount?.toLocaleString('en-IN')}</div>
                </div>
              )}
              {result.ai_result?.deadline && (
                <div style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Deadline</div>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: 14 }}>
                    {new Date(result.ai_result?.deadline).toLocaleDateString('en-IN')}
                  </div>
                </div>
              )}
            </div>
            {result.ai_result?.action && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Action: </span>
                <span style={{ fontWeight: 600, color: '#374151' }}>{result.ai_result?.action}</span>
              </div>
            )}
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>
              <strong>Summary:</strong> {result.ai_result?.summary}
            </div>
          </div>

          {/* Communication saved */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: '#15803d', fontSize: 14 }}>
              💾 Communication #{result.communication?.id} saved to CRM
            </div>
          </div>

          {/* Task created */}
          {result.task ? (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, color: '#92400e', fontSize: 14, marginBottom: 8 }}>
                ✅ Task #{result.task?.id} auto-created
              </div>
              <div style={{ fontSize: 13, color: '#374151' }}>{result.task?.title}</div>
              {result.task?.penalty_applicable && (
                <div style={{ marginTop: 8, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
                  ⚡ Penalty risk: {result.task?.penalty_type} — ₹{result.task?.penalty_amount?.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, color: '#6b7280', fontSize: 13 }}>
              ℹ️ No action required — task not created (FYI email)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
