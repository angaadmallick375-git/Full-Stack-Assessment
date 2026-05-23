import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal from '../components/TaskModal';

const ProjectDetails = () => {
  const { id: projectId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '', search: '' });

  // Modals/Forms State
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Edit Project Form
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [savingProject, setSavingProject] = useState(false);

  // Add Member Form
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member' });
  const [addingMember, setAddingMember] = useState(false);

  const fetchTasks = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assignee) params.append('assignee', filters.assignee);
    if (filters.search) params.append('search', filters.search);
    const query = params.toString();
    const tasksRes = await api.get(`/projects/${projectId}/tasks${query ? `?${query}` : ''}`);
    setTasks(tasksRes.data.tasks);
  };

  const fetchData = async () => {
    try {
      const projectRes = await api.get(`/projects/${projectId}`);
      setProject(projectRes.data.project);
      setMembers(projectRes.data.members);
      setProjectForm({
        name: projectRes.data.project.name,
        description: projectRes.data.project.description || '',
      });

      await fetchTasks();

      const usersRes = await api.get('/users');
      const activitiesRes = await api.get(`/projects/${projectId}/activities`);
      setActivities(activitiesRes.data.activities);
      setAllUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Failed to load project details.');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      fetchTasks().catch(() => {});
    }, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [filters.status, filters.priority, filters.assignee, filters.search, loading]);

  const isProjectAdmin = project?.user_role === 'admin';

  // Task Handlers
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleAddTaskClick = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleTaskCreate = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTaskUpdate = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
  };

  const handleTaskDelete = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Edit Project Handlers
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return toast.error('Project name is required.');
    setSavingProject(true);
    try {
      const res = await api.put(`/projects/${projectId}`, projectForm);
      setProject((prev) => ({ ...prev, ...res.data.project }));
      setShowEditProjectModal(false);
      toast.success('Project updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This will permanently delete all tasks.')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted successfully.');
      navigate('/projects');
    } catch (err) {
      toast.error('Failed to delete project.');
    }
  };

  // Member Handlers
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.userId) return toast.error('Please select a user.');
    setAddingMember(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, memberForm);
      setMembers((prev) => [...prev, res.data.member]);
      // Update member count in project card context locally
      setProject(prev => ({ ...prev, member_count: (prev.member_count || 1) + 1 }));
      setMemberForm({ userId: '', role: 'member' });
      setShowAddMemberModal(false);
      toast.success('Member added successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...res.data.task } : t)));
      toast.success('Task moved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task status.');
    }
  };

  const handleMemberRoleChange = async (userId, newRole) => {
    try {
      const res = await api.patch(`/projects/${projectId}/members/${userId}`, { role: newRole });
      setMembers(prev => prev.map(m => (m.id === userId ? { ...m, project_role: res.data.member.project_role } : m)));
      toast.success('Member role updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      setProject(prev => ({ ...prev, member_count: Math.max(1, (prev.member_count || 2) - 1) }));
      toast.success('Member removed successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!project) return <div>Project not found.</div>;

  // Filter out users who are already project members
  const nonMembers = allUsers.filter(u => !members.some(m => m.id === u.id));

  return (
    <div className="page-container animate-fadeIn">
      {/* Header */}
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="page-title">{project.name}</h1>
              <span className="badge badge-admin" style={{ background: project.user_role === 'admin' ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.06)' }}>
                {project.user_role === 'admin' ? '👑 Admin' : '👤 Member'}
              </span>
            </div>
            <p className="page-subtitle" style={{ marginTop: '8px', fontSize: '0.95rem' }}>
              {project.description || 'No description provided.'}
            </p>
          </div>

          {isProjectAdmin && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditProjectModal(true)}>
                ✏️ Edit Project
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>
                🗑️ Delete Project
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Kanban Board */}
        <div>
          <div className="section-header" style={{ marginBottom: '20px' }}>
            <h2 className="section-title">Tasks Board</h2>
          </div>

          {/* Task Filters */}
          <div className="task-filters" style={{ marginBottom: '16px' }}>
            <input
              className="form-input"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              style={{ flex: 1, minWidth: '140px' }}
            />
            <select
              className="form-select"
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <select
              className="form-select"
              value={filters.priority}
              onChange={e => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              className="form-select"
              value={filters.assignee}
              onChange={e => setFilters({ ...filters, assignee: e.target.value })}
            >
              <option value="">All Assignees</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {(filters.status || filters.priority || filters.assignee || filters.search) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setFilters({ status: '', priority: '', assignee: '', search: '' })}
              >
                Clear
              </button>
            )}
          </div>

          <KanbanBoard
            tasks={tasks}
            onTaskClick={handleTaskClick}
            isProjectAdmin={isProjectAdmin}
            onAddTask={handleAddTaskClick}
            onStatusChange={handleStatusChange}
            canDragTask={(task) => isProjectAdmin || task.assignee_id === currentUser?.id}
          />
        </div>

        {/* Right Column: Members + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3 className="section-title">👥 Members ({members.length})</h3>
            {isProjectAdmin && (
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowAddMemberModal(true)} title="Add member">
                + Add
              </button>
            )}
          </div>

          <div className="members-list">
            {members.map((member) => {
              const isOwner = member.id === project.owner_id;
              const isCurrentUser = member.id === currentUser.id;
              const isMemberAdmin = member.project_role === 'admin';

              return (
                <div key={member.id} className="member-item">
                  <div className="avatar avatar-sm">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="member-info">
                    <div className="member-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {member.name}
                      {isCurrentUser && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(You)</span>}
                    </div>
                    <div className="member-email">{member.email}</div>
                    <div style={{ marginTop: '4px' }}>
                      {isProjectAdmin && !isOwner ? (
                        <select
                          className="form-select"
                          style={{ padding: '2px 6px', fontSize: '0.7rem', minWidth: '90px' }}
                          value={member.project_role}
                          onChange={e => handleMemberRoleChange(member.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className={`badge ${isMemberAdmin ? 'badge-admin' : 'badge-member'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {isOwner ? '👑 Owner' : isMemberAdmin ? 'Admin' : 'Member'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isProjectAdmin && !isOwner && !isCurrentUser && (
                    <div className="member-actions">
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove member"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="card" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3 className="section-title">🕒 Activity Log</h3>
          </div>
          <div className="activity-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {activities.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity.</div>
            ) : (
              activities.map((activity, idx) => (
                <div key={activity.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  {idx !== activities.length - 1 && (
                    <div style={{ position: 'absolute', left: '15px', top: '30px', bottom: '-20px', width: '2px', background: 'var(--border-light)' }} />
                  )}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, fontSize: '0.8rem' }}>
                    {activity.action === 'task_created' ? '📝' : activity.action === 'status_changed' ? '🔄' : activity.action.includes('member') ? '👤' : '⚡'}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '4px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <strong>{activity.user_name}</strong> {activity.details}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>

      </div>

      {/* Task Creation / Editing Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          members={members}
          tasks={tasks}
          isProjectAdmin={isProjectAdmin}
          onClose={() => setShowTaskModal(false)}
          onCreate={handleTaskCreate}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditProjectModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Project</h2>
              <button className="modal-close" onClick={() => setShowEditProjectModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleUpdateProject}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-proj-name">Project Name *</label>
                <input
                  id="edit-proj-name"
                  className="form-input"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-proj-desc">Description</label>
                <textarea
                  id="edit-proj-desc"
                  className="form-textarea"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditProjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingProject}>
                  {savingProject ? 'Saving...' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddMemberModal(false)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2 className="modal-title">👥 Add Project Member</h2>
              <button className="modal-close" onClick={() => setShowAddMemberModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label" htmlFor="add-member-select">Select User</label>
                <select
                  id="add-member-select"
                  className="form-select"
                  value={memberForm.userId}
                  onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                  required
                >
                  <option value="">-- Choose a user --</option>
                  {nonMembers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-member-role">Project Role</label>
                <select
                  id="add-member-role"
                  className="form-select"
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                >
                  <option value="member">👤 Member (Can view tasks & update status)</option>
                  <option value="admin">👑 Admin (Full edit permissions)</option>
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMemberModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingMember}>
                  {addingMember ? 'Adding...' : '+ Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
