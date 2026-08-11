const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

let ioInstance = null;
function setSocketInstance(io) {
  ioInstance = io;
}

// Get All Matches (Supports filter by status)
async function getAllMatches(req, res) {
  try {
    const { status } = req.query;
    let sql = `
      SELECT m.*, 
             t1.name as team_a_name, t1.logo as team_a_logo,
             t2.name as team_b_name, t2.logo as team_b_logo
      FROM matches m
      JOIN teams t1 ON m.team_a_id = t1.id
      JOIN teams t2 ON m.team_b_id = t2.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY m.id DESC';

    const matches = await db.query(sql, params);
    res.json({ success: true, count: matches.length, matches });
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
}

// Get Match Details & Live Events Timeline
async function getMatchById(req, res) {
  try {
    const { id } = req.params;

    const match = await db.get(
      `SELECT m.*, 
              t1.name as team_a_name, t1.logo as team_a_logo,
              t2.name as team_b_name, t2.logo as team_b_logo
       FROM matches m
       JOIN teams t1 ON m.team_a_id = t1.id
       JOIN teams t2 ON m.team_b_id = t2.id
       WHERE m.id = ?`,
      [id]
    );

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Get Squad Lineups for Team A & Team B
    const teamAPlayers = await db.query(
      `SELECT id, name, position, image FROM players WHERE team_id = ? ORDER BY position`,
      [match.team_a_id]
    );

    const teamBPlayers = await db.query(
      `SELECT id, name, position, image FROM players WHERE team_id = ? ORDER BY position`,
      [match.team_b_id]
    );

    // Get Match Events Timeline
    const events = await db.query(
      `SELECT e.*, 
              p.name as player_name, p.image as player_image,
              pa.name as assist_player_name,
              t.name as team_name, t.logo as team_logo
       FROM match_events e
       JOIN players p ON e.player_id = p.id
       LEFT JOIN players pa ON e.assist_player_id = pa.id
       JOIN teams t ON e.team_id = t.id
       WHERE e.match_id = ?
       ORDER BY e.minute ASC, e.id ASC`,
      [id]
    );

    // Compute live elapsed seconds server side
    let elapsedSeconds = match.timer_accumulated_seconds || 0;
    if (match.status === 'LIVE' && match.timer_started_at) {
      const delta = Math.floor((Date.now() - match.timer_started_at) / 1000);
      elapsedSeconds += delta;
    }

    res.json({
      success: true,
      match: {
        ...match,
        elapsed_seconds: elapsedSeconds
      },
      lineups: {
        team_a: teamAPlayers,
        team_b: teamBPlayers
      },
      events
    });
  } catch (err) {
    console.error('Error fetching match details:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch match details' });
  }
}

// Create Match (Admin)
async function createMatch(req, res) {
  try {
    const { match_number, match_name, date, time, venue, team_a_id, team_b_id } = req.body;

    if (!team_a_id || !team_b_id || !date || !time) {
      return res.status(400).json({ success: false, message: 'Teams, date, and time are required' });
    }

    if (parseInt(team_a_id, 10) === parseInt(team_b_id, 10)) {
      return res.status(400).json({ success: false, message: 'Cannot schedule a match with a team against itself!' });
    }

    const num = parseInt(match_number, 10) || (await db.get('SELECT COUNT(*) as cnt FROM matches')).cnt + 1;

    const result = await db.execute(
      `INSERT INTO matches (match_number, match_name, date, time, venue, team_a_id, team_b_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'UPCOMING')`,
      [num, match_name || `Match ${num}`, date, time, venue || 'Main Stadium', team_a_id, team_b_id]
    );

    await logAudit(req.admin.username, 'CREATE_MATCH', `Scheduled Match #${num} (ID: ${result.insertId})`);

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      matchId: result.insertId
    });
  } catch (err) {
    console.error('Error creating match:', err);
    res.status(500).json({ success: false, message: 'Failed to create match' });
  }
}

