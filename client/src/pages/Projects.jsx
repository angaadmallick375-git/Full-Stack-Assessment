import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const Projects = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
    } catch (err) {
      toast.error('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required.');
    setSaving(true);
    try {
      const res = await api.post('/projects', form);
      setProjects(prev => [res.data.project, ...prev]);
      setShowModal(false);
      setForm({ name: '', description: '' });
      toast.success('Project created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleColor = (role) => role === 'admin' ? 'var(--accent-light)' : 'var(--text-secondary)';

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              id="project-search"
              className="search-input"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button id="create-project-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
              + New Project
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '60px' }}>
          <div className="empty-icon">{search ? '🔍' : '📁'}</div>
          <div className="empty-title">{search ? 'No matching projects' : 'No projects yet'}</div>
          <div className="empty-desc">
            {search ? 'Try a different search term.' : 'Create your first project to get started.'}
          </div>
          {!search && isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowModal(true)}>
              + Create Project
            </button>
          )}
          {!search && !isAdmin && (
            <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Ask an admin to add you to a project.
            </p>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}`)}
              id={`project-card-${project.id}`}
            >
              <div className="project-card-header">
                <div>
                  <div className="project-card-title">{project.name}</div>
                  <span
                    className="badge"
                    style={{
                      background: project.user_role === 'admin' ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.06)',
                      color: getRoleColor(project.user_role),
                      marginTop: '6px',
                    }}
                  >
                    {project.user_role === 'admin' ? '👑 Admin' : '👤 Member'}
                  </span>
                </div>
                <div style={{ fontSize: '1.8rem' }}>📁</div>
              </div>

              <p className="project-card-desc">
                {project.description || 'No description provided.'}
              </p>

              <div className="project-card-meta">
                <div className="project-meta-item">
                  <span>👥</span> {project.member_count} member{project.member_count !== 1 ? 's' : ''}
                </div>
                <div className="project-meta-item">
                  <span>✅</span> {project.task_count} task{project.task_count !== 1 ? 's' : ''}
                </div>
                <div className="project-meta-item" style={{ marginLeft: 'auto' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    {project.created_at ? format(parseISO(project.created_at), 'MMM d, yyyy') : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleCreate} id="create-project-form">
              <div className="form-group">
                <label className="form-label" htmlFor="proj-name">Project Name *</label>
                <input
                  id="proj-name"
                  className="form-input"
                  placeholder="e.g. Website Redesign"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="proj-desc">Description</label>
                <textarea
                  id="proj-desc"
                  className="form-textarea"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="create-project-submit" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : '+ Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
