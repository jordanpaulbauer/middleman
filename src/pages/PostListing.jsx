import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Listings } from '../services';
import { CATEGORIES, CONDITIONS, formatMoney } from '../data/demo';
import { useToast } from '../hooks/useToast';
import Seo from '../components/Seo';

export default function PostListing() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileRef = useRef();

  const [form, setForm] = useState({
    title: '', category: '', condition: '', location: '', description: '',
    price: '', commission: '10',
  });
  const [photos, setPhotos] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const price = parseInt(form.price) || 0;
  const commPct = parseInt(form.commission) || 0;
  const payout = Math.round(price * commPct / 100);

  const handleFiles = async (files) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const valid = Array.from(files).filter(f => allowed.includes(f.type));
    if (photos.length + valid.length > 10) {
      addToast({ type: 'error', title: 'Max 10 photos' });
      return;
    }
    setCompressing(true);
    try {
      const processed = await Promise.all(valid.map(compressImage));
      setPhotos(prev => [...prev, ...processed]);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not process photos',
        message: err?.message || 'Try again with different images.',
      });
      console.error('[PostListing] compress failed:', err);
    } finally {
      setCompressing(false);
    }
  };

  // Compress in-browser and inline as a base64 data URL. Keeps the flow
  // entirely client-side — no Storage roundtrip — so it works even when
  // the user's network blocks the storage subdomain. Trade-off: row size
  // grows with photo count, so we keep the dimension cap modest.
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const max = 1200;
          if (w > max || h > max) {
            if (w > h) { h = Math.round(h * max / w); w = max; }
            else { w = Math.round(w * max / h); h = max; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const size = Math.round((dataUrl.length * 3) / 4 / 1024);
          resolve({ url: dataUrl, name: file.name, size });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.price) {
      addToast({ type: 'error', title: 'Please fill required fields' });
      return;
    }
    setSubmitting(true);
    try {
      await Listings.create({
        title: form.title, category: form.category, condition: form.condition,
        location: form.location, description: form.description,
        price: parseInt(form.price), commission: parseInt(form.commission),
        photos: photos.length > 0 ? photos.map(p => p.url) : ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=450&fit=crop'],
      });
      addToast({ type: 'success', title: 'Listing Posted!', message: 'Your listing is now live.' });
      navigate('/seller');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not post listing',
        message: err?.message || 'Unknown error — check console for details',
      });
      console.error('[PostListing] create failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <Seo title="Post a listing" noIndex />
      <div className="page-header">
        <div className="page-title">Post a Listing</div>
        <div className="page-subtitle">List an item for closers to sell</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. 2019 Caterpillar 320 Excavator" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Category *</label>
                <select className="select" value={form.category} onChange={e => set('category', e.target.value)} required>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Condition</label>
                <select className="select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                  <option value="">Select...</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Location</label>
              <input className="input" value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="City, State" />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="textarea" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe the item, its condition, and any relevant details..."
                style={{ minHeight: 120 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Asking Price ($) *</label>
                <input className="input" type="number" value={form.price} onChange={e => set('price', e.target.value)}
                  placeholder="0" min="1" required />
              </div>
              <div className="input-group">
                <label className="input-label">Commission (%)</label>
                <input className="input" type="number" value={form.commission} onChange={e => set('commission', e.target.value)}
                  placeholder="10" min="1" max="50" />
                <div className="input-hint">Higher commission attracts more closers</div>
              </div>
            </div>

            {price > 0 && (
              <div style={{ background: 'var(--accent-light)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Closer payout on this deal:</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--green)' }}>{formatMoney(payout)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Photo Upload */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="input-label" style={{ marginBottom: 12 }}>Photos (max 10)</div>

          <div onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: 40,
              textAlign: 'center', cursor: 'pointer', background: 'var(--bg-subtle)',
              transition: 'border-color 150ms',
            }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
              style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            {compressing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="spinner-dark" />
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Optimizing photos…</span>
              </div>
            ) : (
              <>
                <Upload size={32} color="var(--text-light)" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Click or drag photos here</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>JPG, PNG, WebP · Max 10 photos</div>
              </>
            )}
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              {photos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', width: 100, height: 75, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 0 && (
                    <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, fontWeight: 500, background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>
                      COVER
                    </span>
                  )}
                  <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, background: 'rgba(0,0,0,.6)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>
                    {photo.size}KB
                  </span>
                  <button onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? <div className="spinner" /> : 'Post Listing'}
        </button>
      </form>
    </div>
  );
}
