const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const teamRoutes = require('./routes/teamRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const matchRoutes = require('./routes/matchRoutes');
const statsRoutes = require('./routes/statsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const auctionController = require('./controllers/auctionController');
const matchController = require('./controllers/matchController');
const { initAuctionSockets } = require('./sockets/auctionSocket');
const { initMatchSockets } = require('./sockets/matchSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pass socket instance to controllers
auctionController.setSocketInstance(io);
matchController.setSocketInstance(io);

// Static uploads & frontend serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);

// Fallback route for single-page style navigation if needed
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html'));
});

// Real-Time Socket Initialization
initAuctionSockets(io);
initMatchSockets(io);

const PORT = process.env.PORT || 5000;

// Database Init & Server Start
db.initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`⚽ EPL 3.0 FOOTBALL LEAGUE PLATFORM IS RUNNING!`);
      console.log(`🚀 Server Address: http://localhost:${PORT}`);
      console.log(`👑 Admin Dashboard: http://localhost:${PORT}/admin/login.html`);
      console.log(`===================================================`);
    });
  })
  .catch((err) => {
    console.error('Fatal Database Initialization Failure:', err);
  });
