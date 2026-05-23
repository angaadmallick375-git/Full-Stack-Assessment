const pool = require('../db/connection');

// Check if user is global admin
const requireGlobalAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Check if user is admin of a specific project
const requireProjectAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Project admin role required.' });
    }

    req.projectRole = result.rows[0].role;
    next();
  } catch (err) {
    console.error('Role middleware error:', err);
    res.status(500).json({ message: 'Server error checking project permissions.' });
  }
};

// Check if user is a member (any role) of a specific project
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    req.projectRole = result.rows[0].role;
    next();
  } catch (err) {
    console.error('Role middleware error:', err);
    res.status(500).json({ message: 'Server error checking project membership.' });
  }
};

module.exports = { requireGlobalAdmin, requireProjectAdmin, requireProjectMember };
