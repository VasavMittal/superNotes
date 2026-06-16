const express    = require('express');
const bcrypt     = require('bcryptjs');
const PortalUser  = require('../models/PortalUser');
const PortalOrder = require('../models/PortalOrder');
const router     = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// List all users with their order counts
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users  = await PortalUser.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    const counts = await PortalOrder.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]);
    const map    = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
    users.forEach(u => { u.orderCount = map[u._id.toString()] || 0; });
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create user
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, company, password, points, isAdmin } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    const exists = await PortalUser.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await PortalUser.create({
      name, email, phone: phone || '', company: company || '',
      passwordHash, points: parseInt(points) || 0, isAdmin: !!isAdmin
    });
    res.status(201).json({ id: user._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update user
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, company, password, points, isAdmin } = req.body;
    const update = {
      name, email: email.toLowerCase().trim(), phone: phone || '',
      company: company || '', points: parseInt(points) || 0,
      isAdmin: !!isAdmin, updatedAt: new Date()
    };
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    await PortalUser.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete user + their orders
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await PortalUser.findByIdAndDelete(req.params.id);
    await PortalOrder.deleteMany({ userId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
