# EPL 3.0 — Football League Management & Live Auction Platform

A complete, production-ready web platform for managing college football tournaments, featuring a broadcast-style **Real-Time Live Player Auction**, **Server-Synced Live Football Match Scoring & Timer**, **Dynamic Team Squad Formations**, **Automated Points Table Standings**, **Player Leaderboards**, **Excel/CSV Player Bulk Import**, and **Role-Based Admin Control Suite**.

---

## 🌟 Key Features

### 1. 🔨 Broadcast Live Player Auction
- **Real-Time Bidding**: Powered by Socket.IO for low-latency live bid updates across all connected spectators.
- **TV Broadcast UI**: Displays large player card, position badge, branch, batch, base price, live animated highest bid, and timer ring.
- **Strict Security - Hidden Next Player**: Public spectator views strictly omit the upcoming auction queue. Only authenticated Admin sockets/routes can view `next_player` and upcoming queue.
- **Automated Budget Tracking**: Deducts winning bid amounts from team remaining budgets and moves players into sold squads upon admin confirmation.

### 2. ⚽ Live Match Center & Synced Timer
- **Server-Driven Clock**: Eliminates client-side clock drift with server timestamp anchoring.
- **Real-Time Event Feed**: Broadcasts goals, assists, yellow/red cards, and substitutions with custom football timeline icons.
- **Tactical Pitch Formations**: Renders team rosters on an interactive football formation field layout.

### 3. 📊 Automated Standings & Statistics
- **Dynamic Points Table**: Automatically recalculates Matches Played, Wins, Draws, Losses, Goals For, Goals Against, Goal Difference, and Points (3 for Win, 1 for Draw, 0 for Loss).
- **Player Leaderboards**: Real-time tracking of Top Scorers, Top Assists, and Card statistics.

### 4. 🔒 Strict Public & Admin Security Isolation
- **Contact Number Protection**: Player contact numbers are strictly stripped from all public REST APIs and Socket broadcasts. Only logged-in Admins can access private contact details.
- **JWT Authorization**: Admin control endpoints are protected with JSON Web Tokens and bcrypt password hashing.

### 5. 📁 Excel / CSV Player Import
- Supports uploading `.xlsx`, `.xls`, and `.csv` files with automatic column mapping for Name, Contact, Batch, Branch, Position, and Base Price, featuring duplicate detection.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism design system), Vanilla JavaScript (ES6+), Socket.IO Client.
- **Backend**: Node.js, Express.js.
- **Real-Time Engine**: Socket.IO.
- **Database**: MySQL (with zero-config embedded SQLite fallback for local testing out of the box).
- **Authentication**: JWT & bcryptjs.
- **File Uploads & Excel Parser**: Multer, XLSX.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=5000
DATABASE_TYPE=auto
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=epl3_db
JWT_SECRET=epl3_super_secret_jwt_key_2026_sports_league
```

### 3. Database Setup (Automatic)
The platform includes automatic schema migration and seed data.
- If **MySQL** is running on your machine, it will automatically connect and create tables from `database/schema.sql` and `database/seed.sql`.
- If MySQL is not running, it gracefully falls back to an embedded SQLite database (`database/epl3.sqlite`) so you can run the app immediately with zero database setup!

### 4. Start the Application
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

---

## 🔑 Default Admin Credentials

- **URL**: `http://localhost:5000/admin/login.html`
- **Username**: `admin`
- **Password**: `admin123`

---

## 🌐 Page Route Mapping

### Public Spectator Pages:
- **Home**: `http://localhost:5000/`
- **Live Auction**: `http://localhost:5000/auction.html`
- **Teams & Squads**: `http://localhost:5000/teams.html`
- **Match Fixtures**: `http://localhost:5000/matches.html`
- **Live Match Center**: `http://localhost:5000/live-match.html`
- **Points Table**: `http://localhost:5000/points-table.html`
- **Player Leaderboards**: `http://localhost:5000/players.html`
- **Match Archive**: `http://localhost:5000/results.html`

### Admin Control Pages:
- **Admin Dashboard**: `http://localhost:5000/admin/dashboard.html`
- **Auction Control**: `http://localhost:5000/admin/auction.html`
- **Player Manager & Excel Import**: `http://localhost:5000/admin/players.html`
- **Team Manager**: `http://localhost:5000/admin/teams.html`
- **Match Scheduler**: `http://localhost:5000/admin/matches.html`
- **Live Scoring Panel**: `http://localhost:5000/admin/scoring.html`
- **Tournament Settings**: `http://localhost:5000/admin/settings.html`
