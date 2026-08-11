const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController');
const { authenticateAdmin } = require('../middleware/auth');

// Public route - STRICTLY hides next player
router.get('/current', auctionController.getPublicAuctionState);

// Protected Admin routes
router.get('/admin/state', authenticateAdmin, auctionController.getAdminAuctionState);
router.post('/admin/start', authenticateAdmin, auctionController.startAuction);
router.post('/admin/bid', authenticateAdmin, auctionController.placeBid);
router.post('/admin/sell', authenticateAdmin, auctionController.sellPlayer);
router.post('/admin/unsold', authenticateAdmin, auctionController.markUnsold);
router.post('/admin/toggle-pause', authenticateAdmin, auctionController.togglePause);
router.post('/admin/reset-timer', authenticateAdmin, auctionController.resetTimer);

module.exports = router;
