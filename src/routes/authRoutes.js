const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const PortalUser = require('../models/PortalUser');
const { requireAuth, SECRET } = require('../middleware/portalAuth');
const router     = express.Router();

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
    const token = jwt.sign(
      { userId: user._id.toString(), isAdmin: user.isAdmin || false },
      SECRET(),
      { expiresIn: '7d' }
    );
    res.json({ token, isAdmin: user.isAdmin || false, name: user.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logout is handled client-side (delete token from localStorage)
router.post('/logout', (req, res) => res.json({ success: true }));

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await PortalUser.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ...user.toObject(), isAdmin: req.user.isAdmin });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
