const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// Helper to get socket broadcast function
let ioInstance = null;
function setSocketInstance(io) {
  ioInstance = io;
}

// Public Auction View Endpoint (EXCLUDES Next Player strictly)
async function getPublicAuctionState(req, res) {
  try {
    const auction = await db.get('SELECT * FROM auctions WHERE id = 1');

    let currentPlayer = null;
    let currentTeam = null;

    if (auction && auction.current_player_id) {
      currentPlayer = await db.get(
        `SELECT id, name, batch, branch, position, base_price, status, image 
         FROM players WHERE id = ?`,
        [auction.current_player_id]
      );
    }

    if (auction && auction.current_team_id) {
      currentTeam = await db.get('SELECT id, name, logo FROM teams WHERE id = ?', [auction.current_team_id]);
    }

    // Fetch Sold Players
    const soldPlayers = await db.query(
      `SELECT p.id, p.name, p.batch, p.branch, p.position, p.final_price, p.image, t.name as team_name, t.logo as team_logo
       FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE p.status = 'SOLD'
       ORDER BY p.id DESC`
    );

    // Fetch Unsold Players
    const unsoldPlayers = await db.query(
      `SELECT id, name, batch, branch, position, base_price, image
       FROM players
       WHERE status = 'UNSOLD'
       ORDER BY id ASC`
    );

    // Fetch Teams with Budgets
    const teams = await db.query('SELECT id, name, logo, initial_budget, remaining_budget FROM teams ORDER BY id ASC');

    res.json({
      success: true,
      auction: {
        status: auction ? auction.status : 'IDLE',
        current_bid: auction ? auction.current_bid : 0,
        timer_seconds: auction ? auction.timer_seconds : 30,
        current_player: currentPlayer,
        current_team: currentTeam
      },
      sold_players: soldPlayers,
      unsold_players: unsoldPlayers,
      teams
    });
  } catch (err) {
    console.error('Error fetching public auction state:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch auction state' });
  }
}

// Admin Auction View Endpoint (INCLUDES Next Player & Queue)
async function getAdminAuctionState(req, res) {
  try {
    const auction = await db.get('SELECT * FROM auctions WHERE id = 1');

    let currentPlayer = null;
    let currentTeam = null;

    if (auction && auction.current_player_id) {
      currentPlayer = await db.get('SELECT * FROM players WHERE id = ?', [auction.current_player_id]);
    }

    if (auction && auction.current_team_id) {
      currentTeam = await db.get('SELECT id, name, logo FROM teams WHERE id = ?', [auction.current_team_id]);
    }

    // Available players in queue
    const queue = await db.query(
      `SELECT id, name, batch, branch, position, base_price, status, image
       FROM players
       WHERE status IN ('REGISTERED', 'AVAILABLE') AND id != ?
       ORDER BY id ASC`,
      [auction ? (auction.current_player_id || 0) : 0]
    );

    // Next player in queue
    const nextPlayer = queue.length > 0 ? queue[0] : null;

    const soldPlayers = await db.query(
      `SELECT p.*, t.name as team_name, t.logo as team_logo
       FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE p.status = 'SOLD'
       ORDER BY p.id DESC`
    );

    const unsoldPlayers = await db.query('SELECT * FROM players WHERE status = "UNSOLD" ORDER BY id ASC');
    const teams = await db.query('SELECT * FROM teams ORDER BY id ASC');

    // Recent Bid History for current player
    let bidHistory = [];
    if (auction && auction.current_player_id) {
      bidHistory = await db.query(
        `SELECT b.id, b.bid_amount, b.created_at, t.name as team_name, t.logo as team_logo
         FROM auction_bids b
         JOIN teams t ON b.team_id = t.id
         WHERE b.player_id = ?
         ORDER BY b.id DESC LIMIT 10`,
        [auction.current_player_id]
      );
    }

    res.json({
      success: true,
      auction: {
        status: auction ? auction.status : 'IDLE',
        current_bid: auction ? auction.current_bid : 0,
        timer_seconds: auction ? auction.timer_seconds : 30,
        current_player: currentPlayer,
        current_team: currentTeam
      },
      next_player: nextPlayer,
      queue,
      sold_players: soldPlayers,
      unsold_players: unsoldPlayers,
      teams,
      bid_history: bidHistory
    });
  } catch (err) {
    console.error('Error fetching admin auction state:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin auction state' });
  }
}

