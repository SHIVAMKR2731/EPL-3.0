const db = require('../config/db');
const { parseExcelFile } = require('../utils/excelImporter');
const { logAudit } = require('../utils/auditLogger');
const fs = require('fs');

// Public Players Endpoint - Strips Contact Numbers strictly
async function getPublicPlayers(req, res) {
  try {
    const { branch, batch, position, status, team_id, search } = req.query;

    let sql = `
      SELECT p.id, p.name, p.batch, p.branch, p.position, p.base_price, p.status, 
             p.team_id, p.final_price, p.image, p.created_at,
             t.name as team_name, t.logo as team_logo
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (branch) {
      sql += ' AND p.branch = ?';
      params.push(branch);
    }
    if (batch) {
      sql += ' AND p.batch = ?';
      params.push(batch);
    }
    if (position) {
      sql += ' AND p.position = ?';
      params.push(position);
    }
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (team_id) {
      sql += ' AND p.team_id = ?';
      params.push(team_id);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.branch LIKE ? OR p.batch LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY p.id ASC';

    const players = await db.query(sql, params);
    res.json({ success: true, count: players.length, players });
  } catch (err) {
    console.error('Error fetching public players:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch players' });
  }
}

// Admin Players Endpoint - Includes Contact Number
async function getAdminPlayers(req, res) {
  try {
    const { branch, batch, position, status, team_id, search } = req.query;

    let sql = `
      SELECT p.*, t.name as team_name, t.logo as team_logo
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (branch) {
      sql += ' AND p.branch = ?';
      params.push(branch);
    }
    if (batch) {
      sql += ' AND p.batch = ?';
      params.push(batch);
    }
    if (position) {
      sql += ' AND p.position = ?';
      params.push(position);
    }
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (team_id) {
      sql += ' AND p.team_id = ?';
      params.push(team_id);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.contact_number LIKE ? OR p.branch LIKE ? OR p.batch LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY p.id ASC';

    const players = await db.query(sql, params);
    res.json({ success: true, count: players.length, players });
  } catch (err) {
    console.error('Error fetching admin players:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch players for admin' });
  }
}

// Get Player Details by ID
async function getPlayerById(req, res) {
  try {
    const { id } = req.params;
    const authHeader = req.headers['authorization'];
    const isAdmin = req.admin || (authHeader && authHeader.startsWith('Bearer '));

    let sql = isAdmin
      ? `SELECT p.*, t.name as team_name, t.logo as team_logo FROM players p LEFT JOIN teams t ON p.team_id = t.id WHERE p.id = ?`
      : `SELECT p.id, p.name, p.batch, p.branch, p.position, p.base_price, p.status, p.team_id, p.final_price, p.image, p.created_at, t.name as team_name, t.logo as team_logo FROM players p LEFT JOIN teams t ON p.team_id = t.id WHERE p.id = ?`;

    const player = await db.get(sql, [id]);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Get Player Stats
    const stats = await db.get('SELECT * FROM player_statistics WHERE player_id = ?', [id]) || {
      matches_played: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 0
    };

    res.json({ success: true, player, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching player details' });
  }
}

// Create Player (Admin)
async function createPlayer(req, res) {
  try {
    const { name, contact_number, batch, branch, position, base_price } = req.body;

    if (!name || !batch || !branch || !position) {
      return res.status(400).json({ success: false, message: 'Name, batch, branch, and position are required' });
    }

    const imagePath = req.file ? `/uploads/players/${req.file.filename}` : '/uploads/players/default.png';

    const result = await db.execute(
      `INSERT INTO players (name, contact_number, batch, branch, position, base_price, image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'REGISTERED')`,
      [name.trim(), contact_number || '', batch, branch, position, (base_price !== undefined && base_price !== '') ? parseInt(base_price, 10) : 20, imagePath]
    );

    // Initialize player statistics entry
    await db.execute('INSERT INTO player_statistics (player_id) VALUES (?)', [result.insertId]);

    await logAudit(req.admin.username, 'CREATE_PLAYER', `Created player ${name} (ID: ${result.insertId})`);

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      playerId: result.insertId
    });
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ success: false, message: 'Failed to create player' });
  }
}

// Update Player (Admin)
async function updatePlayer(req, res) {
  try {
    const { id } = req.params;
    const playerId = parseInt(id, 10);
    const { name, contact_number, batch, branch, position, base_price, status, team_id } = req.body;

    const existing = await db.get('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const imagePath = req.file ? `/uploads/players/${req.file.filename}` : existing.image;
    const assignedTeamId = (team_id !== undefined && team_id !== null && team_id !== '') ? parseInt(team_id, 10) : null;

    await db.execute(
      `UPDATE players 
       SET name = ?, contact_number = ?, batch = ?, branch = ?, position = ?, base_price = ?, status = ?, team_id = ?, image = ?
       WHERE id = ?`,
      [
        name || existing.name,
        contact_number !== undefined ? contact_number : existing.contact_number,
        batch || existing.batch,
        branch || existing.branch,
        position || existing.position,
        base_price !== undefined && base_price !== '' ? parseInt(base_price, 10) : existing.base_price,
        status || existing.status,
        assignedTeamId,
        imagePath,
        playerId
      ]
    );

    const adminUsername = (req.admin && req.admin.username) ? req.admin.username : 'admin';
    await logAudit(adminUsername, 'UPDATE_PLAYER', `Updated player ID: ${playerId}`);

    res.json({ success: true, message: 'Player updated successfully' });
  } catch (err) {
    console.error('Error updating player:', err);
    res.status(500).json({ success: false, message: 'Failed to update player: ' + err.message });
  }
}

// Delete Player (Admin)
async function deletePlayer(req, res) {
  try {
    const { id } = req.params;
    const player = await db.get('SELECT * FROM players WHERE id = ?', [id]);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    await db.execute('DELETE FROM players WHERE id = ?', [id]);
    await logAudit(req.admin.username, 'DELETE_PLAYER', `Deleted player ${player.name} (ID: ${id})`);

    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete player' });
  }
}

// Import Excel / CSV File (Admin)
async function importExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No Excel/CSV file uploaded' });
    }

    const filePath = req.file.path;
    const { players, errors } = await parseExcelFile(filePath);

    // Clean up temporary file
    fs.unlink(filePath, () => {});

    if (players.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid player records found in the file',
        errors
      });
    }

    // Insert parsed players with duplicate check
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const p of players) {
      const existing = await db.get('SELECT id FROM players WHERE name = ? AND branch = ? AND batch = ?', [p.name, p.branch, p.batch]);
      if (existing) {
        duplicateCount++;
        continue;
      }

      const resInsert = await db.execute(
        `INSERT INTO players (name, contact_number, batch, branch, position, base_price, image, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'REGISTERED')`,
        [p.name, p.contact_number, p.batch, p.branch, p.position, p.base_price, p.image]
      );

      await db.execute('INSERT INTO player_statistics (player_id) VALUES (?)', [resInsert.insertId]);
      insertedCount++;
    }

    await logAudit(req.admin.username, 'IMPORT_PLAYERS_EXCEL', `Imported ${insertedCount} players from Excel/CSV (${duplicateCount} duplicates skipped)`);

    res.json({
      success: true,
      message: `Successfully imported ${insertedCount} players. (${duplicateCount} duplicates skipped)`,
      insertedCount,
      duplicateCount,
      errors
    });
  } catch (err) {
    console.error('Error importing Excel:', err);
    res.status(500).json({ success: false, message: 'Failed to process Excel file: ' + err.message });
  }
}

module.exports = {
  getPublicPlayers,
  getAdminPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  importExcel
};
