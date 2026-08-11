const db = require('../config/db');

let timerInterval = null;

function initAuctionSockets(io) {
  io.on('connection', (socket) => {
    // Client connects to auction stream
    socket.on('join_auction', async () => {
      socket.join('public_auction_room');
    });

    socket.on('join_admin_auction', () => {
      socket.join('admin_auction_room');
    });
  });

  // Start background timer interval for auction countdown (ticks every second if active)
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(async () => {
    try {
      const auction = await db.get('SELECT * FROM auctions WHERE id = 1');
      if (auction && auction.status === 'AUCTION_RUNNING' && auction.timer_seconds > 0) {
        const newTime = auction.timer_seconds - 1;
        await db.execute('UPDATE auctions SET timer_seconds = ? WHERE id = 1', [newTime]);

        io.emit('auction_timer_tick', { timer_seconds: newTime });

        if (newTime === 0) {
          // Timer expired: if bid placed -> sell automatically, else mark unsold
          if (auction.current_team_id) {
            // Auto sell logic or flag time up
            io.emit('auction_time_expired', { message: 'Time expired! Finalizing highest bid.' });
          } else {
            io.emit('auction_time_expired', { message: 'Time expired! No bids placed.' });
          }
        }
      }
    } catch (err) {
      // Silent catch on interval error
    }
  }, 1000);
}

module.exports = { initAuctionSockets };
