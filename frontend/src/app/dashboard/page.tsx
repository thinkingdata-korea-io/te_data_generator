'use client';

import { useAuth } from '@/contexts/AuthContext';
import { TypingAnimation } from '@/components/effects/TypingAnimation';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

/**
 * Dashboard Home Page
 * @brief: Main dashboard landing page with system stats and quick actions
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRuns: 0,
    totalEvents: 0,
    activeUsers: 0,
    systemLoad: 0,
  });

  // Simulate loading stats
  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        totalRuns: 247,
        totalEvents: 1_234_567,
        activeUsers: 12,
        systemLoad: 34,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 terminal-glow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
              <TypingAnimation
                text={`Welcome back, ${user?.username || 'User'}`}
                speed={50}
                showCursor={false}
              />
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              ThinkingEngine Data Generator Platform • Terminal Interface v1.0
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-dimmed)]">
            <div>Role: <span className="text-terminal-green">{user?.role?.toUpperCase()}</span></div>
            <div>Session: <span className="text-terminal-cyan">Active</span></div>
          </div>
        </div>
      </motion.div>

      {/* System Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Runs */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-cyan)] transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">⚡</span>
            <span className="text-xs text-[var(--text-dimmed)]">RUNS</span>
          </div>
          <div className="text-3xl font-bold text-terminal-cyan mb-1">
            {stats.totalRuns.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Total Executions</div>
        </motion.div>

        {/* Total Events */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-green)] transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-[var(--text-dimmed)]">EVENTS</span>
          </div>
          <div className="text-3xl font-bold text-terminal-green mb-1">
            {stats.totalEvents.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Events Generated</div>
        </motion.div>

        {/* Active Users */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-magenta)] transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">👥</span>
            <span className="text-xs text-[var(--text-dimmed)]">USERS</span>
          </div>
          <div className="text-3xl font-bold text-terminal-magenta mb-1">
            {stats.activeUsers}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Active Sessions</div>
        </motion.div>

        {/* System Load */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-yellow)] transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">⚙</span>
            <span className="text-xs text-[var(--text-dimmed)]">LOAD</span>
          </div>
          <div className="text-3xl font-bold text-[var(--accent-yellow)] mb-1">
            {stats.systemLoad}%
          </div>
          <div className="text-xs text-[var(--text-secondary)]">System Resources</div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6"
      >
        <h2 className="text-lg font-bold text-terminal-cyan mb-4 flex items-center gap-2">
          <span>⚡</span> Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-cyan)] hover:terminal-glow transition-all text-left">
            <div className="text-xl mb-2">🚀</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              New Data Generation
            </div>
            <div className="text-xs text-[var(--text-dimmed)] mt-1">
              Start a new run
            </div>
          </button>

          <button className="px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-green)] hover:terminal-glow-green transition-all text-left">
            <div className="text-xl mb-2">📁</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              Upload Excel
            </div>
            <div className="text-xs text-[var(--text-dimmed)] mt-1">
              Import schema file
            </div>
          </button>

          <button className="px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-magenta)] hover:terminal-glow-magenta transition-all text-left">
            <div className="text-xl mb-2">📜</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              View History
            </div>
            <div className="text-xs text-[var(--text-dimmed)] mt-1">
              Recent executions
            </div>
          </button>
        </div>
      </motion.div>

      {/* System Logs (Terminal Output) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6"
      >
        <h2 className="text-lg font-bold text-terminal-green mb-4 flex items-center gap-2">
          <span>&gt;_</span> System Logs
        </h2>
        <div className="bg-[var(--bg-primary)] rounded p-4 font-mono text-xs space-y-1 max-h-64 overflow-auto terminal-scrollbar">
          <div className="text-terminal-cyan">
            [INFO] System initialized successfully
          </div>
          <div className="text-terminal-green">
            [OK] Database connection established
          </div>
          <div className="text-terminal-cyan">
            [INFO] User {user?.username} authenticated (role: {user?.role})
          </div>
          <div className="text-terminal-green">
            [OK] Dashboard loaded
          </div>
          <div className="text-[var(--text-dimmed)]">
            [DEBUG] Awaiting user input...
          </div>
          <div className="flex items-center gap-1">
            <span className="text-terminal-green">&gt;</span>
            <span className="w-2 h-4 bg-[var(--accent-cyan)] cursor-blink" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
