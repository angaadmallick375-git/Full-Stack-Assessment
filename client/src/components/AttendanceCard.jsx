import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, intervalToDuration } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';

const formatMinutes = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const LiveTimer = ({ punchIn }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const start = new Date(punchIn);
      const now = new Date();
      const dur = intervalToDuration({ start, end: now });
      const parts = [];
      if (dur.hours) parts.push(`${dur.hours}h`);
      if (dur.minutes !== undefined) parts.push(`${dur.minutes}m`);
      if (!dur.hours && dur.seconds !== undefined) parts.push(`${dur.seconds}s`);
      setElapsed(parts.join(' ') || '0s');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [punchIn]);

  return <span className="attendance-timer">{elapsed}</span>;
};

const AttendanceCard = ({ compact = false, onStatusChange }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/attendance/status');
      setStatus(res.data);
      onStatusChange?.(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePunchIn = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/attendance/punch-in', { notes });
      toast.success(res.data.message);
      setNotes('');
      await fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/attendance/punch-out', { notes });
      toast.success(res.data.message);
      setNotes('');
      await fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch out.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`attendance-card ${compact ? 'attendance-card-compact' : ''}`}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  const isPunchedIn = status?.isPunchedIn;
  const session = status?.activeSession;
  const todayMinutes = status?.today?.totalMinutes ?? 0;

  return (
    <div className={`attendance-card ${isPunchedIn ? 'attendance-card-active' : ''} ${compact ? 'attendance-card-compact' : ''}`}>
      <div className="attendance-card-header">
        <div>
          <h3 className="attendance-title">
            {isPunchedIn ? '🟢 On the Clock' : '⏱️ Attendance'}
          </h3>
          {!compact && (
            <p className="attendance-subtitle">
              {isPunchedIn
                ? `Punched in at ${format(parseISO(session.punch_in), 'h:mm a')}`
                : 'Punch in when you start work, punch out when you finish.'}
            </p>
          )}
        </div>
        {isPunchedIn && session && (
          <div className="attendance-live-badge">
            <span className="attendance-pulse" />
            <LiveTimer punchIn={session.punch_in} />
          </div>
        )}
      </div>

      <div className="attendance-stats-row">
        <div className="attendance-stat">
          <span className="attendance-stat-value">{formatMinutes(todayMinutes)}</span>
          <span className="attendance-stat-label">Today</span>
        </div>
        <div className="attendance-stat">
          <span className="attendance-stat-value">{status?.today?.sessions ?? 0}</span>
          <span className="attendance-stat-label">Sessions</span>
        </div>
        <div className="attendance-stat">
          <span className={`attendance-stat-value ${isPunchedIn ? 'text-success' : ''}`}>
            {isPunchedIn ? 'In' : 'Out'}
          </span>
          <span className="attendance-stat-label">Status</span>
        </div>
      </div>

      {!compact && (
        <input
          className="form-input attendance-notes"
          placeholder="Optional note (e.g. WFH, client site...)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      )}

      <div className="attendance-actions">
        {!isPunchedIn ? (
          <button
            className="btn btn-primary attendance-btn-punch-in"
            onClick={handlePunchIn}
            disabled={actionLoading}
          >
            {actionLoading ? 'Punching in...' : '🟢 Punch In'}
          </button>
        ) : (
          <button
            className="btn btn-danger attendance-btn-punch-out"
            onClick={handlePunchOut}
            disabled={actionLoading}
          >
            {actionLoading ? 'Punching out...' : '🔴 Punch Out'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
