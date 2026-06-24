const express     = require('express');
const PortalOrder = require('../models/PortalOrder');
const PortalUser  = require('../models/PortalUser');
const { requireAuth, requireAdmin } = require('../middleware/portalAuth');
const router      = express.Router();

function getFinancialYearRange(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year  = d.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  return {
    start: new Date(fyStart, 3, 1),
    end:   new Date(fyStart + 1, 2, 31, 23, 59, 59, 999),
    label: `${fyStart}-${String(fyStart + 1).slice(2)}`
  };
}

// Admin: overview / analytics
router.get('/admin/overview', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalOrders, statusAgg, revenueAgg, topCustomers, recentOrders, monthlyAgg] = await Promise.all([
      PortalUser.countDocuments({ isAdmin: false }),
      PortalOrder.countDocuments(),
      PortalOrder.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$amount' } } }]),
      PortalOrder.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      PortalOrder.aggregate([
        { $group: { _id: '$userId', totalSpent: { $sum: '$amount' }, orderCount: { $sum: 1 } } },
        { $sort: { totalSpent: -1 } }, { $limit: 5 },
        { $lookup: { from: 'portalusers', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', email: '$user.email', company: '$user.company', totalSpent: 1, orderCount: 1 } }
      ]),
      PortalOrder.find({}, { invoicePdf: 0 }).sort({ createdAt: -1 }).limit(8)
        .populate('userId', 'name company').lean(),
      PortalOrder.aggregate([
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 6 }
      ])
    ]);

    const statusMap = { pending: 0, processing: 0, delivered: 0, cancelled: 0 };
    statusAgg.forEach(s => { if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count; });

    res.json({
      totalUsers,
      totalOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
      statusBreakdown: statusMap,
      topCustomers,
      recentOrders,
      monthlyRevenue: monthlyAgg
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: download all invoices in a date range (returns PDF data for ZIP)
router.get('/admin/invoices', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { invoicePdf: { $ne: null } };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
    }
    const orders = await PortalOrder.find(filter).sort({ createdAt: -1 }).lean();
    res.json(orders.map(o => ({
      orderNumber: o.orderNumber || o._id.toString(),
      invoicePdf:  o.invoicePdf,
      invoiceName: o.invoiceName || 'invoice.pdf',
      createdAt:   o.createdAt
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: all orders with user info, sorted by order number (used by Orders tab)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const orders = await PortalOrder.find({}, { invoicePdf: 0 })
      .sort({ orderNumber: 1 })
      .populate('userId', 'name company email')
      .lean();
    const result = orders.map(o => ({
      ...o,
      user:   o.userId || null,
      userId: o.userId?._id?.toString() || null
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
    const { userId, orderNumber, description, amount, status, notes, invoicePdf, invoiceName, orderDate } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const effectiveDate = orderDate ? new Date(orderDate) : new Date();
    if (orderNumber) {
      const { start, end, label } = getFinancialYearRange(effectiveDate);
      const dup = await PortalOrder.findOne({ orderNumber, createdAt: { $gte: start, $lte: end } });
      if (dup) return res.status(409).json({ error: `Order number "${orderNumber}" already exists in FY ${label}.` });
    }
    const order = await PortalOrder.create({
      userId, orderNumber: orderNumber || '', description: description || '',
      amount: parseFloat(amount) || 0, status: status || 'pending',
      notes: notes || '', invoicePdf: invoicePdf || null, invoiceName: invoiceName || null,
      createdAt: effectiveDate
    });
    res.status(201).json({ id: order._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: update order
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { orderNumber, description, amount, status, notes, invoicePdf, invoiceName, orderDate } = req.body;
    if (orderNumber) {
      const existing = await PortalOrder.findById(req.params.id).select('createdAt');
      const refDate  = orderDate ? new Date(orderDate) : (existing?.createdAt || new Date());
      const { start, end, label } = getFinancialYearRange(refDate);
      const dup = await PortalOrder.findOne({
        orderNumber, createdAt: { $gte: start, $lte: end }, _id: { $ne: req.params.id }
      });
      if (dup) return res.status(409).json({ error: `Order number "${orderNumber}" already exists in FY ${label}.` });
    }
    const update = {
      orderNumber: orderNumber || '', description: description || '',
      amount: parseFloat(amount) || 0, status: status || 'pending',
      notes: notes || '', updatedAt: new Date()
    };
    if (orderDate) update.createdAt = new Date(orderDate);
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
      .find({ userId: req.user.userId }, { invoicePdf: 0 })
      .sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User/admin: download invoice (user can only fetch their own)
router.get('/:id/invoice', requireAuth, async (req, res) => {
  try {
    const order = await PortalOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (!req.user.isAdmin && order.userId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Forbidden' });
    if (!order.invoicePdf) return res.status(404).json({ error: 'No invoice attached' });
    res.json({ invoicePdf: order.invoicePdf, invoiceName: order.invoiceName });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
