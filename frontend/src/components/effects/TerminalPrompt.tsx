'use client';

import { ReactNode } from 'react';

/**
 * TerminalPrompt Component
 * @brief: Reusable terminal prompt prefix (user@host:~$)
 */
interface TerminalPromptProps {
  user?: string;
  host?: string;
  path?: string;
  children?: ReactNode;
  className?: string;
}

export function TerminalPrompt({
  user = 'user',
  host = 'te-platform',
  path = '~',
  children,
  className = '',
}: TerminalPromptProps) {
  return (
    <div className={`font-mono flex items-center gap-1 ${className}`}>
      <span className="text-terminal-green">{user}</span>
      <span className="text-[var(--text-secondary)]">@</span>
      <span className="text-terminal-cyan">{host}</span>
      <span className="text-[var(--text-secondary)]">:</span>
      <span className="text-terminal-magenta">{path}</span>
      <span className="text-[var(--accent-yellow)]">$</span>
      {children && <span className="ml-2">{children}</span>}
    </div>
  );
}