// Admin: Start Auction for a specific Player or Next Player in Queue
async function startAuction(req, res) {
  try {
    const { player_id } = req.body;

    let targetPlayer = null;
    if (player_id) {
      targetPlayer = await db.get('SELECT * FROM players WHERE id = ?', [player_id]);
    } else {
      targetPlayer = await db.get("SELECT * FROM players WHERE status IN ('REGISTERED', 'AVAILABLE') ORDER BY id ASC LIMIT 1");
    }

    if (!targetPlayer) {
      const unsoldCheck = await db.get("SELECT COUNT(*) as cnt FROM players WHERE status = 'UNSOLD'");
      const unsoldCnt = unsoldCheck ? unsoldCheck.cnt : 0;
      if (unsoldCnt > 0) {
        return res.status(400).json({
          success: false,
          message: `Main player queue completed! You have ${unsoldCnt} unsold players available. Click "RE-AUCTION UNSOLD PLAYERS" to start Round 2.`,
          has_unsold: true,
          unsold_count: unsoldCnt
        });
      }
      return res.status(400).json({ success: false, message: 'All players in the league have been auctioned!' });
    }

    // Set target player status to AUCTIONING
    await db.execute("UPDATE players SET status = 'AUCTIONING' WHERE id = ?", [targetPlayer.id]);

    // Update auction table
    await db.execute(
      `UPDATE auctions 
       SET current_player_id = ?, status = 'AUCTION_RUNNING', current_bid = ?, current_team_id = NULL, timer_seconds = 30
       WHERE id = 1`,
      [targetPlayer.id, targetPlayer.base_price]
    );

    await logAudit(req.admin.username, 'START_AUCTION', `Started auction for player ${targetPlayer.name} (ID: ${targetPlayer.id})`);

    // Safe payload for socket broadcast
    const publicPlayer = {
      id: targetPlayer.id,
      name: targetPlayer.name,
      batch: targetPlayer.batch,
      branch: targetPlayer.branch,
      position: targetPlayer.position,
      base_price: targetPlayer.base_price,
      image: targetPlayer.image
    };

    if (ioInstance) {
      ioInstance.emit('auction_started', {
        current_player: publicPlayer,
        current_bid: targetPlayer.base_price,
        current_team: null,
        status: 'AUCTION_RUNNING'
      });
    }

    res.json({
      success: true,
      message: `Auction started for ${targetPlayer.name}`,
      player: targetPlayer
    });
  } catch (err) {
    console.error('Error starting auction:', err);
    res.status(500).json({ success: false, message: 'Failed to start auction' });
  }
}

// Admin: Place Bid for a Team
async function placeBid(req, res) {
  try {
    const { team_id, bid_amount } = req.body;

    if (!team_id || !bid_amount) {
      return res.status(400).json({ success: false, message: 'Team ID and bid amount are required' });
    }

    const auction = await db.get('SELECT * FROM auctions WHERE id = 1');
    if (!auction || auction.status !== 'AUCTION_RUNNING' || !auction.current_player_id) {
      return res.status(400).json({ success: false, message: 'No active auction running' });
    }

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [team_id]);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const newBid = parseInt(bid_amount, 10);

    // Validations
    if (newBid <= auction.current_bid && auction.current_team_id !== null) {
      return res.status(400).json({ success: false, message: `Bid must be greater than current bid (₹${auction.current_bid})` });
    }

    if (newBid > team.remaining_budget) {
      return res.status(400).json({ success: false, message: `Insufficient team budget! Remaining: ₹${team.remaining_budget}` });
    }

    // Record bid in database
    await db.execute(
      'INSERT INTO auction_bids (player_id, team_id, bid_amount) VALUES (?, ?, ?)',
      [auction.current_player_id, team_id, newBid]
    );

    // Update current auction state
    await db.execute(
      'UPDATE auctions SET current_bid = ?, current_team_id = ?, timer_seconds = 30 WHERE id = 1',
      [newBid, team_id]
    );

    await logAudit(req.admin.username, 'PLACE_BID', `Bid ₹${newBid} placed by ${team.name} for player ID ${auction.current_player_id}`);

    if (ioInstance) {
      ioInstance.emit('bid_updated', {
        current_bid: newBid,
        current_team: { id: team.id, name: team.name, logo: team.logo },
        timer_seconds: 30
      });
    }

    res.json({
      success: true,
      message: `Bid ₹${newBid} placed for ${team.name}`,
      current_bid: newBid,
      team: { id: team.id, name: team.name }
    });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ success: false, message: 'Failed to place bid' });
  }
}

// Admin: Sell Player to Current Highest Bidder
async function sellPlayer(req, res) {
  try {
    const auction = await db.get('SELECT * FROM auctions WHERE id = 1');
    if (!auction || !auction.current_player_id || !auction.current_team_id) {
      return res.status(400).json({ success: false, message: 'Cannot sell player without an active valid bid' });
    }

    const player = await db.get('SELECT * FROM players WHERE id = ?', [auction.current_player_id]);
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [auction.current_team_id]);

    if (!player || !team) {
      return res.status(400).json({ success: false, message: 'Invalid player or team' });
    }

    const finalPrice = auction.current_bid;

    // Deduct remaining budget
    const newRemainingBudget = team.remaining_budget - finalPrice;
    await db.execute('UPDATE teams SET remaining_budget = ? WHERE id = ?', [newRemainingBudget, team.id]);

    // Update player status and assign team
    await db.execute(
      "UPDATE players SET status = 'SOLD', team_id = ?, final_price = ? WHERE id = ?",
      [team.id, finalPrice, player.id]
    );

    // Reset auction state to IDLE
    await db.execute(
      "UPDATE auctions SET status = 'IDLE', current_player_id = NULL, current_bid = 0, current_team_id = NULL WHERE id = 1"
    );

    await logAudit(req.admin.username, 'SELL_PLAYER', `Sold ${player.name} to ${team.name} for ₹${finalPrice}`);

    const resultPayload = {
      player: {
        id: player.id,
        name: player.name,
        batch: player.batch,
        branch: player.branch,
        position: player.position,
        final_price: finalPrice,
        image: player.image
      },
      team: {
        id: team.id,
        name: team.name,
        logo: team.logo,
        remaining_budget: newRemainingBudget
      }
    };

    if (ioInstance) {
      ioInstance.emit('player_sold', resultPayload);
    }

    res.json({
      success: true,
      message: `Player ${player.name} sold to ${team.name} for ₹${finalPrice}!`,
      sold: resultPayload
    });
  } catch (err) {
    console.error('Error selling player:', err);
    res.status(500).json({ success: false, message: 'Failed to sell player' });
  }
}

