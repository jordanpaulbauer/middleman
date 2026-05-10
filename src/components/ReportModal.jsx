import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { Auth } from '../services';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

const REASONS = [
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'illegal', label: 'Illegal item or activity' },
  { value: 'misleading', label: 'Misleading description' },
  { value: 'spam', label: 'Spam or duplicate' },
  { value: 'other', label: 'Other' },
];

// Submit a report against a listing, user, message, or review. Writes to the
// `reports` table; admin reviews via dashboard (UI for that is later).
export default function ReportModal({ entityType, entityId, entityLabel, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const user = Auth.getUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    setError('');
    try {
      if (!user?.id) {
        throw new Error('Sign in to report.');
      }
      if (!isSupabaseEnabled) {
        // Demo mode: just close the modal so the UX is testable.
        onSubmitted?.();
        return;
      }
      const { error: dbErr } = await supabase.from('reports').insert({
        reporter_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        reason: REASONS.find(r => r.value === reason)?.label || reason,
        details: details || null,
      });
      if (dbErr) throw new Error(dbErr.message);
      onSubmitted?.();
    } catch (err) {
      setError(err?.message || 'Could not submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flag size={16} color="var(--text-muted)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Report {entityType}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)',
          }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          {entityLabel && (
            <div style={{
              padding: '10px 14px', background: 'var(--bg-subtle)',
              borderRadius: 10, fontSize: 13, color: 'var(--text-muted)',
              marginBottom: 18,
            }}>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{entityLabel}</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={inputLabel}>What's the issue?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REASONS.map((r) => (
                <label key={r.value} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid ' + (reason === r.value ? 'var(--rausch)' : 'var(--border)'),
                  cursor: 'pointer', fontSize: 14,
                }}>
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={inputLabel}>Details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything else our team should know?"
              maxLength={1000}
              rows={3}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)', borderRadius: 10,
                fontSize: 14, color: 'var(--text)', outline: 'none',
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--red-light)', color: 'var(--red)',
              borderRadius: 10, fontSize: 14, marginBottom: 14,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={!reason || submitting}
            style={{
              width: '100%', padding: '12px 18px',
              background: 'var(--rausch)', color: 'white', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: (!reason || submitting) ? 'not-allowed' : 'pointer',
              opacity: (!reason || submitting) ? 0.6 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>

          <div style={{
            textAlign: 'center', fontSize: 12, color: 'var(--text-light)', marginTop: 12,
          }}>
            Reports are reviewed by our trust & safety team. Abuse of reporting is itself a violation.
          </div>
        </form>
      </div>
    </div>
  );
}

const inputLabel = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
};
