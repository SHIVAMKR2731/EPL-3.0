const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateAdmin } = require('../middleware/auth');

router.get('/', settingsController.getSettings);
router.post('/admin/update', authenticateAdmin, settingsController.updateSettings);

module.exports = router;
