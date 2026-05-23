import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const Team = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isGlobalAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data.users);
      } catch (err) {
        toast.error('Failed to load team members.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...res.data.user } : u)));
      toast.success('User role updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">
            {users.length} registered user{users.length !== 1 ? 's' : ''} in the workspace
          </p>
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={`card team-table-wrap ${isGlobalAdmin ? 'team-table-admin' : ''}`} style={{ overflow: 'hidden' }}>
        <div className="team-table-header">
          <span>Member</span>
          <span>Role</span>
          <span>Projects</span>
          <span>Active Tasks</span>
          <span>Joined</span>
          {isGlobalAdmin && <span>Actions</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No matching users</div>
          </div>
        ) : (
          filtered.map(member => {
            const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const isCurrentUser = member.id === user?.id;

            return (
              <div key={member.id} className="team-table-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar avatar-sm">{initials}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {member.name}
                      {isCurrentUser && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                  </div>
                </div>

                <span className={`badge ${member.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                  {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                </span>

                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {member.project_count ?? 0}
                </span>

                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {member.active_task_count ?? 0}
                </span>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {member.created_at ? format(parseISO(member.created_at), 'MMM d, yyyy') : '—'}
                </span>

                {isGlobalAdmin && (
                  <div>
                    {!isCurrentUser ? (
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '110px' }}
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!isGlobalAdmin && (
        <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Only global admins can change user roles. Contact an admin if you need access changes.
        </p>
      )}
    </div>
  );
};

export default Team;
