import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { format, isPast, parseISO } from 'date-fns';
import AttendanceCard from '../components/AttendanceCard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/tasks/dashboard');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (loading) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  const { stats, tasks = [], overdueTasks = [], projects = [] } = data || {};

  const statusColor = { todo: 'var(--status-todo)', in_progress: 'var(--accent-light)', done: 'var(--success)' };
  const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

  return (
    <div className="page-container animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">Here's what's happening with your tasks today.</p>
        </div>
        <div className="avatar avatar-lg">{initials}</div>
      </div>

      {/* Punch In / Out */}
      <div style={{ marginBottom: '28px', maxWidth: '520px' }}>
        <AttendanceCard compact />
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats?.total ?? 0}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">🔄</div>
          <div className="stat-value">{stats?.in_progress ?? 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats?.done ?? 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{stats?.overdue ?? 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--priority-high)' }}>
          <div className="stat-icon">🔴</div>
          <div className="stat-value">{stats?.high_priority ?? 0}</div>
          <div className="stat-label">High Priority</div>
        </div>
      </div>

      {/* Analytics Overview */}
      {stats?.total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          {/* Status Progress */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">Status Overview</h3>
              <span className="text-sm text-muted">
                {stats.done} of {stats.total} done
              </span>
            </div>
            <div className="progress-bar" style={{ marginTop: '12px' }}>
              <div className="progress-fill" style={{ width: `${(stats.done / stats.total) * 100}%`, background: 'var(--success)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.8rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>To Do: <strong style={{ color: 'var(--text-primary)' }}>{stats.todo}</strong></div>
              <div style={{ color: 'var(--text-secondary)' }}>In Progress: <strong style={{ color: 'var(--text-primary)' }}>{stats.in_progress}</strong></div>
              <div style={{ color: 'var(--text-secondary)' }}>Done: <strong style={{ color: 'var(--text-primary)' }}>{stats.done}</strong></div>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">Priority Breakdown</h3>
              <span className="text-sm text-muted">Total Tasks</span>
            </div>
            <div className="progress-bar" style={{ marginTop: '12px', display: 'flex', background: 'var(--bg-input)' }}>
              {tasks.filter(t => t.priority === 'high').length > 0 && (
                <div style={{ height: '100%', width: `${(tasks.filter(t => t.priority === 'high').length / stats.total) * 100}%`, background: 'var(--priority-high)' }} />
              )}
              {tasks.filter(t => t.priority === 'medium').length > 0 && (
                <div style={{ height: '100%', width: `${(tasks.filter(t => t.priority === 'medium').length / stats.total) * 100}%`, background: 'var(--priority-medium)' }} />
              )}
              {tasks.filter(t => t.priority === 'low').length > 0 && (
                <div style={{ height: '100%', width: `${(tasks.filter(t => t.priority === 'low').length / stats.total) * 100}%`, background: 'var(--priority-low)' }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.8rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}><span style={{color: 'var(--priority-high)'}}>●</span> High: <strong style={{ color: 'var(--text-primary)' }}>{tasks.filter(t => t.priority === 'high').length}</strong></div>
              <div style={{ color: 'var(--text-secondary)' }}><span style={{color: 'var(--priority-medium)'}}>●</span> Medium: <strong style={{ color: 'var(--text-primary)' }}>{tasks.filter(t => t.priority === 'medium').length}</strong></div>
              <div style={{ color: 'var(--text-secondary)' }}><span style={{color: 'var(--priority-low)'}}>●</span> Low: <strong style={{ color: 'var(--text-primary)' }}>{tasks.filter(t => t.priority === 'low').length}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Overview */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h3 className="section-title">📁 Projects Overview</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
              View All
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {projects.map(project => {
              const total = parseInt(project.total_tasks) || 0;
              const done = parseInt(project.done_tasks) || 0;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div
                  key={project.id}
                  className="card"
                  style={{ cursor: 'pointer', padding: '16px' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{project.name}</div>
                    <span className="badge" style={{ fontSize: '0.65rem' }}>
                      {project.user_role === 'admin' ? '👑' : '👤'}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: '8px' }}>
                    <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--success)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{done}/{total} done</span>
                    {parseInt(project.overdue_tasks) > 0 && (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        {project.overdue_tasks} overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Overdue Tasks */}
        <div>
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h3 className="section-title">⚠️ Overdue Tasks</h3>
            <span className="badge badge-overdue">{overdueTasks.length}</span>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-icon">🎉</div>
                <div className="empty-title">No overdue tasks!</div>
                <div className="empty-desc">You're all caught up.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overdueTasks.map(task => (
                <div
                  key={task.id}
                  className="card"
                  style={{ borderLeft: '3px solid var(--danger)', cursor: 'pointer', padding: '14px 16px' }}
                  onClick={() => navigate(`/projects/${task.project_id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>{task.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📁 {task.project_name}</div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {task.due_date ? format(parseISO(task.due_date), 'MMM d') : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Tasks */}
        <div>
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h3 className="section-title">📝 My Tasks</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tasks.length} total</span>
          </div>
          {tasks.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-icon">📭</div>
                <div className="empty-title">No tasks assigned</div>
                <div className="empty-desc">Tasks assigned to you will appear here.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {tasks.slice(0, 8).map(task => {
                const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                return (
                  <div
                    key={task.id}
                    className="card"
                    style={{ padding: '12px 14px', cursor: 'pointer', borderLeft: `3px solid ${statusColor[task.status]}` }}
                    onClick={() => navigate(`/projects/${task.project_id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          📁 {task.project_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span>
                        {task.due_date && (
                          <span style={{ fontSize: '0.68rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
