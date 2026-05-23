const express = require('express');
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { requireGlobalAdmin, requireProjectAdmin, requireProjectMember } = require('../middleware/roles');

const router = express.Router();

// GET /api/projects - list all projects the user belongs to
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as owner_name, pm.role as user_role,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       JOIN users u ON u.id = p.owner_id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ message: 'Server error fetching projects.' });
  }
});

// POST /api/projects - create a project (global admin only)
router.post('/', auth, requireGlobalAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || '', req.user.id]
    );
    const project = result.rows[0];

    // Add creator as admin member
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, req.user.id, 'admin']
    );

    await client.query('COMMIT');
    res.status(201).json({ project: { ...project, user_role: 'admin', member_count: 1, task_count: 0 } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create project error:', err);
    res.status(500).json({ message: 'Server error creating project.' });
  } finally {
    client.release();
  }
});

// GET /api/projects/:id - get project details
router.get('/:id', auth, requireProjectMember, async (req, res) => {
  try {
    const projectResult = await pool.query(
      `SELECT p.*, u.name as owner_name, pm.role as user_role
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
       WHERE p.id = $1`,
      [req.params.id, req.user.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.role as global_role, pm.role as project_role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY u.name ASC`,
      [req.params.id]
    );

    res.json({
      project: projectResult.rows[0],
      members: membersResult.rows
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ message: 'Server error fetching project.' });
  }
});

// PUT /api/projects/:id - update project (admin only)
router.put('/:id', auth, requireProjectAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name.trim(), description || '', req.params.id]
    );

    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ message: 'Server error updating project.' });
  }
});

// DELETE /api/projects/:id - delete project (admin only)
router.delete('/:id', auth, requireProjectAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ message: 'Server error deleting project.' });
  }
});

// POST /api/projects/:id/members - add member (admin only)
router.post('/:id/members', auth, requireProjectAdmin, async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const memberRole = role === 'admin' ? 'admin' : 'member';

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
      [req.params.id, userId, memberRole]
    );

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role as global_role, pm.role as project_role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [req.params.id, userId]
    );

    // Log Activity
    await pool.query(
      'INSERT INTO project_activities (project_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'member_added', `Added member ${result.rows[0].name}`]
    );

    res.status(201).json({ member: result.rows[0] });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ message: 'Server error adding member.' });
  }
});

// PATCH /api/projects/:id/members/:userId - update member project role (admin only)
router.patch('/:id/members/:userId', auth, requireProjectAdmin, async (req, res) => {
  try {
    const { id: projectId, userId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (admin or member) is required.' });
    }

    const project = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (project.rows[0]?.owner_id == userId) {
      return res.status(400).json({ message: 'Cannot change the project owner role.' });
    }

    const result = await pool.query(
      `UPDATE project_members SET role = $1
       WHERE project_id = $2 AND user_id = $3
       RETURNING project_id, user_id, role`,
      [role, projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found in this project.' });
    }

    const member = await pool.query(
      `SELECT u.id, u.name, u.email, u.role as global_role, pm.role as project_role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [projectId, userId]
    );

    await pool.query(
      'INSERT INTO project_activities (project_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [projectId, req.user.id, 'member_role_changed', `Changed ${member.rows[0].name}'s role to ${role}`]
    );

    res.json({ member: member.rows[0] });
  } catch (err) {
    console.error('Update member role error:', err);
    res.status(500).json({ message: 'Server error updating member role.' });
  }
});

// DELETE /api/projects/:id/members/:userId - remove member (admin only)
router.delete('/:id/members/:userId', auth, requireProjectAdmin, async (req, res) => {
  try {
    const { id: projectId, userId } = req.params;

    // Prevent removing the project owner
    const project = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (project.rows[0]?.owner_id == userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }

    const removedUser = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);

    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (removedUser.rows.length > 0) {
      await pool.query(
        'INSERT INTO project_activities (project_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
        [projectId, req.user.id, 'member_removed', `Removed member ${removedUser.rows[0].name}`]
      );
    }

    res.json({ message: 'Member removed successfully.' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ message: 'Server error removing member.' });
  }
});

// GET /api/projects/:id/activities - get project timeline
router.get('/:id/activities', auth, requireProjectMember, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as user_name 
       FROM project_activities a
       JOIN users u ON u.id = a.user_id
       WHERE a.project_id = $1
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    res.json({ activities: result.rows });
  } catch (err) {
    console.error('Get activities error:', err);
    res.status(500).json({ message: 'Server error fetching activities.' });
  }
});

module.exports = router;
