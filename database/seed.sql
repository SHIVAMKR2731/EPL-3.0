-- EPL 3.0 FOOTBALL LEAGUE MANAGEMENT & LIVE AUCTION PLATFORM
-- SEED DATA

-- Default Admin User (username: admin, password: admin123)
-- Password hash for 'admin123' using bcrypt: $2a$10$7zB3c9w.zZ/d3E3i81e1/.V9pXbJ8.8XzWkL0s.u/K/3rOQGk.L6G
INSERT INTO admins (username, password_hash, name, role) VALUES 
('admin', '$2a$10$7zB3c9w.zZ/d3E3i81e1/.V9pXbJ8.8XzWkL0s.u/K/3rOQGk.L6G', 'EPL League Administrator', 'superadmin')
ON DUPLICATE KEY UPDATE username=username;

-- Initial Auction State
INSERT INTO auctions (id, current_player_id, status, current_bid, current_team_id, timer_seconds) VALUES
(1, NULL, 'IDLE', 0, NULL, 30)
ON DUPLICATE KEY UPDATE status=status;

-- Predefined Settings
INSERT INTO tournament_settings (key_name, value_data) VALUES
('tournament_name', 'EPL 3.0 College Football League'),
('tournament_dates', 'August 10 - August 25, 2026'),
('default_base_price', '20'),
('default_team_budget', '10000'),
('win_points', '3'),
('draw_points', '1'),
('loss_points', '0'),
('match_duration', '90'),
('half_duration', '45'),
('venue', 'College Main Stadium Ground')
ON DUPLICATE KEY UPDATE value_data=VALUES(value_data);

