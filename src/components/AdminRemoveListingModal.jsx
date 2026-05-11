import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Admin } from '../services';
import { useToast } from '../hooks/useToast';

const PRESET_REASONS = [
  'Prohibited item',
  'Misleading information',
  'Inappropriate content',
  'Spam or duplicate',
  'Counterfeit or stolen',
  'Other (see message)',
];

// Admin-only moderation modal. Triggered by the small "Remove" affordance
// that only renders for users with profile.is_admin = true. Calls the
// admin-remove-listing edge function which deletes the listing, logs to
// audit_log, and sends a Resend email to the seller with the reason.
export default function AdminRemoveListingModal({ listing, onClose, onRemoved }) {
  const [reason, setReason] = useState(PRESET_REASONS[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!listing) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await Admin.removeListing(listing.id, { reason, customMessage });
      addToast({
        type: 'success',
        title: 'Listing removed',
        message: result.email_sent
          ? `Seller notified at ${result.seller_email}`
          : `Removed, but email failed: ${result.email_error || 'unknown'}`,
      });
      onRemoved?.(listing.id);
      onClose?.();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not remove listing',
        message: err?.message || 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="var(--rausch)" /> Remove listing
          </div>
          <button className="modal-close" onClick={onClose}><span style={{ fontSize: 18 }}>×</span></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>You're about to remove</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{listing.title}</div>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Reason</label>
            <select
              className="select"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={submitting}
            >
              {PRESET_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Message to seller (optional)</label>
            <textarea
              className="textarea"
              placeholder="Add context the seller should know — e.g., what to change before re-listing."
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              disabled={submitting}
              rows={4}
            />
            <div className="input-hint">
              The seller will receive an email with the reason above plus this message.
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: 'var(--rausch)' }}
          >
            {submitting ? 'Removing…' : 'Remove & notify seller'}
          </button>
        </div>
      </div>
    </div>
  );
}
