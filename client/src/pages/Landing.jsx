import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_SANDBOX_TASKS = [
  { id: 1, title: '🚀 Explore Syncora Kanban Board', priority: 'medium', status: 'in_progress' },
  { id: 2, title: '🔒 Set up project security rules', priority: 'high', status: 'todo' },
  { id: 3, title: '🎉 Try moving this task to In Progress!', priority: 'low', status: 'todo' },
  { id: 4, title: '✨ Sign up to unlock full team collaboration', priority: 'medium', status: 'done' },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sandbox Local State for "Try It Now"
  const [tasks, setTasks] = useState(INITIAL_SANDBOX_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      status: 'todo'
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  const moveTask = (taskId, direction) => {
    const statusOrder = ['todo', 'in_progress', 'done'];
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      const currentIndex = statusOrder.indexOf(task.status);
      let newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < statusOrder.length) {
        return { ...task, status: statusOrder[newIndex] };
      }
      return task;
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleResetSandbox = () => {
    setTasks(INITIAL_SANDBOX_TASKS);
  };

  // Helper to format priority class
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Med';
      case 'low': return '🟢 Low';
      default: return 'Med';
    }
  };

  const handleScrollToSandbox = () => {
    const element = document.getElementById('demo-sandbox');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Background Decorative Glow Spheres */}
      <div className="glow-sphere glow-sphere-1"></div>
      <div className="glow-sphere glow-sphere-2"></div>
      <div className="glow-sphere glow-sphere-3"></div>

      {/* Navigation */}
      <header className="landing-header">
        <div className="landing-logo">
          <span>✨</span> Syncora
        </div>
        <div className="landing-nav-links">
          {user ? (
            <>
              <span className="text-sm text-muted" style={{ marginRight: '8px' }}>
                Hi, {user.name} 👋
              </span>
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-sm">
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero animate-fadeIn">
        <div className="hero-badge">
          <span>🚀</span> Introducing Syncora 2.0
        </div>
        <h1 className="hero-title">
          Work in <span>Sync</span>,<br />
          Build with Speed
        </h1>
        <p className="hero-subtitle">
          Syncora integrates your tasks, projects, and teams into one gorgeous, glassmorphic workspace.
          Collaborate instantly with role-based access, automated workflows, and drag-and-drop boards.
        </p>
        <div className="hero-ctas">
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-lg">
              Launch Application →
            </button>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary btn-lg">
                Start Free Workspace →
              </Link>
              <button onClick={handleScrollToSandbox} className="btn btn-secondary btn-lg">
                Try Live Sandbox
              </button>
            </>
          )}
        </div>
      </section>

      {/* Interactive Sandbox Section */}
      <section id="demo-sandbox" className="landing-sandbox">
        <div className="sandbox-header">
          <h2>Interactive Sandbox</h2>
          <p>Try managing tasks in real time right now. Zero setup required.</p>
        </div>

        <div className="sandbox-container">
          <form className="sandbox-creator" onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Type a task name..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="form-input"
              style={{ flex: 1, background: 'var(--bg-primary)' }}
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="form-select"
              style={{ width: '130px', background: 'var(--bg-primary)' }}
            >
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🟢 Low Priority</option>
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
              Add Task
            </button>
          </form>

          <div className="sandbox-board">
            {/* TO DO COLUMN */}
            <div className="sandbox-column">
              <div className="sandbox-column-title">
                <span>📋 To Do</span>
                <span className="sandbox-column-count">
                  {tasks.filter(t => t.status === 'todo').length}
                </span>
              </div>
              <div className="sandbox-task-list">
                {tasks.filter(t => t.status === 'todo').map(task => (
                  <div key={task.id} className="sandbox-task-card animate-slideUp">
                    <div className="sandbox-task-title">{task.title}</div>
                    <div className="sandbox-task-meta">
                      <span className="text-xs text-muted">{getPriorityLabel(task.priority)}</span>
                      <div className="sandbox-controls">
                        <button
                          onClick={() => moveTask(task.id, 1)}
                          className="sandbox-ctrl-btn"
                          title="Move to In Progress"
                        >
                          →
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="sandbox-ctrl-btn btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IN PROGRESS COLUMN */}
            <div className="sandbox-column">
              <div className="sandbox-column-title">
                <span>⚡ In Progress</span>
                <span className="sandbox-column-count">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </span>
              </div>
              <div className="sandbox-task-list">
                {tasks.filter(t => t.status === 'in_progress').map(task => (
                  <div key={task.id} className="sandbox-task-card animate-slideUp">
                    <div className="sandbox-task-title">{task.title}</div>
                    <div className="sandbox-task-meta">
                      <span className="text-xs text-muted">{getPriorityLabel(task.priority)}</span>
                      <div className="sandbox-controls">
                        <button
                          onClick={() => moveTask(task.id, -1)}
                          className="sandbox-ctrl-btn"
                          title="Move to To Do"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => moveTask(task.id, 1)}
                          className="sandbox-ctrl-btn"
                          title="Move to Done"
                        >
                          →
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="sandbox-ctrl-btn btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DONE COLUMN */}
            <div className="sandbox-column">
              <div className="sandbox-column-title">
                <span>✅ Done</span>
                <span className="sandbox-column-count">
                  {tasks.filter(t => t.status === 'done').length}
                </span>
              </div>
              <div className="sandbox-task-list">
                {tasks.filter(t => t.status === 'done').map(task => (
                  <div key={task.id} className="sandbox-task-card animate-slideUp">
                    <div className="sandbox-task-title" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                      {task.title}
                    </div>
                    <div className="sandbox-task-meta">
                      <span className="text-xs text-muted">{getPriorityLabel(task.priority)}</span>
                      <div className="sandbox-controls">
                        <button
                          onClick={() => moveTask(task.id, -1)}
                          className="sandbox-ctrl-btn"
                          title="Move to In Progress"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="sandbox-ctrl-btn btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted">
              💡 Task cards inside this sandbox update instantly in local component state!
            </span>
            <button
              onClick={handleResetSandbox}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Reset Sandbox
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="landing-features">
        <h2 className="features-title">Why Teams Choose Syncora</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Glassmorphic Beauty</h3>
            <p>A premium design with rich dark aesthetics, floating glow spheres, and highly interactive cards.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👑</div>
            <h3>Role-Based Control</h3>
            <p>Admin roles manage projects and users, while member roles update work. Everyone works in full sync.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Kanban Boards</h3>
            <p>Manage task queues easily with responsive card-decks, priority tags, and clean overlays.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
