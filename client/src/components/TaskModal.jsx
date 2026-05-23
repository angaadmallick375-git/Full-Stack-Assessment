import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };

// A predefined palette for tag colors based on content hash
const getTagColor = (tag) => {
  const colors = ['#6366f1', '#818cf8', '#38bdf8', '#4f46e5', '#a5b4fc', '#ef4444', '#4ade80'];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const TaskModal = ({ task, projectId, members, tasks, isProjectAdmin, onClose, onUpdate, onDelete, onCreate }) => {
  const { user } = useAuth();
  const isCreating = !task;
  const isAssignee = task?.assignee_id === user?.id;
  const canEdit = isProjectAdmin || isAssignee;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    assignee_id: task?.assignee_id || '',
    blocked_by: task?.blocked_by || '',
    tags: task?.tags ? task.tags.join(', ') : '',
  });
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(isCreating);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (!isCreating) {
      api.get(`/tasks/${task.id}/comments`)
        .then(res => setComments(res.data.comments))
        .catch(err => console.error(err));
    }
  }, [task, isCreating]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Task title is required.');
    setSaving(true);
    try {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(t => t);
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        blocked_by: form.blocked_by || null,
        tags: tagsArray,
      };

      if (isCreating) {
        const res = await api.post(`/projects/${projectId}/tasks`, payload);
        onCreate(res.data.task);
        toast.success('Task created!');
      } else {
        const res = await api.put(`/tasks/${task.id}`, payload);
        onUpdate(res.data.task);
        toast.success('Task updated!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      onUpdate(res.data.task);
      setForm(f => ({ ...f, status: newStatus }));
      toast.success('Status updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDelete(task.id);
      toast.success('Task deleted.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/tasks/${task.id}/comments`, { content: newComment });
      setComments([...comments, res.data.comment]);
      setNewComment('');
    } catch (err) {
      toast.error('Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/tasks/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      toast.error('Failed to delete comment.');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isCreating ? '+ New Task' : editMode ? '✏️ Edit Task' : task?.title}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isCreating && !editMode && canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>✏️ Edit</button>
            )}
            {!isCreating && isProjectAdmin && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? '...' : '🗑️'}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* View Mode */}
        {!isCreating && !editMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {task.tags.map(tag => (
                  <span key={tag} className="badge" style={{ background: getTagColor(tag) + '20', color: getTagColor(tag), border: `1px solid ${getTagColor(tag)}50` }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description (Markdown) */}
            {task.description && (
              <div className="markdown-body" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <ReactMarkdown>{task.description}</ReactMarkdown>
              </div>
            )}

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Status', value: <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span> },
                { label: 'Priority', value: <span className={`badge badge-${task.priority}`}>{priorityLabel[task.priority]}</span> },
                { label: 'Assignee', value: task.assignee_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span> },
                { label: 'Due Date', value: task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : <span style={{ color: 'var(--text-muted)' }}>No due date</span> },
                { label: 'Blocked By', value: task.blocked_by ? <span className="badge badge-danger">⚠️ {tasks?.find(t => t.id === task.blocked_by)?.title || 'Task #' + task.blocked_by}</span> : <span style={{ color: 'var(--text-muted)' }}>None</span> },
                { label: 'Created by', value: task.created_by_name || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '6px' }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Quick status change for assignees */}
            {(isAssignee || isProjectAdmin) && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Update Status
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['todo', 'in_progress', 'done'].map(s => (
                    <button
                      key={s}
                      className={`btn btn-sm ${form.status === s ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleStatusChange(s)}
                      style={{ flex: 1 }}
                    >
                      {statusLabel[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>💬 Discussion</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {comments.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No comments yet.</div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                      <div className="avatar avatar-sm">{c.user_name?.substring(0,2).toUpperCase()}</div>
                      <div style={{ flex: 1, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-light)' }}>{c.user_name}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(c.created_at), 'MMM d, p')}</span>
                            {c.user_id === user?.id && (
                              <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>✕</button>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{c.content}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={postingComment || !newComment.trim()}>
                  {postingComment ? '...' : 'Post'}
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* Edit / Create Form */
          <form className="modal-form" onSubmit={handleSubmit} id={isCreating ? 'create-task-form' : 'edit-task-form'}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Title *</label>
              <input
                id="task-title"
                className="form-input"
                name="title"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-desc">Description (Markdown Supported)</label>
              <textarea
                id="task-desc"
                className="form-textarea"
                name="description"
                placeholder="Add more details... Supports **bold**, *italic*, lists, etc."
                value={form.description}
                onChange={handleChange}
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-tags">Tags (comma separated)</label>
              <input
                id="task-tags"
                className="form-input"
                name="tags"
                placeholder="e.g. frontend, bug, v2.0"
                value={form.tags}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="task-status">Status</label>
                <select id="task-status" className="form-select" name="status" value={form.status} onChange={handleChange}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-priority">Priority</label>
                <select id="task-priority" className="form-select" name="priority" value={form.priority} onChange={handleChange}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-assignee">Assignee</label>
                <select id="task-assignee" className="form-select" name="assignee_id" value={form.assignee_id} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-due">Due Date</label>
                <input
                  id="task-due"
                  className="form-input"
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="task-blocked">Blocked By (Dependencies)</label>
                <select id="task-blocked" className="form-select" name="blocked_by" value={form.blocked_by} onChange={handleChange}>
                  <option value="">-- None --</option>
                  {tasks?.filter(t => t.id !== task?.id).map(t => (
                    <option key={t.id} value={t.id}>⚠️ {t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => isCreating ? onClose() : setEditMode(false)}>
                Cancel
              </button>
              <button id="task-submit-btn" type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isCreating ? '+ Create Task' : '✓ Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TaskModal;