// Admin: Mark Player Unsold
async function markUnsold(req, res) {
  try {
    const auction = await db.get('SELECT * FROM auctions WHERE id = 1');
    if (!auction || !auction.current_player_id) {
      return res.status(400).json({ success: false, message: 'No active player in auction to mark unsold' });
    }

    const player = await db.get('SELECT * FROM players WHERE id = ?', [auction.current_player_id]);

    // Update player status to UNSOLD
    await db.execute("UPDATE players SET status = 'UNSOLD' WHERE id = ?", [auction.current_player_id]);

    // Reset auction state
    await db.execute(
      "UPDATE auctions SET status = 'IDLE', current_player_id = NULL, current_bid = 0, current_team_id = NULL WHERE id = 1"
    );

    await logAudit(req.admin.username, 'MARK_UNSOLD', `Marked ${player ? player.name : 'player'} as UNSOLD`);

    const resultPayload = {
      player: player ? {
        id: player.id,
        name: player.name,
        position: player.position,
        base_price: player.base_price,
        image: player.image
      } : null
    };

    if (ioInstance) {
      ioInstance.emit('player_unsold', resultPayload);
    }

    res.json({
      success: true,
      message: `Player marked as UNSOLD`,
      unsold: resultPayload
    });
  } catch (err) {
    console.error('Error marking player unsold:', err);
    res.status(500).json({ success: false, message: 'Failed to mark player unsold' });
  }
}

// Admin: Pause / Resume Auction
async function togglePause(req, res) {
  try {
    const auction = await db.get('SELECT * FROM auctions WHERE id = 1');
    if (!auction) return res.status(400).json({ success: false, message: 'No auction' });

    const newStatus = auction.status === 'AUCTION_RUNNING' ? 'PAUSED' : 'AUCTION_RUNNING';
    await db.execute('UPDATE auctions SET status = ? WHERE id = 1', [newStatus]);

    await logAudit(req.admin.username, 'TOGGLE_AUCTION_PAUSE', `Auction status changed to ${newStatus}`);

    if (ioInstance) {
      ioInstance.emit('auction_status_changed', { status: newStatus });
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle auction status' });
  }
}

async function resetTimer(req, res) {
  try {
    await db.execute("UPDATE auctions SET timer_seconds = 30, status = 'AUCTION_RUNNING' WHERE id = 1");

    await logAudit(req.admin.username, 'RESET_AUCTION_TIMER', 'Auction timer reset to 30s');

    if (ioInstance) {
      ioInstance.emit('auction_timer_tick', { timer_seconds: 30, status: 'AUCTION_RUNNING' });
    }

    res.json({ success: true, message: 'Auction timer reset to 30 seconds' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset auction timer' });
  }
}

async function reAuctionUnsold(req, res) {
  try {
    const count = await db.get("SELECT COUNT(*) as cnt FROM players WHERE status = 'UNSOLD'");
    const totalUnsold = count ? count.cnt : 0;

    if (totalUnsold === 0) {
      return res.status(400).json({ success: false, message: 'No unsold players to re-introduce into auction queue.' });
    }

    // Reset all UNSOLD players back to AVAILABLE for Round 2 Auction
    await db.execute("UPDATE players SET status = 'AVAILABLE' WHERE status = 'UNSOLD'");

    await logAudit(req.admin.username, 'RE_AUCTION_UNSOLD', `Re-introduced ${totalUnsold} unsold players into auction queue`);

    if (ioInstance) {
      ioInstance.emit('auction_status_changed', { 
        message: `🔄 Round 2 Auction Started: ${totalUnsold} unsold players re-introduced!`,
        status: 'IDLE'
      });
    }

    res.json({
      success: true,
      message: `Successfully re-introduced ${totalUnsold} unsold players into the auction queue for Round 2!`,
      count: totalUnsold
    });
  } catch (err) {
    console.error('Error re-auctioning unsold players:', err);
    res.status(500).json({ success: false, message: 'Failed to re-introduce unsold players' });
  }
}

module.exports = {
  setSocketInstance,
  getPublicAuctionState,
  getAdminAuctionState,
  startAuction,
  placeBid,
  sellPlayer,
  markUnsold,
  togglePause,
  resetTimer,
  reAuctionUnsold
};
