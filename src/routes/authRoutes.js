const express  = require('express');
const bcrypt   = require('bcryptjs');
const PortalUser = require('../models/PortalUser');
const router   = express.Router();

// Only allowed when zero portal users exist
router.get('/needs-setup', async (req, res) => {
  try {
    const count = await PortalUser.countDocuments();
    res.json({ needsSetup: count === 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/setup', async (req, res) => {
  try {
    const count = await PortalUser.countDocuments();
    if (count > 0) return res.status(403).json({ error: 'Setup already complete' });
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    const passwordHash = await bcrypt.hash(password, 10);
    await PortalUser.create({ name, email, passwordHash, isAdmin: true, points: 0 });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await PortalUser.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    req.session.userId  = user._id.toString();
    req.session.isAdmin = user.isAdmin || false;
    res.json({ isAdmin: user.isAdmin || false, name: user.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await PortalUser.findById(req.session.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ...user.toObject(), isAdmin: req.session.isAdmin });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