// Start / Live Timer Controls (Admin)
async function startMatchTimer(req, res) {
  try {
    const { id } = req.params;
    const match = await db.get('SELECT * FROM matches WHERE id = ?', [id]);

    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const now = Date.now();
    await db.execute(
      `UPDATE matches SET status = 'LIVE', timer_started_at = ? WHERE id = ?`,
      [now, id]
    );

    await logAudit(req.admin.username, 'START_MATCH', `Started live match ID: ${id}`);

    if (ioInstance) {
      ioInstance.emit('match_started', { match_id: id, status: 'LIVE', timer_started_at: now });
    }

    res.json({ success: true, message: 'Match is now LIVE', status: 'LIVE' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start match timer' });
  }
}

// Record Match Event (Goal, Card, Substitution)
async function recordMatchEvent(req, res) {
  try {
    const { id } = req.params; // match_id
    const { team_id, player_id, assist_player_id, event_type, minute, details } = req.body;

    if (!team_id || !player_id || !event_type || minute === undefined) {
      return res.status(400).json({ success: false, message: 'Team, player, event type, and minute are required' });
    }

    const match = await db.get('SELECT * FROM matches WHERE id = ?', [id]);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Validate player belongs to the specified team
    const player = await db.get('SELECT * FROM players WHERE id = ? AND team_id = ?', [player_id, team_id]);
    if (!player) {
      return res.status(400).json({ success: false, message: 'Selected player does not belong to this team squad!' });
    }

    let assistPlayer = null;
    if (assist_player_id) {
      assistPlayer = await db.get('SELECT * FROM players WHERE id = ? AND team_id = ?', [assist_player_id, team_id]);
    }

    // Insert Event
    await db.execute(
      `INSERT INTO match_events (match_id, team_id, player_id, assist_player_id, event_type, minute, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, team_id, player_id, assist_player_id || null, event_type, parseInt(minute, 10), details || '']
    );

    // Update Score if Goal
    let teamAScore = match.team_a_score;
    let teamBScore = match.team_b_score;

    if (event_type === 'GOAL' || event_type === 'PENALTY') {
      if (parseInt(team_id, 10) === match.team_a_id) {
        teamAScore++;
      } else if (parseInt(team_id, 10) === match.team_b_id) {
        teamBScore++;
      }
      await db.execute('UPDATE matches SET team_a_score = ?, team_b_score = ? WHERE id = ?', [teamAScore, teamBScore, id]);

      // Increment Player Goals stat
      await db.execute('UPDATE player_statistics SET goals = goals + 1 WHERE player_id = ?', [player_id]);
      if (assist_player_id) {
        await db.execute('UPDATE player_statistics SET assists = assists + 1 WHERE player_id = ?', [assist_player_id]);
      }
    } else if (event_type === 'YELLOW_CARD') {
      await db.execute('UPDATE player_statistics SET yellow_cards = yellow_cards + 1 WHERE player_id = ?', [player_id]);
    } else if (event_type === 'RED_CARD') {
      await db.execute('UPDATE player_statistics SET red_cards = red_cards + 1 WHERE player_id = ?', [player_id]);
    }

    const teamObj = await db.get('SELECT id, name, logo FROM teams WHERE id = ?', [team_id]);

    const eventPayload = {
      match_id: id,
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      event: {
        type: event_type,
        minute,
        team_name: teamObj ? teamObj.name : '',
        team_logo: teamObj ? teamObj.logo : '',
        player_name: player.name,
        assist_player_name: assistPlayer ? assistPlayer.name : null,
        details
      }
    };

    if (ioInstance) {
      ioInstance.emit('match_event', eventPayload);
    }

    await logAudit(req.admin.username, 'RECORD_MATCH_EVENT', `${event_type} recorded for ${player.name} in Match ${id}`);

    res.json({ success: true, message: 'Match event recorded successfully', scores: { team_a: teamAScore, team_b: teamBScore } });
  } catch (err) {
    console.error('Error recording match event:', err);
    res.status(500).json({ success: false, message: 'Failed to record event' });
  }
}

// End Match & Update Points Table Automatically (Admin)
async function finishMatch(req, res) {
  try {
    const { id } = req.params;
    const match = await db.get('SELECT * FROM matches WHERE id = ?', [id]);

    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Match is already completed' });
    }

    const teamA = match.team_a_id;
    const teamB = match.team_b_id;
    const scoreA = match.team_a_score;
    const scoreB = match.team_b_score;

    // Update match status
    await db.execute("UPDATE matches SET status = 'COMPLETED' WHERE id = ?", [id]);

    // Recalculate Points Table for both teams
    await updateTeamStandings(teamA);
    await updateTeamStandings(teamB);

    await logAudit(req.admin.username, 'FINISH_MATCH', `Finished Match ID ${id}: ${scoreA} - ${scoreB}`);

    if (ioInstance) {
      ioInstance.emit('match_finished', { match_id: id, team_a_score: scoreA, team_b_score: scoreB });
      ioInstance.emit('points_updated', {});
    }

    res.json({ success: true, message: 'Match completed and standings updated!' });
  } catch (err) {
    console.error('Error finishing match:', err);
    res.status(500).json({ success: false, message: 'Failed to finish match' });
  }
}

// Helper to recalculate a team's total standings from completed matches
async function updateTeamStandings(teamId) {
  const matches = await db.query(
    `SELECT * FROM matches 
     WHERE status = 'COMPLETED' AND (team_a_id = ? OR team_b_id = ?)`,
    [teamId, teamId]
  );

  let played = matches.length;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  matches.forEach(m => {
    const isTeamA = m.team_a_id === teamId;
    const myScore = isTeamA ? m.team_a_score : m.team_b_score;
    const oppScore = isTeamA ? m.team_b_score : m.team_a_score;

    goalsFor += myScore;
    goalsAgainst += oppScore;

    if (myScore > oppScore) won++;
    else if (myScore === oppScore) drawn++;
    else lost++;
  });

  const gd = goalsFor - goalsAgainst;
  const points = (won * 3) + (drawn * 1);

  const existing = await db.get('SELECT id FROM points_table WHERE team_id = ?', [teamId]);
  if (existing) {
    await db.execute(
      `UPDATE points_table 
       SET played = ?, won = ?, drawn = ?, lost = ?, goals_for = ?, goals_against = ?, goal_difference = ?, points = ?
       WHERE team_id = ?`,
      [played, won, drawn, lost, goalsFor, goalsAgainst, gd, points, teamId]
    );
  } else {
    await db.execute(
      `INSERT INTO points_table (team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [teamId, played, won, drawn, lost, goalsFor, goalsAgainst, gd, points]
    );
  }
}

module.exports = {
  setSocketInstance,
  getAllMatches,
  getMatchById,
  createMatch,
  startMatchTimer,
  recordMatchEvent,
  finishMatch
};
