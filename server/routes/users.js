const express = require('express');
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { requireGlobalAdmin } = require('../middleware/roles');

const router = express.Router();

// GET /api/users - list all users with project/task stats
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
        (SELECT COUNT(DISTINCT pm.project_id) FROM project_members pm WHERE pm.user_id = u.id) as project_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status != 'done') as active_task_count
       FROM users u
       ORDER BY u.name ASC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

// PATCH /api/users/:id/role - update user global role (admin only)
router.patch('/:id/role', auth, requireGlobalAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (admin or member) is required.' });
    }

    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at',
      [role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ message: 'Server error updating user role.' });
  }
});

// GET /api/users/:id - get specific user
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error fetching user.' });
  }
});

module.exports = router;
