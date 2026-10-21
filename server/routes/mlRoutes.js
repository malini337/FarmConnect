const express = require('express');
const protect = require('../middleware/authMiddleware');
const router = express.Router();
const base = String(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const timeoutMs = Math.max(500, Math.min(Number(process.env.ML_SERVICE_TIMEOUT_MS) || 4000, 15000));

async function requestMl(path, method = 'GET', body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}${path}`, {
      method, signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { httpStatus: response.status, payload };
    return { httpStatus: response.status, payload };
  } finally { clearTimeout(timer); }
}

router.get('/health', async (_req, res) => {
  try { const r = await requestMl('/health'); return res.status(r.httpStatus).json(r.payload); }
  catch (error) { return res.status(503).json({ status: 'model_unavailable', message: 'ML service is unavailable.', detail: error.name === 'AbortError' ? 'timeout' : 'connection_failed' }); }
});
router.get('/models/status', protect, async (_req, res) => {
  try { const r = await requestMl('/models/status'); return res.status(r.httpStatus).json(r.payload); }
  catch (error) { return res.status(503).json({ status: 'model_unavailable', message: 'ML service is unavailable.', detail: error.name === 'AbortError' ? 'timeout' : 'connection_failed' }); }
});
router.post('/demo/price', protect, async (req, res) => {
  const { product, category, month, quantity_kg, quality_grade = 2 } = req.body || {};
  if (typeof product !== 'string' || !product.trim() || typeof category !== 'string' || !category.trim() || !Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12 || !Number.isFinite(Number(quantity_kg)) || Number(quantity_kg) <= 0 || Number(quantity_kg) > 100000 || !Number.isInteger(Number(quality_grade)) || Number(quality_grade) < 1 || Number(quality_grade) > 3) return res.status(400).json({ status: 'invalid_input', message: 'Provide product, category, month 1–12, quantity in kg > 0, and quality grade 1–3.' });
  try { const r = await requestMl('/demo/price', 'POST', { product: product.trim(), category: category.trim(), month: Number(month), quantity_kg: Number(quantity_kg), quality_grade: Number(quality_grade) }); return res.status(r.httpStatus).json(r.payload); }
  catch (error) { return res.status(503).json({ status: 'model_unavailable', message: 'Synthetic price demo model is unavailable. No fallback prediction was substituted.' }); }
});
router.post('/demo/demand', protect, async (req, res) => {
  const { product, category, month, recent_monthly_quantity_kg } = req.body || {};
  if (typeof product !== 'string' || !product.trim() || typeof category !== 'string' || !category.trim() || !Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12 || !Number.isFinite(Number(recent_monthly_quantity_kg)) || Number(recent_monthly_quantity_kg) < 0 || Number(recent_monthly_quantity_kg) > 1000000) return res.status(400).json({ status: 'invalid_input', message: 'Provide product, category, month 1–12, and a non-negative recent monthly quantity in kg.' });
  try { const r = await requestMl('/demo/demand', 'POST', { product: product.trim(), category: category.trim(), month: Number(month), recent_monthly_quantity_kg: Number(recent_monthly_quantity_kg) }); return res.status(r.httpStatus).json(r.payload); }
  catch (error) { return res.status(503).json({ status: 'model_unavailable', message: 'Synthetic demand demo model is unavailable. No fallback prediction was substituted.' }); }
});
module.exports = router;
