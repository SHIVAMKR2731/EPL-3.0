-- EPL 3.0 FOOTBALL LEAGUE MANAGEMENT & LIVE AUCTION PLATFORM
-- DEMO SEED DATA

-- Default Admin User (username: admin, password: admin123)
-- Password hash for 'admin123' using bcrypt: $2a$10$7zB3c9w.zZ/d3E3i81e1/.V9pXbJ8.8XzWkL0s.u/K/3rOQGk.L6G
INSERT INTO admins (username, password_hash, name, role) VALUES 
('admin', '$2a$10$7zB3c9w.zZ/d3E3i81e1/.V9pXbJ8.8XzWkL0s.u/K/3rOQGk.L6G', 'EPL League Administrator', 'superadmin')
ON DUPLICATE KEY UPDATE username=username;

-- Predefined Demo Teams
INSERT INTO teams (id, name, logo, captain_name, owner_name, initial_budget, remaining_budget) VALUES
(1, 'Tigers FC', '/uploads/teams/tigers.svg', 'Rahul Kumar', 'Dr. S. Sharma', 10000, 7600),
(2, 'Warriors FC', '/uploads/teams/warriors.svg', 'Aman Singh', 'Prof. V. Gupta', 10000, 8200),
(3, 'Falcons FC', '/uploads/teams/falcons.svg', 'Rohit Kumar', 'Eng. K. Patel', 10000, 6800),
(4, 'Knights FC', '/uploads/teams/knights.svg', 'Arjun Singh', 'Dr. A. Verma', 10000, 9100)
ON DUPLICATE KEY UPDATE name=name;

-- Predefined Demo Players (Variety of batches, branches, positions, statuses)
INSERT INTO players (id, name, contact_number, batch, branch, position, base_price, status, team_id, final_price, image) VALUES
(1, 'Rahul Kumar', '+91 9876543210', '3rd Year', 'CSE', 'Forward', 500, 'SOLD', 1, 1500, '/uploads/players/player1.svg'),
(2, 'Aman Singh', '+91 9876543211', '4th Year', 'ECE', 'Forward', 500, 'SOLD', 2, 1800, '/uploads/players/player2.svg'),
(3, 'Rohit Kumar', '+91 9876543212', '2nd Year', 'ME', 'Midfielder', 500, 'SOLD', 3, 1200, '/uploads/players/player3.svg'),
(4, 'Arjun Singh', '+91 9876543213', '3rd Year', 'EE', 'Defender', 500, 'SOLD', 4, 900, '/uploads/players/player4.svg'),
(5, 'Vikram Sharma', '+91 9876543214', '4th Year', 'CSE', 'Goalkeeper', 500, 'SOLD', 1, 900, '/uploads/players/player5.svg'),
(6, 'Devraj Patel', '+91 9876543215', '3rd Year', 'CE', 'Midfielder', 500, 'AVAILABLE', NULL, 0, '/uploads/players/player6.svg'),
(7, 'Siddharth Nair', '+91 9876543216', '1st Year', 'IT', 'Forward', 500, 'AVAILABLE', NULL, 0, '/uploads/players/player7.svg'),
(8, 'Karan Malhotra', '+91 9876543217', '2nd Year', 'CSE', 'Defender', 500, 'AVAILABLE', NULL, 0, '/uploads/players/player8.svg'),
(9, 'Aditya Roy', '+91 9876543218', '3rd Year', 'ECE', 'Goalkeeper', 500, 'AVAILABLE', NULL, 0, '/uploads/players/player9.svg'),
(10, 'Pranav Joshi', '+91 9876543219', '4th Year', 'ME', 'Midfielder', 500, 'UNSOLD', NULL, 0, '/uploads/players/player10.svg'),
(11, 'Yash Vardhan', '+91 9876543220', '2nd Year', 'EE', 'Defender', 500, 'AVAILABLE', NULL, 0, '/uploads/players/player11.svg'),
(12, 'Harsh Srivastava', '+91 9876543221', '3rd Year', 'CSE', 'Forward', 500, 'AVAILABLE', NULL, 0, '/uploads/players/player12.svg')
ON DUPLICATE KEY UPDATE name=name;

-- Predefined Auction State
INSERT INTO auctions (id, current_player_id, status, current_bid, current_team_id, timer_seconds) VALUES
(1, 6, 'IDLE', 0, NULL, 30)
ON DUPLICATE KEY UPDATE status=status;

-- Predefined Points Table Records
INSERT INTO points_table (team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points) VALUES
(1, 3, 2, 1, 0, 8, 3, 5, 7),
(2, 3, 2, 0, 1, 6, 4, 2, 6),
(3, 3, 1, 0, 2, 4, 6, -2, 3),
(4, 3, 0, 1, 2, 2, 7, -5, 1)
ON DUPLICATE KEY UPDATE played=played;

-- Predefined Player Statistics
INSERT INTO player_statistics (player_id, matches_played, goals, assists, yellow_cards, red_cards, minutes_played) VALUES
(1, 3, 5, 2, 0, 0, 270),
(2, 3, 4, 1, 1, 0, 270),
(3, 3, 2, 3, 1, 0, 260),
(4, 3, 1, 1, 2, 0, 270),
(5, 3, 0, 0, 0, 0, 270)
ON DUPLICATE KEY UPDATE matches_played=matches_played;

-- Predefined Matches
INSERT INTO matches (id, match_number, match_name, date, time, venue, team_a_id, team_b_id, team_a_score, team_b_score, status) VALUES
(1, 1, 'Match 01 - Opening Clash', '2026-08-10', '05:00 PM', 'Stadium Pitch 1', 1, 2, 3, 1, 'COMPLETED'),
(2, 2, 'Match 02 - Derby Special', '2026-08-11', '06:00 PM', 'Stadium Pitch 1', 3, 4, 2, 0, 'COMPLETED'),
(3, 3, 'Match 03 - Group Stage', '2026-08-12', '05:30 PM', 'College Football Arena', 1, 3, 4, 2, 'COMPLETED'),
(4, 4, 'Match 04 - High Octane Battle', '2026-08-12', '07:00 PM', 'College Football Arena', 2, 4, 3, 1, 'LIVE'),
(5, 5, 'Match 05 - Super Sunday', '2026-08-13', '06:00 PM', 'Main Football Ground', 1, 4, 0, 0, 'UPCOMING')
ON DUPLICATE KEY UPDATE status=status;

-- Predefined Match Events
INSERT INTO match_events (match_id, team_id, player_id, assist_player_id, event_type, minute, details) VALUES
(1, 1, 1, NULL, 'GOAL', 12, 'Brilliant solo run'),
(1, 2, 2, NULL, 'GOAL', 34, 'Header from corner'),
(1, 1, 1, 5, 'GOAL', 55, 'Clean finish'),
(1, 1, 1, NULL, 'GOAL', 78, 'Penalty kick'),
(4, 2, 2, 3, 'GOAL', 15, 'Long-range striker'),
(4, 4, 4, NULL, 'GOAL', 28, 'Header off rebound'),
(4, 2, 2, NULL, 'GOAL', 41, 'Counter attack goal');

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
('venue', 'College Main Stadium Ground');
