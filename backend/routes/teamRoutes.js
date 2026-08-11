const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);

// Admin routes
router.post('/admin/create', authenticateAdmin, upload.single('teamLogo'), teamController.createTeam);
router.put('/admin/:id', authenticateAdmin, upload.single('teamLogo'), teamController.updateTeam);
router.delete('/admin/:id', authenticateAdmin, teamController.deleteTeam);

module.exports = router;
