'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TypingAnimation } from '@/components/effects/TypingAnimation';
import { TerminalPrompt } from '@/components/effects/TerminalPrompt';
import { motion } from 'framer-motion';

/**
 * Login Page
 * @brief: Terminal-style authentication interface with typing animations
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<'init' | 'username' | 'password' | 'authenticating'>('init');
  const [showWelcome, setShowWelcome] = useState(true);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Username required');
      return;
    }

    if (!password.trim()) {
      setError('Password required');
      return;
    }

    setError('');
    setIsAuthenticating(true);
    setStage('authenticating');

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Authentication failed. Access denied.');
      setIsAuthenticating(false);
      setStage('init');
      // Clear password on error
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] scan-lines crt-screen relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 gap-4 h-full">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="border-r border-[var(--accent-cyan)]" />
          ))}
        </div>
      </div>

      {/* Matrix-style falling characters (decorative) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-terminal-green text-xs font-mono"
            style={{ left: `${i * 5}%` }}
            initial={{ y: -100 }}
            animate={{ y: '100vh' }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * 5,
            }}
          >
            {Array.from({ length: 20 }, () =>
              String.fromCharCode(Math.random() * 94 + 33)
            ).join('\n')}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-2xl px-8"
      >
        {/* Terminal Window */}
        <div className="bg-[var(--bg-secondary)] rounded-lg border-2 border-[var(--border-bright)] terminal-glow overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-[var(--bg-tertiary)] px-4 py-2 flex items-center gap-2 border-b border-[var(--border)]">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--error-red)]" />
              <div className="w-3 h-3 rounded-full bg-[var(--accent-yellow)]" />
              <div className="w-3 h-3 rounded-full bg-[var(--accent-green)]" />
            </div>
            <span className="text-xs text-[var(--text-secondary)] ml-2">
              te-platform-auth — bash — 80×24
            </span>
          </div>

          {/* Terminal Content */}
          <div className="p-8 min-h-[500px] terminal-scrollbar">
            {/* Welcome Message */}
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 space-y-2 text-sm"
                onAnimationComplete={() => {
                  setTimeout(() => setShowWelcome(false), 2000);
                }}
              >
                <div className="text-terminal-cyan">
                  <TypingAnimation
                    text="╔══════════════════════════════════════════════╗"
                    speed={10}
                  />
                </div>
                <div className="text-terminal-cyan">
                  <TypingAnimation
                    text="║   ThinkingEngine Data Generator Platform    ║"
                    speed={10}
                  />
                </div>
                <div className="text-terminal-cyan">
                  <TypingAnimation
                    text="╚══════════════════════════════════════════════╝"
                    speed={10}
                  />
                </div>
                <div className="text-[var(--text-secondary)] mt-4">
                  <TypingAnimation
                    text="System initialized. Authentication required."
                    speed={30}
                    showCursor={false}
                  />
                </div>
              </motion.div>
            )}

            {!showWelcome && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Input */}
                <div>
                  <TerminalPrompt user="guest" path="/auth" className="mb-2">
                    <span className="text-[var(--text-primary)]">Enter username</span>
                  </TerminalPrompt>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-terminal-green">&gt;</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isAuthenticating}
                      className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dimmed)] disabled:opacity-50"
                      placeholder="username"
                      autoFocus
                    />
                    {!password && !isAuthenticating && (
                      <span className="w-2 h-5 bg-[var(--accent-cyan)] cursor-blink" />
                    )}
                  </div>
                </div>

                {/* Password Input */}
                {username && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TerminalPrompt user={username} path="/auth" className="mb-2">
                      <span className="text-[var(--text-primary)]">Enter password</span>
                    </TerminalPrompt>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-terminal-green">&gt;</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isAuthenticating}
                        className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dimmed)] disabled:opacity-50"
                        placeholder="••••••••"
                      />
                      {password && !isAuthenticating && (
                        <span className="w-2 h-5 bg-[var(--accent-cyan)] cursor-blink" />
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Authenticating State */}
                {isAuthenticating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2 text-sm"
                  >
                    <div className="text-[var(--accent-cyan)]">
                      <TypingAnimation
                        text="[INFO] Authenticating user..."
                        speed={30}
                        showCursor={false}
                      />
                    </div>
                    <div className="text-[var(--accent-cyan)]">
                      <TypingAnimation
                        text="[INFO] Validating credentials..."
                        speed={30}
                        showCursor={false}
                      />
                    </div>
                    <div className="text-terminal-green">
                      <TypingAnimation
                        text="[OK] Access granted. Redirecting..."
                        speed={30}
                        showCursor={false}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[var(--error-red)] text-sm"
                  >
                    <span className="text-terminal-cyan">[ERROR]</span> {error}
                  </motion.div>
                )}

                {/* Submit Instructions */}
                {username && password && !isAuthenticating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[var(--text-dimmed)] text-xs"
                  >
                    Press <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded">Enter</kbd> to authenticate
                  </motion.div>
                )}

                {/* Hidden submit button */}
                <button type="submit" className="hidden">Submit</button>
              </form>
            )}

          </div>
        </div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-4 text-center text-xs text-[var(--text-dimmed)]"
        >
          <div>ThinkingEngine Platform v1.0.0</div>
          <div>Secure Terminal Access Protocol (STAP)</div>
        </motion.div>
      </motion.div>
    </div>
  );
}
