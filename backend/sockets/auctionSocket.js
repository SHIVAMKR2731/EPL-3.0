const db = require('../config/db');

let timerInterval = null;

function initAuctionSockets(io) {
  io.on('connection', (socket) => {
    socket.on('join_auction', () => {
      socket.join('public_auction_room');
    });

    socket.on('join_admin_auction', () => {
      socket.join('admin_auction_room');
    });
  });

  if (timerInterval) clearInterval(timerInterval);

  // Background timer interval (ticks every 1 second)
  timerInterval = setInterval(async () => {
    try {
      const auction = await db.get('SELECT * FROM auctions WHERE id = 1');
      if (auction && auction.status === 'AUCTION_RUNNING' && auction.timer_seconds > 0) {
        const newTime = auction.timer_seconds - 1;
        
        // Update database
        await db.execute('UPDATE auctions SET timer_seconds = ? WHERE id = 1', [newTime]);

        // Broadcast to all clients
        io.emit('auction_timer_tick', { 
          timer_seconds: newTime,
          status: 'AUCTION_RUNNING'
        });

        if (newTime === 0) {
          io.emit('auction_time_expired', { 
            message: auction.current_team_id ? 'Time expired! Finalizing highest bid.' : 'Time expired! No bids placed.'
          });
        }
      }
    } catch (err) {
      console.error('Auction timer tick error:', err.message);
    }
  }, 1000);
}

module.exports = { initAuctionSockets };
