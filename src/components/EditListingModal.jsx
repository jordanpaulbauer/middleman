import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Listings } from '../services';
import { CATEGORIES, CONDITIONS } from '../data/demo';

// Lightweight modal for editing core listing fields. Reuses PostListing's
// shape but only exposes safe-to-change fields (no photos here — those
// have separate upload UX). RLS prevents editing a claimed listing.
export default function EditListingModal({ listing, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: listing.title || '',
    description: listing.description || '',
    category: listing.category || '',
    condition: listing.condition || '',
    location: listing.location || '',
    price: String(listing.price || ''),
    commission: String(listing.commission || ''),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await Listings.update(listing.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        condition: form.condition,
        location: form.location.trim() || null,
        price: parseInt(form.price) || 0,
        commission: parseInt(form.commission) || 0,
      });
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Could not save changes');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Edit listing</span>
          <button onClick={onClose} aria-label="Close" style={iconBtn}><X size={18} /></button>
        </div>

        <form onSubmit={handleSave} style={{ padding: 22 }}>
          <Field label="Title">
            <input className="input" value={form.title}
              onChange={(e) => set('title', e.target.value)} required />
          </Field>
          <Field label="Description">
            <textarea className="input" rows={3} value={form.description}
              onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category">
              <select className="input" value={form.category}
                onChange={(e) => set('category', e.target.value)} required>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Condition">
              <select className="input" value={form.condition}
                onChange={(e) => set('condition', e.target.value)} required>
                <option value="">Select…</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Location">
            <input className="input" value={form.location}
              onChange={(e) => set('location', e.target.value)} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Asking price (USD)">
              <input className="input" type="number" min="0" value={form.price}
                onChange={(e) => set('price', e.target.value)} required />
            </Field>
            <Field label="Commission (%)">
              <input className="input" type="number" min="0" max="50" value={form.commission}
                onChange={(e) => set('commission', e.target.value)} required />
            </Field>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--red-light)', color: 'var(--red)',
              borderRadius: 10, fontSize: 14, marginTop: 14,
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="input-group" style={{ marginBottom: 12 }}>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

const iconBtn = {
  width: 32, height: 32, borderRadius: '50%',
  background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text)',
};
