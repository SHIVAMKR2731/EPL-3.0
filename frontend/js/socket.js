/* SOCKET.IO REAL-TIME WRAPPER */

let socket = null;

function initSocket() {
  if (typeof io !== 'undefined') {
    const serverUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? window.location.origin
      : 'https://epl3-backend.onrender.com';

    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('⚡ Connected to EPL 3.0 Real-Time Socket Server');
    });

    socket.on('disconnect', () => {
      console.log('⚠️ Disconnected from Socket Server');
    });
  } else {
    console.warn('Socket.IO client library not loaded');
  }
  return socket;
}

function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}
