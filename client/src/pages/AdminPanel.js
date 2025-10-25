import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const defaultSignal = {
  type: 'quick',
  symbol: '',
  entryPrice: '',
  targetPrice: '',
  stopLoss: '',
  confidence: '',
  roi: '',
  riskLevel: 'medium',
  status: 'active',
  expiresAt: '',
};

const signalTypes = [
  { value: 'quick', label: 'Quick Futures' },
  { value: 'spot', label: 'Spot Trades' },
  { value: 'hodl', label: 'Hodl Trades' },
  { value: 'degen', label: 'Degen Alerts' },
];
const riskLevels = ['low', 'medium', 'high'];
const statuses = ['active', 'executed', 'expired', 'cancelled'];

function AdminPanel() {
  const { user, token } = useAuth();
  const [form, setForm] = useState(defaultSignal);
  const [loading, setLoading] = useState(false);

  // Temporarily allow access for testing - remove this in production
  // if (!user || user.role !== 'admin') return (
  //   <div className="admin-page center">
  //     <h2>Admin access required</h2>
  //     <p>You must be an admin to view this page.</p>
  //   </div>
  // );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...form };
      // Convert numeric fields
      ['entryPrice', 'targetPrice', 'stopLoss', 'confidence', 'roi'].forEach(f => {
        if (data[f] !== '') data[f] = Number(data[f]);
      });
      if (!data.symbol) throw new Error('Symbol is required');
      const res = await axios.post('/api/signals', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Signal uploaded!');
      setForm(defaultSignal);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload signal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <h2>Admin Panel: Upload Signal</h2>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Type</label>
          <select name="type" value={form.type} onChange={handleChange} required>
            {signalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Symbol</label>
          <input name="symbol" value={form.symbol} onChange={handleChange} placeholder="e.g. BTCUSDT" required />
        </div>
        <div className="form-row">
          <label>Entry Price</label>
          <input name="entryPrice" type="number" value={form.entryPrice} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <label>Target Price</label>
          <input name="targetPrice" type="number" value={form.targetPrice} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <label>Stop Loss</label>
          <input name="stopLoss" type="number" value={form.stopLoss} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <label>Confidence (%)</label>
          <input name="confidence" type="number" min={0} max={100} value={form.confidence} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <label>Expected ROI (%)</label>
          <input name="roi" type="number" min={0} value={form.roi} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <label>Risk Level</label>
          <select name="riskLevel" value={form.riskLevel} onChange={handleChange} required>
            {riskLevels.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Status</label>
          <select name="status" value={form.status} onChange={handleChange} required>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Expires At</label>
          <input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={handleChange} required />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Uploading...' : 'Upload Signal'}</button>
        </div>
      </form>
    </div>
  );
}

export default AdminPanel;
