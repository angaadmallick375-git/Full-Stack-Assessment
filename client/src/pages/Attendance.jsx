import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import AttendanceCard from '../components/AttendanceCard';

const formatDuration = (record) => {
  const h = record.duration_hours ?? 0;
  const m = record.duration_minutes ?? 0;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
};

const Attendance = () => {
  const { isAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [historyRes, teamRes] = await Promise.all([
        api.get('/attendance/history?limit=50'),
        isAdmin ? api.get('/attendance/team') : Promise.resolve(null),
      ]);
      setHistory(historyRes.data.records);
      if (teamRes) setTeam(teamRes.data);
    } catch (err) {
      toast.error('Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track your work hours with punch in and punch out</p>
        </div>
      </div>

      <div style={{ marginBottom: '28px', maxWidth: '520px' }}>
        <AttendanceCard onStatusChange={() => fetchData()} />
      </div>

      {isAdmin && team && (
        <div style={{ marginBottom: '28px' }}>
          <div className="section-header" style={{ marginBottom: '14px' }}>
            <h3 className="section-title">👥 Team Today</h3>
            <span className="badge badge-success">
              {team.punchedInCount} / {team.totalUsers} punched in
            </span>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="attendance-team-header">
              <span>Member</span>
              <span>Status</span>
              <span>Punch In</span>
              <span>Hours Today</span>
            </div>
            {team.team.map(member => (
              <div key={member.id} className="attendance-team-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar avatar-sm">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{member.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.email}</div>
                  </div>
                </div>
                <span className={`badge ${member.is_punched_in ? 'badge-success' : 'badge-member'}`}>
                  {member.is_punched_in ? '🟢 In' : '⚪ Out'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {member.punch_in
                    ? format(parseISO(member.punch_in), 'h:mm a')
                    : '—'}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {member.todayStats?.totalMinutes
                    ? `${Math.floor(member.todayStats.totalMinutes / 60)}h ${member.todayStats.totalMinutes % 60}m`
                    : '0h 0m'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <h3 className="section-title">📋 My History</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {history.length} record{history.length !== 1 ? 's' : ''}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-icon">⏱️</div>
              <div className="empty-title">No attendance records yet</div>
              <div className="empty-desc">Punch in to start tracking your work hours.</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="attendance-history-header">
              <span>Date</span>
              <span>Punch In</span>
              <span>Punch Out</span>
              <span>Duration</span>
              <span>Notes</span>
            </div>
            {history.map(record => (
              <div key={record.id} className="attendance-history-row">
                <span style={{ fontSize: '0.8rem' }}>
                  {format(parseISO(record.punch_in), 'MMM d, yyyy')}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                  {format(parseISO(record.punch_in), 'h:mm a')}
                </span>
                <span style={{ fontSize: '0.8rem', color: record.punch_out ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {record.punch_out
                    ? format(parseISO(record.punch_out), 'h:mm a')
                    : record.is_active ? '🟢 Active' : '—'}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {formatDuration(record)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {record.notes || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
