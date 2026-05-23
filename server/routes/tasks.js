const express = require('express');
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { requireProjectAdmin, requireProjectMember } = require('../middleware/roles');

const router = express.Router();

// Helper to log project activity
const logActivity = async (projectId, userId, action, details) => {
  try {
    await pool.query(
      'INSERT INTO project_activities (project_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [projectId, userId, action, details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// GET /api/projects/:id/tasks - get all tasks in a project
router.get('/projects/:id/tasks', auth, requireProjectMember, async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    let query = `
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email,
        c.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.project_id = $1
    `;
    const params = [req.params.id];
    let paramIdx = 2;

    if (status) {
      query += ` AND t.status = $${paramIdx++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIdx++}`;
      params.push(priority);
    }
    if (assignee) {
      query += ` AND t.assignee_id = $${paramIdx++}`;
      params.push(assignee);
    }
    if (req.query.search) {
      query += ` AND (t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`;
      params.push(`%${req.query.search}%`);
      paramIdx++;
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ message: 'Server error fetching tasks.' });
  }
});

// POST /api/projects/:id/tasks - create task (admin only)
router.post('/projects/:id/tasks', auth, requireProjectAdmin, async (req, res) => {
  try {
    const { title, description, priority, due_date, assignee_id, blocked_by, tags } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    if (assignee_id) {
      const memberCheck = await pool.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [req.params.id, assignee_id]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Assignee must be a member of this project.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, priority, due_date, project_id, assignee_id, created_by, blocked_by, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title.trim(),
        description || '',
        priority || 'medium',
        due_date || null,
        req.params.id,
        assignee_id || null,
        req.user.id,
        blocked_by || null,
        tags || []
      ]
    );

    const task = result.rows[0];

    // Log Activity
    await logActivity(req.params.id, req.user.id, 'task_created', `Created task "${task.title}"`);

    const fullTask = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json({ task: fullTask.rows[0] });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: 'Server error creating task.' });
  }
});

// PUT /api/tasks/:id - update task (admin or assignee)
router.put('/tasks/:id', auth, async (req, res) => {
  try {
    const taskResult = await pool.query(
      `SELECT t.*, pm.role as user_project_role
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
       WHERE t.id = $1`,
      [req.params.id, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found or access denied.' });
    }

    const task = taskResult.rows[0];
    const isProjectAdmin = task.user_project_role === 'admin';
    const isAssignee = task.assignee_id === req.user.id;

    if (!isProjectAdmin && !isAssignee) {
      return res.status(403).json({ message: 'Only project admins or the assignee can edit this task.' });
    }

    const { title, description, status, priority, due_date, assignee_id, blocked_by, tags } = req.body;

    let updatedTask;
    let activityLog = null;

    if (!isProjectAdmin && isAssignee) {
      const result = await pool.query(
        `UPDATE tasks SET status = COALESCE($1, status), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [status, req.params.id]
      );
      updatedTask = result.rows[0];
      if (status && status !== task.status) {
        activityLog = `Changed status of "${task.title}" to ${status}`;
      }
    } else {
      if (assignee_id) {
        const memberCheck = await pool.query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
          [task.project_id, assignee_id]
        );
        if (memberCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Assignee must be a project member.' });
        }
      }

      const result = await pool.query(
        `UPDATE tasks 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             priority = COALESCE($4, priority),
             due_date = $5,
             assignee_id = $6,
             blocked_by = $7,
             tags = COALESCE($8, tags),
             updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [
          title?.trim() || null,
          description !== undefined ? description : null,
          status || null,
          priority || null,
          due_date !== undefined ? due_date || null : task.due_date,
          assignee_id !== undefined ? assignee_id || null : task.assignee_id,
          blocked_by !== undefined ? blocked_by || null : task.blocked_by,
          tags !== undefined ? tags : task.tags,
          req.params.id
        ]
      );
      updatedTask = result.rows[0];

      if (status && status !== task.status) {
        activityLog = `Changed status of "${task.title}" to ${status}`;
      } else if (blocked_by !== undefined && blocked_by !== task.blocked_by) {
        activityLog = blocked_by ? `Marked "${task.title}" as blocked` : `Removed block from "${task.title}"`;
      } else if (title && title !== task.title) {
        activityLog = `Updated task title to "${title}"`;
      } else {
        activityLog = `Updated task "${task.title}"`;
      }
    }

    if (activityLog) {
      await logActivity(task.project_id, req.user.id, 'task_updated', activityLog);
    }

    const fullTask = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.id = $1`,
      [updatedTask.id]
    );

    res.json({ task: fullTask.rows[0] });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ message: 'Server error updating task.' });
  }
});

// PATCH /api/tasks/:id/status - quick status update
router.patch('/tasks/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    const taskResult = await pool.query(
      `SELECT t.*, pm.role as user_project_role
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
       WHERE t.id = $1`,
      [req.params.id, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found or access denied.' });
    }

    const task = taskResult.rows[0];
    const isProjectAdmin = task.user_project_role === 'admin';
    const isAssignee = task.assignee_id === req.user.id;

    if (!isProjectAdmin && !isAssignee) {
      return res.status(403).json({ message: 'Only project admins or the assignee can update status.' });
    }

    const result = await pool.query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (status !== task.status) {
      await logActivity(task.project_id, req.user.id, 'status_changed', `Moved "${task.title}" to ${status}`);
    }

    const fullTask = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.id = $1`,
      [req.params.id]
    );

    res.json({ task: fullTask.rows[0] });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Server error updating task status.' });
  }
});

