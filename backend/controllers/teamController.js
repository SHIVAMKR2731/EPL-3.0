const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

async function getAllTeams(req, res) {
  try {
    const teams = await db.query(`
      SELECT t.*, 
             COUNT(p.id) as squad_count,
             COALESCE(SUM(p.final_price), 0) as total_squad_value
      FROM teams t
      LEFT JOIN players p ON t.id = p.team_id
      GROUP BY t.id
      ORDER BY t.id ASC
    `);
    res.json({ success: true, count: teams.length, teams });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch teams' });
  }
}

async function getTeamById(req, res) {
  try {
    const { id } = req.params;
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [id]);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Get Squad Players (Stripped contact info for safety)
    const players = await db.query(
      `SELECT id, name, batch, branch, position, base_price, final_price, status, image
       FROM players 
       WHERE team_id = ? 
       ORDER BY CASE position 
         WHEN 'Goalkeeper' THEN 1 
         WHEN 'Defender' THEN 2 
         WHEN 'Midfielder' THEN 3 
         WHEN 'Forward' THEN 4 
         ELSE 5 END`,
      [id]
    );

    // Group players by position for football formation
    const squadByPosition = {
      Goalkeepers: players.filter(p => p.position === 'Goalkeeper'),
      Defenders: players.filter(p => p.position === 'Defender'),
      Midfielders: players.filter(p => p.position === 'Midfielder'),
      Forwards: players.filter(p => p.position === 'Forward')
    };

    // Calculate total squad value
    const totalSquadValue = players.reduce((sum, p) => sum + (p.final_price || 0), 0);

    // Get Team Standings & Stats
    const pointsRecord = await db.get('SELECT * FROM points_table WHERE team_id = ?', [id]) || {
      played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0
    };

    res.json({
      success: true,
      team: {
        ...team,
        total_squad_value: totalSquadValue,
        squad_count: players.length
      },
      squad: players,
      squadByPosition,
      stats: pointsRecord
    });
  } catch (err) {
    console.error('Error fetching team details:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch team details' });
  }
}

async function createTeam(req, res) {
  try {
    const { name, captain_name, owner_name, initial_budget } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    const logoPath = req.file ? `/uploads/teams/${req.file.filename}` : '/uploads/teams/default.png';
    const budget = parseInt(initial_budget, 10) || 10000;

    const result = await db.execute(
      `INSERT INTO teams (name, logo, captain_name, owner_name, initial_budget, remaining_budget)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), logoPath, captain_name || '', owner_name || '', budget, budget]
    );

    // Create entry in points_table
    await db.execute('INSERT INTO points_table (team_id) VALUES (?)', [result.insertId]);

    await logAudit(req.admin.username, 'CREATE_TEAM', `Created team ${name} (ID: ${result.insertId})`);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      teamId: result.insertId
    });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ success: false, message: 'Failed to create team. Name must be unique.' });
  }
}

async function updateTeam(req, res) {
  try {
    const { id } = req.params;
    const { name, captain_name, owner_name, initial_budget, remaining_budget } = req.body;

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [id]);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const logoPath = req.file ? `/uploads/teams/${req.file.filename}` : team.logo;

    await db.execute(
      `UPDATE teams
       SET name = ?, logo = ?, captain_name = ?, owner_name = ?, initial_budget = ?, remaining_budget = ?
       WHERE id = ?`,
      [
        name || team.name,
        logoPath,
        captain_name !== undefined ? captain_name : team.captain_name,
        owner_name !== undefined ? owner_name : team.owner_name,
        initial_budget !== undefined ? parseInt(initial_budget, 10) : team.initial_budget,
        remaining_budget !== undefined ? parseInt(remaining_budget, 10) : team.remaining_budget,
        id
      ]
    );

    await logAudit(req.admin.username, 'UPDATE_TEAM', `Updated team ID: ${id}`);

    res.json({ success: true, message: 'Team updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update team' });
  }
}

async function deleteTeam(req, res) {
  try {
    const { id } = req.params;
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [id]);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    await db.execute('DELETE FROM teams WHERE id = ?', [id]);
    await logAudit(req.admin.username, 'DELETE_TEAM', `Deleted team ${team.name} (ID: ${id})`);

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete team' });
  }
}

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
};
