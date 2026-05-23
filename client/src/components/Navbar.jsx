import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: '📊', to: '/dashboard' },
  { label: 'Projects', icon: '📁', to: '/projects' },
  { label: 'Team', icon: '👥', to: '/team' },
  { label: 'Attendance', icon: '⏱️', to: '/attendance' },
  { label: 'Settings', icon: '⚙️', to: '/settings' },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">✨ Syncora</div>
        <div className="logo-sub">Unified Workspace</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: '24px' }}>Account</div>
        <button className="nav-item" onClick={handleLogout} id="logout-btn">
          <span className="nav-item-icon">🚪</span>
          Logout
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }} title="Account settings">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role === 'admin' ? '👑 Admin' : '👤 Member'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Navbar;
