const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbDriver = null; // 'mysql' or 'sqlite'
let pool = null;
let sqliteDb = null;

async function initDatabase() {
  const dbType = process.env.DATABASE_TYPE || 'auto';
  
  if (dbType === 'mysql' || dbType === 'auto') {
    try {
      pool = mysql.createPool({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'epl3_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true
      });
      // Test connection
      const conn = await pool.getConnection();
      conn.release();
      dbDriver = 'mysql';
      console.log('✅ Connected to MySQL Database successfully.');
      await setupTables();
      return;
    } catch (err) {
      if (dbType === 'mysql') {
        console.error('❌ Failed to connect to MySQL:', err.message);
        throw err;
      }
      console.log('⚠️ MySQL connection failed. Falling back to embedded SQLite driver for zero-config demo.');
    }
  }

  // SQLite Fallback setup
  dbDriver = 'sqlite';
  const dbPath = path.join(__dirname, '../../database/epl3.sqlite');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite Connection Error:', err.message);
    } else {
      console.log(`✅ SQLite Database connected at ${dbPath}`);
    }
  });

  // Helper method for sqlite async run
  sqliteDb.runAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ insertId: this.lastID, affectedRows: this.changes });
      });
    });
  };

  sqliteDb.allAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  sqliteDb.getAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  await setupTables();
}

async function setupTables() {
  if (dbDriver === 'mysql') {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    }
    // Check if admins seeded
    const [admins] = await pool.query('SELECT * FROM admins LIMIT 1');
    if (admins.length === 0) {
      const seedPath = path.join(__dirname, '../../database/seed.sql');
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await pool.query(seedSql);
      }
    }
  } else if (dbDriver === 'sqlite') {
    // SQLite Tables Creation
    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        logo TEXT DEFAULT '/uploads/teams/default.png',
        captain_name TEXT DEFAULT '',
        owner_name TEXT DEFAULT '',
        initial_budget INTEGER DEFAULT 10000,
        remaining_budget INTEGER DEFAULT 10000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_number TEXT DEFAULT '',
        batch TEXT NOT NULL,
        branch TEXT NOT NULL,
        position TEXT NOT NULL,
        base_price INTEGER DEFAULT 20,
        status TEXT DEFAULT 'REGISTERED',
        team_id INTEGER NULL,
        final_price INTEGER DEFAULT 0,
        image TEXT DEFAULT '/uploads/players/default.png',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS auctions (
        id INTEGER PRIMARY KEY DEFAULT 1,
        current_player_id INTEGER NULL,
        status TEXT DEFAULT 'IDLE',
        current_bid INTEGER DEFAULT 0,
        current_team_id INTEGER NULL,
        timer_seconds INTEGER DEFAULT 30,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS auction_bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        bid_amount INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_number INTEGER NOT NULL,
        match_name TEXT DEFAULT '',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        venue TEXT DEFAULT 'Main Stadium',
        team_a_id INTEGER NOT NULL,
        team_b_id INTEGER NOT NULL,
        team_a_score INTEGER DEFAULT 0,
        team_b_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'UPCOMING',
        half INTEGER DEFAULT 1,
        current_minute INTEGER DEFAULT 0,
        timer_started_at INTEGER DEFAULT NULL,
        timer_accumulated_seconds INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS match_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        assist_player_id INTEGER NULL,
        event_type TEXT NOT NULL,
        minute INTEGER NOT NULL,
        details TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS points_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER UNIQUE NOT NULL,
        played INTEGER DEFAULT 0,
        won INTEGER DEFAULT 0,
        drawn INTEGER DEFAULT 0,
        lost INTEGER DEFAULT 0,
        goals_for INTEGER DEFAULT 0,
        goals_against INTEGER DEFAULT 0,
        goal_difference INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS player_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER UNIQUE NOT NULL,
        matches_played INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        minutes_played INTEGER DEFAULT 0
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS tournament_settings (
        key_name TEXT PRIMARY KEY,
        value_data TEXT NOT NULL
      );
    `);

    await sqliteDb.runAsync(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed admin if empty
    const adminCheck = await sqliteDb.getAsync('SELECT * FROM admins WHERE username = ?', ['admin']);
    if (!adminCheck) {
      const hash = await bcrypt.hash('admin123', 10);
      await sqliteDb.runAsync(
        'INSERT INTO admins (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
        ['admin', hash, 'EPL League Administrator', 'superadmin']
      );

      // Seed Auction
      await sqliteDb.runAsync(`INSERT OR IGNORE INTO auctions (id, current_player_id, status, current_bid, current_team_id, timer_seconds) VALUES (1, NULL, 'IDLE', 0, NULL, 30);`);

      // Seed Settings
      await sqliteDb.runAsync(`INSERT OR IGNORE INTO tournament_settings (key_name, value_data) VALUES
        ('tournament_name', 'EPL 3.0 College Football League'),
        ('tournament_dates', 'August 10 - August 25, 2026'),
        ('default_base_price', '20'),
        ('default_team_budget', '10000'),
        ('win_points', '3'),
        ('draw_points', '1'),
        ('loss_points', '0'),
        ('match_duration', '90'),
        ('half_duration', '45'),
        ('venue', 'College Main Stadium Ground');
      `);
    }

    // Ensure default base price is updated to 20 in database
    try {
      if (dbDriver === 'sqlite') {
        await sqliteDb.runAsync(`UPDATE tournament_settings SET value_data = '20' WHERE key_name = 'default_base_price' AND value_data = '500'`);
        await sqliteDb.runAsync(`UPDATE players SET base_price = 20 WHERE base_price = 500`);
      } else if (dbDriver === 'mysql' && pool) {
        await pool.query(`UPDATE tournament_settings SET value_data = '20' WHERE key_name = 'default_base_price' AND value_data = '500'`);
        await pool.query(`UPDATE players SET base_price = 20 WHERE base_price = 500`);
      }
    } catch (e) {}

    // Performance Indexes
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_players_status ON players(status)',
      'CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)',
      'CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)',
      'CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id)',
      'CREATE INDEX IF NOT EXISTS idx_points_team ON points_table(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_stats_player ON player_statistics(player_id)'
    ];
    for (const stmt of indexStatements) {
      try {
        await sqliteDb.runAsync(stmt);
      } catch (idxErr) {}
    }
  }
}

// Universal Query Interface
async function query(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [rows] = await pool.query(sql, params);
    return rows;
  } else {
    // Standardize syntax differences between MySQL and SQLite
    let formattedSql = sql;
    // Replace MySQL ON DUPLICATE KEY UPDATE or AUTO_INCREMENT if any
    return await sqliteDb.allAsync(formattedSql, params);
  }
}

async function get(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  } else {
    return await sqliteDb.getAsync(sql, params);
  }
}

async function execute(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [result] = await pool.query(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  } else {
    return await sqliteDb.runAsync(sql, params);
  }
}

module.exports = {
  initDatabase,
  query,
  get,
  execute,
  getDriver: () => dbDriver
};
