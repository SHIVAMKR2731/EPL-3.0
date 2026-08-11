const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const { authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', playerController.getPublicPlayers);
router.get('/:id', playerController.getPlayerById);

// Protected Admin routes
router.get('/admin/all', authenticateAdmin, playerController.getAdminPlayers);
router.post('/admin/create', authenticateAdmin, upload.single('image'), playerController.createPlayer);
router.put('/admin/:id', authenticateAdmin, upload.single('image'), playerController.updatePlayer);
router.delete('/admin/:id', authenticateAdmin, playerController.deletePlayer);
router.post('/admin/import', authenticateAdmin, upload.single('excelFile'), playerController.importExcel);

module.exports = router;
