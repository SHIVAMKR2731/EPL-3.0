const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticateAdmin } = require('../middleware/auth');

// Public routes
router.get('/', matchController.getAllMatches);
router.get('/:id', matchController.getMatchById);

// Admin routes
router.post('/admin/create', authenticateAdmin, matchController.createMatch);
router.post('/admin/:id/start', authenticateAdmin, matchController.startMatchTimer);
router.post('/admin/:id/event', authenticateAdmin, matchController.recordMatchEvent);
router.post('/admin/:id/finish', authenticateAdmin, matchController.finishMatch);

module.exports = router;
