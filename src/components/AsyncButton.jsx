import React, { useState, useRef, useEffect } from 'react';

/**
 * Drop-in replacement for <button> when the click handler is async.
 *
 * Tracks its own loading state — disables itself while the promise is
 * in flight and renders a small spinner over the label so the user
 * gets immediate visual feedback that the click registered. Snaps back
 * to its normal state when the promise settles (resolve OR reject).
 *
 * Use it anywhere a click fires a network roundtrip and the user has
 * to wait. For instant interactions (state setters, navigation,
 * clipboard copies) keep using plain <button> — the loading flicker
 * would be more noise than signal.
 *
 * Props mirror <button>'s. Two additions:
 *   - onClick: async function (or sync, no penalty). Errors propagate
 *     so the parent can still toast them.
 *   - spinnerVariant: 'auto' (default) | 'light' | 'dark'. 'auto'
 *     picks light for solid backgrounds, dark otherwise. Override
 *     when you know better than the heuristic.
 */
export default function AsyncButton({
  onClick,
  children,
  disabled,
  className = '',
  style,
  spinnerVariant = 'auto',
  type = 'button',
  ...rest
}) {
  const [loading, setLoading] = useState(false);
  // Track mount state so a fast unmount (e.g. modal closes mid-action)
  // doesn't trigger setState-on-unmounted warnings.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleClick = async (e) => {
    if (loading || disabled) return;
    let result;
    try {
      result = onClick?.(e);
    } catch (err) {
      throw err;
    }
    // Sync onClick: nothing to wait on.
    if (!result || typeof result.then !== 'function') return result;
    setLoading(true);
    try {
      return await result;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Pick spinner color based on button variant. btn-primary has a dark
  // or red bg → light spinner; everything else gets the dark variant.
  const useLightSpinner = spinnerVariant === 'light' ||
    (spinnerVariant === 'auto' && /\bbtn-primary\b/.test(className));
  const spinnerClass = useLightSpinner ? 'spinner-sm' : 'spinner-dark';

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      style={{ position: 'relative', ...style }}
      {...rest}
    >
      {loading ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, minHeight: '1em',
        }}>
          <span className={spinnerClass} />
        </span>
      ) : children}
    </button>
  );
}
