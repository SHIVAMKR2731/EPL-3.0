const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/points-table', statsController.getPointsTable);
router.get('/player-stats', statsController.getPlayerStats);
router.get('/home-widgets', statsController.getHomeWidgets);

module.exports = router;