// DELETE /api/tasks/:id - delete task (admin only)
router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const taskResult = await pool.query(
      `SELECT t.*, pm.role as user_project_role
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
       WHERE t.id = $1`,
      [req.params.id, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found or access denied.' });
    }

    if (taskResult.rows[0].user_project_role !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can delete tasks.' });
    }
    
    await logActivity(taskResult.rows[0].project_id, req.user.id, 'task_deleted', `Deleted task "${taskResult.rows[0].title}"`);
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
});

// GET /api/tasks/dashboard - get dashboard stats for current user
router.get('/tasks/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // My tasks across all projects
    const myTasks = await pool.query(
      `SELECT t.*, p.name as project_name, u.name as assignee_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
       WHERE t.assignee_id = $1
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
      [userId]
    );

    // Overdue tasks
    const overdue = myTasks.rows.filter(t =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    );

    const stats = {
      total: myTasks.rows.length,
      todo: myTasks.rows.filter(t => t.status === 'todo').length,
      in_progress: myTasks.rows.filter(t => t.status === 'in_progress').length,
      done: myTasks.rows.filter(t => t.status === 'done').length,
      overdue: overdue.length,
      high_priority: myTasks.rows.filter(t => t.priority === 'high' && t.status !== 'done').length
    };

    const recentTasks = myTasks.rows.slice(0, 10);

    // Projects overview for dashboard
    const projectsResult = await pool.query(
      `SELECT p.id, p.name, pm.role as user_role,
        COUNT(t.id) as total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'done') as done_tasks,
        COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'done') as overdue_tasks
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id, p.name, pm.role
       ORDER BY p.name ASC`,
      [userId]
    );

    res.json({
      stats,
      tasks: myTasks.rows,
      overdueTasks: overdue,
      recentTasks,
      projects: projectsResult.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error fetching dashboard data.' });
  }
});


// ==========================================
// TASK COMMENTS ROUTES
// ==========================================

const assertTaskAccess = async (taskId, userId) => {
  const taskResult = await pool.query(
    `SELECT t.project_id, t.title
     FROM tasks t
     JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
     WHERE t.id = $1`,
    [taskId, userId]
  );
  if (taskResult.rows.length === 0) {
    return null;
  }
  return taskResult.rows[0];
};

// GET /api/tasks/:id/comments
router.get('/tasks/:id/comments', auth, async (req, res) => {
  try {
    const task = await assertTaskAccess(req.params.id, req.user.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied.' });
    }

    const result = await pool.query(
      `SELECT c.*, u.name as user_name 
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ message: 'Server error fetching comments.' });
  }
});

// POST /api/tasks/:id/comments
router.post('/tasks/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required.' });
    }

    const taskResult = await assertTaskAccess(req.params.id, req.user.id);
    if (!taskResult) return res.status(404).json({ message: 'Task not found or access denied.' });

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content) 
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content.trim()]
    );

    const fullComment = await pool.query(
      `SELECT c.*, u.name as user_name 
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    // Optional: Log activity for comment
    await logActivity(taskResult.project_id, req.user.id, 'comment_added', `Commented on "${taskResult.title}"`);

    res.status(201).json({ comment: fullComment.rows[0] });
  } catch (err) {
    console.error('Post comment error:', err);
    res.status(500).json({ message: 'Server error posting comment.' });
  }
});

// DELETE /api/tasks/comments/:id
router.delete('/tasks/comments/:id', auth, async (req, res) => {
  try {
    const commentRes = await pool.query('SELECT * FROM task_comments WHERE id = $1', [req.params.id]);
    if (commentRes.rows.length === 0) return res.status(404).json({ message: 'Comment not found.' });

    if (commentRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own comments.' });
    }

    await pool.query('DELETE FROM task_comments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ message: 'Server error deleting comment.' });
  }
});

module.exports = router;

