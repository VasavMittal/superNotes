const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'handpikd-change-this-secret';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), SECRET());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
  });
}

module.exports = { requireAuth, requireAdmin, SECRET };
