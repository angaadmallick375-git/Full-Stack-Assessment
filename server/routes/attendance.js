const express = require('express');
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { requireGlobalAdmin } = require('../middleware/roles');

const router = express.Router();

const formatDuration = (punchIn, punchOut) => {
  const start = new Date(punchIn);
  const end = punchOut ? new Date(punchOut) : new Date();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalMinutes: Math.floor(diffMs / (1000 * 60)) };
};

const enrichRecord = (row) => {
  const duration = formatDuration(row.punch_in, row.punch_out);
  return {
    ...row,
    duration_hours: duration.hours,
    duration_minutes: duration.minutes,
    duration_total_minutes: duration.totalMinutes,
    is_active: !row.punch_out,
  };
};

// GET /api/attendance/status - current punch status for logged-in user
router.get('/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as user_name
       FROM attendance_records a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1 AND a.punch_out IS NULL
       ORDER BY a.punch_in DESC
       LIMIT 1`,
      [req.user.id]
    );

    const activeSession = result.rows[0] ? enrichRecord(result.rows[0]) : null;

    // Today's completed sessions summary
    const todaySummary = await pool.query(
      `SELECT COUNT(*) as sessions_today,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(punch_out, NOW()) - punch_in)) / 60
        ), 0) as total_minutes_today
       FROM attendance_records
       WHERE user_id = $1
         AND punch_in::date = CURRENT_DATE`,
      [req.user.id]
    );

    res.json({
      isPunchedIn: !!activeSession,
      activeSession,
      today: {
        sessions: parseInt(todaySummary.rows[0].sessions_today) || 0,
        totalMinutes: Math.floor(parseFloat(todaySummary.rows[0].total_minutes_today) || 0),
      },
    });
  } catch (err) {
    console.error('Attendance status error:', err);
    res.status(500).json({ message: 'Server error fetching attendance status.' });
  }
});

// POST /api/attendance/punch-in
router.post('/punch-in', auth, async (req, res) => {
  try {
    const { notes } = req.body;

    const openSession = await pool.query(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND punch_out IS NULL',
      [req.user.id]
    );

    if (openSession.rows.length > 0) {
      return res.status(400).json({ message: 'You are already punched in. Punch out first.' });
    }

    const result = await pool.query(
      `INSERT INTO attendance_records (user_id, punch_in, notes)
       VALUES ($1, NOW(), $2)
       RETURNING *`,
      [req.user.id, notes?.trim() || null]
    );

    const record = enrichRecord(result.rows[0]);
    res.status(201).json({ message: 'Punched in successfully.', record });
  } catch (err) {
    console.error('Punch in error:', err);
    res.status(500).json({ message: 'Server error during punch in.' });
  }
});

// POST /api/attendance/punch-out
router.post('/punch-out', auth, async (req, res) => {
  try {
    const { notes } = req.body;

    const openSession = await pool.query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND punch_out IS NULL ORDER BY punch_in DESC LIMIT 1',
      [req.user.id]
    );

    if (openSession.rows.length === 0) {
      return res.status(400).json({ message: 'You are not punched in. Punch in first.' });
    }

    const session = openSession.rows[0];
    const mergedNotes = notes?.trim()
      ? [session.notes, notes.trim()].filter(Boolean).join(' | ')
      : session.notes;

    const result = await pool.query(
      `UPDATE attendance_records
       SET punch_out = NOW(), notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [mergedNotes, session.id]
    );

    const record = enrichRecord(result.rows[0]);
    res.json({ message: 'Punched out successfully.', record });
  } catch (err) {
    console.error('Punch out error:', err);
    res.status(500).json({ message: 'Server error during punch out.' });
  }
});

// GET /api/attendance/history - user's attendance history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    const userId = req.user.role === 'admin' && req.query.userId
      ? parseInt(req.query.userId)
      : req.user.id;

    if (req.query.userId && parseInt(req.query.userId) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const result = await pool.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM attendance_records a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1
       ORDER BY a.punch_in DESC
       LIMIT $2 OFFSET $3`,
      [userId, Math.min(parseInt(limit) || 30, 100), parseInt(offset) || 0]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM attendance_records WHERE user_id = $1',
      [userId]
    );

    res.json({
      records: result.rows.map(enrichRecord),
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('Attendance history error:', err);
    res.status(500).json({ message: 'Server error fetching attendance history.' });
  }
});

// GET /api/attendance/team - today's team attendance (admin only)
router.get('/team', auth, requireGlobalAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email,
        open_ar.id as session_id,
        open_ar.punch_in,
        open_ar.punch_out,
        open_ar.notes,
        CASE WHEN open_ar.id IS NOT NULL THEN true ELSE false END as is_punched_in
       FROM users u
       LEFT JOIN attendance_records open_ar
         ON open_ar.user_id = u.id AND open_ar.punch_out IS NULL
       ORDER BY u.name ASC`
    );

    const todayStats = await pool.query(
      `SELECT u.id, u.name,
        COUNT(ar.id) FILTER (WHERE ar.punch_in::date = CURRENT_DATE) as sessions_today,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(ar.punch_out, NOW()) - ar.punch_in)) / 60
        ) FILTER (WHERE ar.punch_in::date = CURRENT_DATE), 0) as total_minutes_today
       FROM users u
       LEFT JOIN attendance_records ar ON ar.user_id = u.id AND ar.punch_in::date = CURRENT_DATE
       GROUP BY u.id, u.name
       ORDER BY u.name ASC`
    );

    const statsMap = Object.fromEntries(
      todayStats.rows.map(r => [r.id, { sessions: parseInt(r.sessions_today), totalMinutes: Math.floor(parseFloat(r.total_minutes_today)) }])
    );

    res.json({
      team: result.rows.map(row => ({
        ...row,
        todayStats: statsMap[row.id] || { sessions: 0, totalMinutes: 0 },
        duration: row.punch_in ? enrichRecord({ punch_in: row.punch_in, punch_out: row.punch_out }) : null,
      })),
      punchedInCount: result.rows.filter(r => r.is_punched_in).length,
      totalUsers: result.rows.length,
    });
  } catch (err) {
    console.error('Team attendance error:', err);
    res.status(500).json({ message: 'Server error fetching team attendance.' });
  }
});

module.exports = router;
