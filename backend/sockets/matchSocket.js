function initMatchSockets(io) {
  io.on('connection', (socket) => {
    socket.on('join_match', (matchId) => {
      socket.join(`match_${matchId}`);
    });
  });
}

module.exports = { initMatchSockets };
