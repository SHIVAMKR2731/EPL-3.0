const db = require('../config/db');

async function getPointsTable(req, res) {
  try {
    const table = await db.query(`
      SELECT pt.*, t.name as team_name, t.logo as team_logo, t.captain_name
      FROM points_table pt
      JOIN teams t ON pt.team_id = t.id
      ORDER BY pt.points DESC, pt.goal_difference DESC, pt.goals_for DESC, pt.played ASC
    `);

    res.json({ success: true, count: table.length, standings: table });
  } catch (err) {
    console.error('Error fetching points table:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch standings' });
  }
}

async function getPlayerStats(req, res) {
  try {
    // Top Scorers
    const topScorers = await db.query(`
      SELECT s.goals, s.assists, s.matches_played, p.id as player_id, p.name as player_name, p.position, p.image, t.name as team_name, t.logo as team_logo
      FROM player_statistics s
      JOIN players p ON s.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE s.goals > 0
      ORDER BY s.goals DESC, s.assists DESC LIMIT 10
    `);

    // Top Assists
    const topAssists = await db.query(`
      SELECT s.goals, s.assists, s.matches_played, p.id as player_id, p.name as player_name, p.position, p.image, t.name as team_name, t.logo as team_logo
      FROM player_statistics s
      JOIN players p ON s.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE s.assists > 0
      ORDER BY s.assists DESC, s.goals DESC LIMIT 10
    `);

    // Most Cards
    const mostCards = await db.query(`
      SELECT s.yellow_cards, s.red_cards, p.id as player_id, p.name as player_name, p.position, p.image, t.name as team_name
      FROM player_statistics s
      JOIN players p ON s.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE s.yellow_cards > 0 OR s.red_cards > 0
      ORDER BY (s.red_cards * 3 + s.yellow_cards) DESC LIMIT 10
    `);

    res.json({
      success: true,
      top_scorers: topScorers,
      top_assists: topAssists,
      most_cards: mostCards
    });
  } catch (err) {
    console.error('Error fetching player statistics:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch player stats' });
  }
}

async function getHomeWidgets(req, res) {
  try {
    // Check if Auction is active
    const auction = await db.get("SELECT status FROM auctions WHERE id = 1");
    const isAuctionLive = auction && auction.status === 'AUCTION_RUNNING';

    // Check if Match is active
    const liveMatch = await db.get(`
      SELECT m.*, 
             t1.name as team_a_name, t1.logo as team_a_logo,
             t2.name as team_b_name, t2.logo as team_b_logo
      FROM matches m
      JOIN teams t1 ON m.team_a_id = t1.id
      JOIN teams t2 ON m.team_b_id = t2.id
      WHERE m.status = 'LIVE'
      ORDER BY m.id DESC LIMIT 1
    `);

    // League Leader
    const leader = await db.get(`
      SELECT pt.*, t.name as team_name, t.logo as team_logo
      FROM points_table pt
      JOIN teams t ON pt.team_id = t.id
      ORDER BY pt.points DESC, pt.goal_difference DESC LIMIT 1
    `);

    // Upcoming Clash
    const upcomingMatch = await db.get(`
      SELECT m.*, 
             t1.name as team_a_name, t1.logo as team_a_logo,
             t2.name as team_b_name, t2.logo as team_b_logo
      FROM matches m
      JOIN teams t1 ON m.team_a_id = t1.id
      JOIN teams t2 ON m.team_b_id = t2.id
      WHERE m.status = 'UPCOMING'
      ORDER BY m.id ASC LIMIT 1
    `);

    // Top Scorer
    const topScorer = await db.get(`
      SELECT s.goals, p.name as player_name, p.image, t.name as team_name
      FROM player_statistics s
      JOIN players p ON s.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      ORDER BY s.goals DESC LIMIT 1
    `);

    // Total counts
    const totalPlayers = (await db.get('SELECT COUNT(*) as cnt FROM players')).cnt;
    const soldPlayers = (await db.get("SELECT COUNT(*) as cnt FROM players WHERE status = 'SOLD'")).cnt;
    const totalTeams = (await db.get('SELECT COUNT(*) as cnt FROM teams')).cnt;

    res.json({
      success: true,
      live_event: isAuctionLive ? 'AUCTION' : (liveMatch ? 'MATCH' : 'NONE'),
      live_match: liveMatch || null,
      league_leader: leader || null,
      upcoming_match: upcomingMatch || null,
      top_scorer: topScorer || null,
      summary: {
        total_players: totalPlayers,
        sold_players: soldPlayers,
        total_teams: totalTeams
      }
    });
  } catch (err) {
    console.error('Error fetching home widgets:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch home widgets' });
  }
}

module.exports = {
  getPointsTable,
  getPlayerStats,
  getHomeWidgets
};
