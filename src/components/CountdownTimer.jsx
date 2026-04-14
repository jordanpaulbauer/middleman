import React from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { getCountdownColor } from '../data/demo';

export default function CountdownTimer({ endDate, compact = false }) {
  const time = useCountdown(endDate);
  const color = getCountdownColor(endDate);

  if (time.expired) return <span className="badge badge-grey">Expired</span>;

  const parts = [];
  if (time.days > 0) parts.push(`${time.days}d`);
  parts.push(`${String(time.hours).padStart(2, '0')}h`);
  parts.push(`${String(time.minutes).padStart(2, '0')}m`);
  if (!compact) parts.push(`${String(time.seconds).padStart(2, '0')}s`);

  return <span className={`countdown ${color}`}>{parts.join(' : ')}</span>;
}

export function CountdownProgress({ endDate, startDate }) {
  const totalMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  const elapsedMs = Date.now() - new Date(startDate).getTime();
  const pct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const remaining = new Date(endDate).getTime() - Date.now();
  const color = remaining > 72 * 3600000 ? 'var(--green)' : remaining > 24 * 3600000 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
