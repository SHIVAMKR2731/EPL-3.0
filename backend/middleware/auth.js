const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'epl3_super_secret_jwt_key_2026_sports_league';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = {
  authenticateAdmin,
  JWT_SECRET
};
