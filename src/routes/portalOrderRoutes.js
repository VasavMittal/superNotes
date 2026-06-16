const express     = require('express');
const PortalOrder = require('../models/PortalOrder');
const router      = express.Router();

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// ── Admin: list orders (optionally filtered by userId) ──────────
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const filter = req.query.userId ? { userId: req.query.userId } : {};
    const orders = await PortalOrder.find(filter, { invoicePdf: 0 }).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: create order for a user
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { userId, orderNumber, description, amount, status, notes, invoicePdf, invoiceName } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const order = await PortalOrder.create({
      userId, orderNumber: orderNumber || '', description: description || '',
      amount: parseFloat(amount) || 0, status: status || 'pending',
      notes: notes || '', invoicePdf: invoicePdf || null, invoiceName: invoiceName || null
    });
    res.status(201).json({ id: order._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: update order
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { orderNumber, description, amount, status, notes, invoicePdf, invoiceName } = req.body;
    const update = {
      orderNumber: orderNumber || '', description: description || '',
      amount: parseFloat(amount) || 0, status: status || 'pending',
      notes: notes || '', updatedAt: new Date()
    };
    if (invoicePdf !== undefined) { update.invoicePdf = invoicePdf; update.invoiceName = invoiceName; }
    await PortalOrder.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: delete order
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await PortalOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── User: their own orders (no invoice PDF) ─────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await PortalOrder
      .find({ userId: req.session.userId }, { invoicePdf: 0 })
      .sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User/admin: download invoice (user can only fetch their own)
router.get('/:id/invoice', requireAuth, async (req, res) => {
  try {
    const order = await PortalOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (!req.session.isAdmin && order.userId.toString() !== req.session.userId)
      return res.status(403).json({ error: 'Forbidden' });
    if (!order.invoicePdf) return res.status(404).json({ error: 'No invoice attached' });
    res.json({ invoicePdf: order.invoicePdf, invoiceName: order.invoiceName });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
