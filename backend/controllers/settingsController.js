const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

async function getSettings(req, res) {
  try {
    const settings = await db.query('SELECT * FROM tournament_settings');
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key_name] = s.value_data;
    });

    res.json({ success: true, settings: settingsMap });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
}

async function updateSettings(req, res) {
  try {
    const settingsObj = req.body; // Key-value map

    for (const [key, val] of Object.entries(settingsObj)) {
      const existing = await db.get('SELECT key_name FROM tournament_settings WHERE key_name = ?', [key]);
      if (existing) {
        await db.execute('UPDATE tournament_settings SET value_data = ? WHERE key_name = ?', [String(val), key]);
      } else {
        await db.execute('INSERT INTO tournament_settings (key_name, value_data) VALUES (?, ?)', [key, String(val)]);
      }
    }

    const adminUsername = (req.admin && req.admin.username) ? req.admin.username : 'admin';
    await logAudit(adminUsername, 'UPDATE_SETTINGS', 'Updated tournament settings');

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
