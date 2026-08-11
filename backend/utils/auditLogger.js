const db = require('../config/db');

async function logAudit(adminUsername, action, details = '') {
  try {
    await db.execute(
      'INSERT INTO audit_logs (admin_username, action, details) VALUES (?, ?, ?)',
      [adminUsername || 'admin', action, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
