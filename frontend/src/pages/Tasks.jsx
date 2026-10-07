import React, { useState, useEffect, useCallback } from 'react';
import { getTasks, updateTaskStatus } from '../services/api';

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_COLOR = {
  pending: '#f59e0b', in_progress: '#3b82f6',
  completed: '#10b981', overdue: '#ef4444',
};
const STATUS_NEXT = {
  pending: ['in_progress', 'completed'],
  in_progress: ['completed'],
  overdue: ['in_progress', 'completed'],
  completed: [],
};

function Badge({ text, color }) {
  return (
    <span style={{
      background: `${color}18`, color: color, borderRadius: 6,
      padding: '3px 10px', fontSize: 11, fontWeight: 700,
    }}>{text}</span>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTasks();
      setTasks(res.data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (taskId, status) => {
    setUpdating(taskId);
    try {
      await updateTaskStatus(taskId, status);
      await load();
    } catch {
      alert('Failed to update task status');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const TABS = [
    { key: 'all', label: 'All', color: '#6b7280' },
    { key: 'overdue', label: '⚠️ Overdue', color: '#ef4444' },
    { key: 'pending', label: 'Pending', color: '#f59e0b' },
    { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { key: 'completed', label: 'Completed', color: '#10b981' },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>✅ Tasks</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Auto-generated tasks from AI email processing
          </p>
        </div>
        <button
          onClick={load}
          style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '7px 16px',
              background: filter === tab.key ? tab.color : '#fff',
              color: filter === tab.key ? '#fff' : tab.color,
              border: `1px solid ${tab.color}`,
              borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          No tasks found. Process some emails to generate tasks.
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #f3f4f6' }}>
                {['#', 'Task', 'Priority', 'Due Date', 'Status', 'Penalty Risk', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{task.id}</td>
                  <td style={{ padding: '14px 16px', maxWidth: 260 }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{task.title}</div>
                    {task.days_overdue > 0 && (
                      <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                        {task.days_overdue} day{task.days_overdue !== 1 ? 's' : ''} overdue
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge text={task.priority?.toUpperCase()} color={PRIORITY_COLOR[task.priority] || '#6b7280'} />
                  </td>
                  <td style={{ padding: '14px 16px', color: '#374151' }}>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-IN')
                      : <span style={{ color: '#9ca3af' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge
                      text={task.status?.replace('_', ' ').toUpperCase()}
                      color={STATUS_COLOR[task.status] || '#6b7280'}
                    />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {task.penalty_applicable ? (
                      <div>
                        <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>
                          ₹{task.penalty_amount?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: 11 }}>{task.penalty_type}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(STATUS_NEXT[task.status] || []).map(nextStatus => (
                        <button
                          key={nextStatus}
                          onClick={() => handleStatus(task.id, nextStatus)}
                          disabled={updating === task.id}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none',
                            cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            background: nextStatus === 'completed' ? '#10b981' : '#3b82f6',
                            color: '#fff', opacity: updating === task.id ? 0.6 : 1,
                          }}
                        >
                          {nextStatus === 'completed' ? '✓ Done' : '→ In Progress'}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
