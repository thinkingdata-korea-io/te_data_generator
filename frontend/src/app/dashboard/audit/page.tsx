'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { TypingAnimation } from '@/components/effects/TypingAnimation';

/**
 * Audit Logs Page (Admin Only)
 * @brief: Terminal-style audit log viewer with filtering and search
 */

interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, any>;
  status: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    username: '',
    action: '',
    start_date: '',
    end_date: '',
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load logs
  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters, sortBy, sortOrder]);

  // Real-time polling for new logs (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadLogs();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [pagination.page, filters, sortBy, sortOrder]);

  const loadLogs = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.username && { username: filters.username }),
        ...(filters.action && { action: filters.action }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const response = await fetch(`${API_URL}/api/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to page 1 on filter change
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return ' ⇅';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'text-terminal-cyan';
    if (action.includes('create')) return 'text-terminal-green';
    if (action.includes('delete')) return 'text-[var(--error-red)]';
    if (action.includes('update')) return 'text-[var(--accent-yellow)]';
    if (action.includes('send')) return 'text-terminal-magenta';
    return 'text-[var(--text-secondary)]';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <span className="px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--accent-green)] text-terminal-green rounded">
          ✓ {status.toUpperCase()}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--error-red)] text-[var(--error-red)] rounded">
        ✗ {status.toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-terminal-cyan font-mono">
          <span className="cursor-blink">█</span> {t.audit.loading}
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
        <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
          <TypingAnimation text={`📜 ${t.audit.title}`} speed={30} showCursor={false} />
        </h1>
        <p className="text-[var(--text-secondary)] text-sm font-mono">
          {t.audit.description}
        </p>
      </motion.div>

      {/* Filters */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-lg font-bold text-terminal-green mb-4">
          &gt; filter.query
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
              {t.audit.username}
            </label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => handleFilterChange('username', e.target.value)}
              placeholder={t.audit.searchUsername}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="action-filter" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
              {t.audit.action}
            </label>
            <select
              id="action-filter"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
            >
              <option value="">{t.audit.allActions}</option>
              <option value="login">{t.auth.login}</option>
              <option value="logout">{t.auth.logout}</option>
              <option value="create_run">{t.audit.createRun}</option>
              <option value="send_data">{t.audit.sendData}</option>
              <option value="create_user">{t.audit.createUser}</option>
              <option value="update_user">{t.audit.updateUser}</option>
              <option value="delete_user">{t.audit.deleteUser}</option>
            </select>
          </div>

          <div>
            <label htmlFor="start-date-filter" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
              {t.audit.startDate}
            </label>
            <input
              id="start-date-filter"
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
              aria-label={t.audit.startDate}
            />
          </div>

          <div>
            <label htmlFor="end-date-filter" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
              {t.audit.endDate}
            </label>
            <input
              id="end-date-filter"
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none"
              aria-label={t.audit.endDate}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto terminal-scrollbar">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase cursor-pointer hover:text-[var(--accent-cyan)] transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  {t.audit.timestamp}{getSortIcon('created_at')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase cursor-pointer hover:text-[var(--accent-cyan)] transition-colors"
                  onClick={() => handleSort('username')}
                >
                  {t.audit.user}{getSortIcon('username')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase cursor-pointer hover:text-[var(--accent-cyan)] transition-colors"
                  onClick={() => handleSort('action')}
                >
                  {t.audit.action}{getSortIcon('action')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase">
                  {t.audit.resource}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase">
                  {t.audit.details}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-terminal-cyan uppercase cursor-pointer hover:text-[var(--accent-cyan)] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  {t.users.status}{getSortIcon('status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-[var(--text-dimmed)]">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-primary)] font-mono">
                        {log.username}
                      </span>
                      <span className="text-[var(--text-dimmed)] text-xs">
                        #{log.userId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm font-mono ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                    {log.resourceType && log.resourceId ? (
                      <div>
                        <div className="text-[var(--text-secondary)] text-xs">
                          {log.resourceType}
                        </div>
                        <div className="text-[var(--text-primary)] text-xs truncate max-w-[200px]">
                          {log.resourceId}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--text-dimmed)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <details className="cursor-pointer">
                        <summary className="text-terminal-cyan text-xs hover:underline">
                          {t.audit.viewDetails}
                        </summary>
                        <div className="mt-2 p-2 bg-[var(--bg-primary)] rounded text-xs font-mono text-[var(--text-secondary)]">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </details>
                    ) : (
                      <span className="text-[var(--text-dimmed)] text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(log.status)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-[var(--bg-tertiary)] border-t border-[var(--border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--text-secondary)] font-mono">
              {t.audit.showing} {logs.length} {t.audit.of} {pagination.total} {t.audit.logs}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })
                }
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--accent-cyan)] transition-all"
              >
                &lt; {t.audit.prev}
              </button>
              <span className="text-sm text-[var(--text-primary)] font-mono">
                {t.audit.page} {pagination.page} {t.audit.of} {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.min(pagination.totalPages, pagination.page + 1),
                  })
                }
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--accent-cyan)] transition-all"
              >
                {t.audit.next} &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
