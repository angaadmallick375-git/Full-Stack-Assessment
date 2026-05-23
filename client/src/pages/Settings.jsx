import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return toast.error('Name is required.');
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', { name: profileForm.name });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and security preferences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px' }}>
        {/* Profile Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div className="avatar avatar-lg">{initials}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-member'}`} style={{ marginTop: '6px' }}>
                {user?.role === 'admin' ? '👑 Global Admin' : '👤 Member'}
              </span>
            </div>
          </div>

          <h3 className="section-title" style={{ marginBottom: '16px' }}>Profile</h3>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">Display Name</label>
              <input
                id="settings-name"
                className="form-input"
                value={profileForm.name}
                onChange={e => setProfileForm({ name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password Card */}
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '16px' }}>🔒 Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="current-pw">Current Password</label>
              <input
                id="current-pw"
                type="password"
                className="form-input"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-pw">New Password</label>
              <input
                id="new-pw"
                type="password"
                className="form-input"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-pw">Confirm New Password</label>
              <input
                id="confirm-pw"
                type="password"
                className="form-input"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
