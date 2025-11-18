'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingAnimation } from '@/components/effects/TypingAnimation';

/**
 * User Management Page (Admin Only)
 * @brief: Terminal-style user management interface with CRUD operations
 */

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'admin' | 'user' | 'viewer',
  });

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      } else {
        setMessage(`[ERROR] ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setMessage('[ERROR] Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('[OK] User created successfully');
        setShowCreateModal(false);
        resetForm();
        loadUsers();
      } else {
        setMessage(`[ERROR] ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      setMessage('[ERROR] Failed to create user');
    }

    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpdateUser = async (user: User) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('[OK] User updated successfully');
        setEditingUser(null);
        loadUsers();
      } else {
        setMessage(`[ERROR] ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setMessage('[ERROR] Failed to update user');
    }

    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('[OK] User deleted successfully');
        loadUsers();
      } else {
        setMessage(`[ERROR] ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setMessage('[ERROR] Failed to delete user');
    }

    setTimeout(() => setMessage(''), 3000);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'user',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-[var(--error-red)] border-[var(--error-red)]';
      case 'user':
        return 'text-terminal-green border-[var(--accent-green)]';
      case 'viewer':
        return 'text-[var(--accent-yellow)] border-[var(--accent-yellow)]';
      default:
        return 'text-[var(--text-secondary)] border-[var(--border)]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-terminal-cyan font-mono">
          <span className="cursor-blink">█</span> Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 terminal-glow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
              <TypingAnimation text="👥 User Management" speed={30} showCursor={false} />
            </h1>
            <p className="text-[var(--text-secondary)] text-sm font-mono">
              Manage platform users, roles, and permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-green)] rounded text-terminal-green font-semibold hover:bg-[var(--bg-primary)] hover:terminal-glow-green transition-all"
          >
            [+ NEW USER]
          </button>
        </div>
      </motion.div>

      {/* Users Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-terminal-cyan uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--text-secondary)]">
                    #{user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--text-primary)]">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {user.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--text-secondary)]">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-semibold border rounded-full ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-2 text-xs ${
                        user.isActive ? 'text-terminal-green' : 'text-[var(--error-red)]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-[var(--accent-green)]' : 'bg-[var(--error-red)]'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--text-dimmed)] font-mono">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-terminal-cyan hover:text-[var(--accent-cyan)] mr-3"
                    >
                      [EDIT]
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-[var(--error-red)] hover:text-red-400"
                    >
                      [DELETE]
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 max-w-2xl w-full terminal-glow"
            >
              <h2 className="text-xl font-bold text-terminal-green mb-6">
                &gt; CREATE NEW USER
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as any })
                      }
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    [CANCEL]
                  </button>
                  <button
                    onClick={handleCreateUser}
                    className="px-6 py-2 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-green)] rounded text-terminal-green hover:terminal-glow-green transition-all"
                  >
                    [CREATE USER]
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 max-w-2xl w-full terminal-glow"
            >
              <h2 className="text-xl font-bold text-terminal-cyan mb-6">
                &gt; EDIT USER: {editingUser.username}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.fullName}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, fullName: e.target.value })
                      }
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, email: e.target.value })
                      }
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Role
                    </label>
                    <select
                      value={editingUser.role}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, role: e.target.value as any })
                      }
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Status
                    </label>
                    <select
                      value={editingUser.isActive ? 'active' : 'inactive'}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, isActive: e.target.value === 'active' })
                      }
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 justify-end mt-6">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-6 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    [CANCEL]
                  </button>
                  <button
                    onClick={() => handleUpdateUser(editingUser)}
                    className="px-6 py-2 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-cyan)] rounded text-terminal-cyan hover:terminal-glow transition-all"
                  >
                    [SAVE CHANGES]
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 p-4 rounded border font-mono text-sm ${
            message.startsWith('[OK]')
              ? 'bg-[var(--bg-secondary)] border-[var(--accent-green)] text-terminal-green'
              : 'bg-[var(--bg-secondary)] border-[var(--error-red)] text-[var(--error-red)]'
          } terminal-glow z-50`}
        >
          {message}
        </motion.div>
      )}
    </div>
  );
}
