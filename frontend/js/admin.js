/* ADMIN CONTROL PANEL LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  // If on login page, bind login handler
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
    return;
  }

  // Verify auth on admin pages
  if (!checkAdminAuth()) return;

  // Bind logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutAdmin);

  // Initialize specific page controllers
  const page = document.body.dataset.adminPage;
  if (page === 'dashboard') loadDashboardMetrics();
  else if (page === 'auction') initAdminAuction();
  else if (page === 'players') loadAdminPlayers();
  else if (page === 'teams') loadAdminTeams();
  else if (page === 'matches') loadAdminMatches();
  else if (page === 'scoring') loadAdminScoringPanel();
  else if (page === 'settings') loadAdminSettings();
});

// Admin Login Handler
async function handleAdminLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('admin-username').value;
  const passwordInput = document.getElementById('admin-password').value;

  try {
    const res = await apiRequest('/api/auth/login', 'POST', {
      username: usernameInput,
      password: passwordInput
    });

    if (res.success) {
      localStorage.setItem('epl3_admin_token', res.token);
      localStorage.setItem('epl3_admin_user', JSON.stringify(res.admin));
      showToast('Login successful! Redirecting to Dashboard...', 'success');
      setTimeout(() => {
        window.location.href = '/admin/dashboard.html';
      }, 600);
    }
  } catch (err) {
    // Toast handled in apiRequest
  }
}

// -------------------------------------------------------------------
// ADMIN DASHBOARD
// -------------------------------------------------------------------
async function loadDashboardMetrics() {
  try {
    const res = await apiRequest('/api/stats/home-widgets');
    if (res.success) {
      document.getElementById('admin-total-players').textContent = res.summary.total_players;
      document.getElementById('admin-sold-players').textContent = res.summary.sold_players;
      document.getElementById('admin-total-teams').textContent = res.summary.total_teams;
    }
  } catch (err) {}
}

// -------------------------------------------------------------------
// ADMIN AUCTION CONTROL PANEL
let adminTimerSeconds = 30;
let adminLocalTimerInterval = null;
let isAdminAuctionRunning = false;

function startAdminLocalTimer(seconds) {
  if (seconds !== undefined && seconds !== null) {
    adminTimerSeconds = seconds;
  }
  const el = document.getElementById('admin-timer-display');
  if (el) el.textContent = `00:${adminTimerSeconds < 10 ? '0' + adminTimerSeconds : adminTimerSeconds}`;

  if (!adminLocalTimerInterval) {
    adminLocalTimerInterval = setInterval(() => {
      if (isAdminAuctionRunning && adminTimerSeconds > 0) {
        adminTimerSeconds--;
        const timerEl = document.getElementById('admin-timer-display');
        if (timerEl) timerEl.textContent = `00:${adminTimerSeconds < 10 ? '0' + adminTimerSeconds : adminTimerSeconds}`;
      }
    }, 1000);
  }
}

async function initAdminAuction() {
  loadAdminAuctionState();
  const socket = getSocket();
  if (socket) {
    socket.emit('join_admin_auction');
    socket.on('auction_started', (data) => {
      isAdminAuctionRunning = true;
      loadAdminAuctionState();
      if (data && data.timer_seconds !== undefined) startAdminLocalTimer(data.timer_seconds);
    });
    socket.on('bid_updated', (data) => {
      isAdminAuctionRunning = true;
      loadAdminAuctionState();
      if (data && data.timer_seconds !== undefined) startAdminLocalTimer(data.timer_seconds);
    });
    socket.on('player_sold', () => {
      isAdminAuctionRunning = false;
      loadAdminAuctionState();
    });
    socket.on('player_unsold', () => {
      isAdminAuctionRunning = false;
      loadAdminAuctionState();
    });
    socket.on('auction_timer_tick', (data) => {
      isAdminAuctionRunning = true;
      startAdminLocalTimer(data.timer_seconds);
    });
  }
}

async function loadAdminAuctionState() {
  try {
    const res = await apiRequest('/api/auction/admin/state');
    if (!res.success) return;

    const current = res.auction.current_player;
    const next = res.next_player;
    const currentBid = res.auction.current_bid;
    const currentTeam = res.auction.current_team;
    const status = res.auction.status;

    // Render Current Player Card
    const elCurrentCard = document.getElementById('admin-current-player-box');
    if (elCurrentCard) {
      if (current) {
        elCurrentCard.innerHTML = `
          <div style="display:flex;align-items:center;gap:1.5rem;">
            <img src="${current.image}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;" alt="${current.name}" referrerpolicy="no-referrer">
            <div>
              <h2 style="font-size:1.8rem;">${current.name}</h2>
              <p style="color:var(--text-muted);">${current.position} | ${current.branch} (${current.batch})</p>
              <p style="color:var(--gold-accent);font-weight:700;margin-top:0.25rem;">Base Price: ₹${current.base_price}</p>
            </div>
          </div>
        `;
      } else {
        elCurrentCard.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:2rem;">No player currently in auction stage. Select a player below to start auction.</div>`;
      }
    }

    // Render NEXT PLAYER CARD (Visible ONLY to Admin!)
    const elNextCard = document.getElementById('admin-next-player-box');
    if (elNextCard) {
      if (next) {
        elNextCard.innerHTML = `
          <div class="next-player-card">
            <img src="${next.image}" style="width:50px;height:50px;border-radius:50%;" alt="${next.name}" referrerpolicy="no-referrer">
            <div>
              <div class="next-player-tag">🔒 NEXT IN QUEUE (ADMIN PRIVILEGED VIEW)</div>
              <div style="font-weight:700;font-size:1.1rem;">${next.name}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${next.position} | ${next.branch} (${next.batch}) | Base: ₹${next.base_price}</div>
            </div>
          </div>
        `;
      } else {
        elNextCard.innerHTML = `<div class="next-player-card" style="color:var(--text-muted);">No upcoming players in queue.</div>`;
      }
    }

    // Current Bid & Status
    const elBid = document.getElementById('admin-current-bid');
    const elTeam = document.getElementById('admin-current-team');
    const elStatus = document.getElementById('admin-auction-status');

    if (elBid) elBid.textContent = `₹${(currentBid || 0).toLocaleString()}`;
    if (elTeam) elTeam.textContent = currentTeam ? currentTeam.name : 'No Bids';
    if (elStatus) elStatus.textContent = status;

    // Team Selection Dropdown for Bidding
    const elTeamSelect = document.getElementById('admin-bid-team-select');
    if (elTeamSelect && res.teams) {
      elTeamSelect.innerHTML = res.teams.map(t => `
        <option value="${t.id}">${t.name} (Bal: ₹${t.remaining_budget.toLocaleString()})</option>
      `).join('');
    }

    // Queue Table & Unsold Table
    renderAdminQueueTable(res.queue);
    renderAdminUnsoldTable(res.unsold_players);
  } catch (err) {
    console.error('Admin auction state error:', err);
  }
}

function renderAdminQueueTable(queue) {
  const tbody = document.getElementById('admin-queue-tbody');
  if (!tbody) return;

  if (!queue || queue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Queue is empty. All players auctioned.</td></tr>`;
    return;
  }

  tbody.innerHTML = queue.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-weight:700;">${p.name}</td>
      <td>${p.position}</td>
      <td>${p.branch} (${p.batch})</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="adminStartAuctionForPlayer(${p.id})">Start Auction 🚀</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminUnsoldTable(unsold) {
  const tbody = document.getElementById('admin-unsold-tbody');
  if (!tbody) return;

  if (!unsold || unsold.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No unsold players.</td></tr>`;
    return;
  }

  tbody.innerHTML = unsold.map(p => `
    <tr>
      <td style="font-weight:700;">${p.name}</td>
      <td>${p.position}</td>
      <td>Base: ₹${p.base_price}</td>
      <td>
        <button class="btn btn-gold btn-sm" onclick="adminStartAuctionForPlayer(${p.id})">Re-Auction 🔄</button>
      </td>
    </tr>
  `).join('');
}

async function adminStartAuctionForPlayer(playerId) {
  try {
    const res = await apiRequest('/api/auction/admin/start', 'POST', { player_id: playerId });
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminAuctionState();
    }
  } catch (err) {}
}

async function adminPlaceBid() {
  const teamId = document.getElementById('admin-bid-team-select').value;
  const bidAmount = document.getElementById('admin-bid-amount-input').value;

  if (!teamId || !bidAmount) {
    showToast('Select a team and enter bid amount', 'error');
    return;
  }

  try {
    const res = await apiRequest('/api/auction/admin/bid', 'POST', { team_id: teamId, bid_amount: bidAmount });
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminAuctionState();
    }
  } catch (err) {}
}

function adminQuickAddBid(amount) {
  const inputEl = document.getElementById('admin-bid-amount-input');
  if (!inputEl) return;

  const currentBidEl = document.getElementById('admin-current-bid');
  let baseVal = 0;
  if (currentBidEl) {
    baseVal = parseInt(currentBidEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
  }

  let existingInputVal = parseInt(inputEl.value, 10) || baseVal;
  inputEl.value = existingInputVal + amount;
}

async function adminResetTimer() {
  try {
    const res = await apiRequest('/api/auction/admin/reset-timer', 'POST');
    if (res.success) {
      showToast(res.message, 'success');
      startAdminLocalTimer(30);
      loadAdminAuctionState();
    }
  } catch (err) {}
}

async function adminReAuctionUnsold() {
  if (!confirm('Re-introduce all UNSOLD players back into the live auction queue for Round 2?')) return;
  try {
    const res = await apiRequest('/api/auction/admin/re-auction-unsold', 'POST');
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminAuctionState();
    }
  } catch (err) {}
}

async function adminSellPlayer() {
  if (!confirm('Are you sure you want to SELL this player to the highest bidder?')) return;
  try {
    const res = await apiRequest('/api/auction/admin/sell', 'POST');
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminAuctionState();
    }
  } catch (err) {}
}

async function adminMarkUnsold() {
  if (!confirm('Mark player as UNSOLD?')) return;
  try {
    const res = await apiRequest('/api/auction/admin/unsold', 'POST');
    if (res.success) {
      showToast(res.message, 'warning');
      loadAdminAuctionState();
    }
  } catch (err) {}
}

async function adminTogglePause() {
  try {
    const res = await apiRequest('/api/auction/admin/toggle-pause', 'POST');
    if (res.success) {
      showToast(`Auction status: ${res.status}`, 'info');
      loadAdminAuctionState();
    }
  } catch (err) {}
}

// -------------------------------------------------------------------
// ADMIN PLAYER MANAGEMENT & EXCEL IMPORT
// -------------------------------------------------------------------
async function loadAdminPlayers() {
  const tbody = document.getElementById('admin-players-tbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/api/players/admin/all');
    if (!res.success || !res.players) return;

    tbody.innerHTML = res.players.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem;">
            <img src="${p.image}" style="width:32px;height:32px;border-radius:50%;" alt="${p.name}" referrerpolicy="no-referrer">
            <span style="font-weight:700;">${p.name}</span>
          </div>
        </td>
        <td style="color:var(--text-muted);">${p.contact_number || 'N/A'}</td>
        <td>${p.branch} (${p.batch})</td>
        <td>${p.position}</td>
        <td>₹${p.base_price}</td>
        <td><span class="badge" style="background:rgba(255,255,255,0.05);">${p.status}</span></td>
        <td>${p.team_name || 'Free Agent'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openEditPlayerModal(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="adminDeletePlayer(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading admin players:', err);
  }
}

async function adminUploadExcelFile() {
  const input = document.getElementById('excel-file-input');
  if (!input.files || input.files.length === 0) {
    showToast('Please select an Excel (.xlsx) or CSV file first', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('excelFile', input.files[0]);

  try {
    const res = await apiRequest('/api/players/admin/import', 'POST', formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminPlayers();
      closeModal('excel-import-modal');
    }
  } catch (err) {}
}

async function adminDeletePlayer(id) {
  if (!confirm('Are you sure you want to delete this player?')) return;
  try {
    const res = await apiRequest(`/api/players/admin/${id}`, 'DELETE');
    if (res.success) {
      showToast(res.message, 'info');
      loadAdminPlayers();
    }
  } catch (err) {}
}

// -------------------------------------------------------------------
// ADMIN TEAMS MANAGEMENT
// -------------------------------------------------------------------
async function loadAdminTeams() {
  const container = document.getElementById('admin-teams-list');
  if (!container) return;

  try {
    const res = await apiRequest('/api/teams');
    if (!res.success || !res.teams) return;

    container.innerHTML = res.teams.map(t => `
      <div class="glass-card">
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
          <img src="${t.logo}" style="width:50px;height:50px;border-radius:50%;" alt="${t.name}">
          <div>
            <h3 style="font-size:1.2rem;">${t.name}</h3>
            <p style="font-size:0.8rem;color:var(--text-muted);">Captain: ${t.captain_name} | Owner: ${t.owner_name}</p>
          </div>
        </div>
        <p style="font-size:0.85rem;margin-bottom:1rem;">Remaining Budget: <strong style="color:var(--gold-accent);">₹${t.remaining_budget.toLocaleString()}</strong></p>
        <button class="btn btn-outline btn-sm" onclick="adminDeleteTeam(${t.id})">Delete Team</button>
      </div>
    `).join('');
  } catch (err) {}
}

async function adminCreateTeamSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('admin-create-team-form');
  const formData = new FormData(form);

  try {
    const res = await apiRequest('/api/teams/admin/create', 'POST', formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminTeams();
      closeModal('create-team-modal');
    }
  } catch (err) {}
}

async function adminDeleteTeam(id) {
  if (!confirm('Are you sure you want to delete this team?')) return;
  try {
    const res = await apiRequest(`/api/teams/admin/${id}`, 'DELETE');
    if (res.success) {
      showToast(res.message, 'info');
      loadAdminTeams();
    }
  } catch (err) {}
}

// -------------------------------------------------------------------
// ADMIN MATCH SCHEDULER & LIVE SCORING CONTROL
// -------------------------------------------------------------------
async function loadAdminMatches() {
  const tbody = document.getElementById('admin-matches-tbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/api/matches');
    if (!res.success || !res.matches) return;

    tbody.innerHTML = res.matches.map(m => `
      <tr>
        <td>Match #${m.match_number}</td>
        <td><strong style="color:var(--cyan-accent);">${m.team_a_name}</strong> vs <strong style="color:var(--primary-green);">${m.team_b_name}</strong></td>
        <td>${m.date} (${m.time})</td>
        <td>${m.venue}</td>
        <td><span class="badge">${m.status}</span></td>
        <td>
          <a href="/admin/scoring.html?id=${m.id}" class="btn btn-primary btn-sm">Score & Controls ⚽</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {}
}

async function adminCreateMatchSubmit(e) {
  e.preventDefault();
  const teamA = document.getElementById('match-team-a-select').value;
  const teamB = document.getElementById('match-team-b-select').value;
  const date = document.getElementById('match-date-input').value;
  const time = document.getElementById('match-time-input').value;
  const venue = document.getElementById('match-venue-input').value;

  try {
    const res = await apiRequest('/api/matches/admin/create', 'POST', {
      team_a_id: teamA,
      team_b_id: teamB,
      date,
      time,
      venue
    });

    if (res.success) {
      showToast(res.message, 'success');
      loadAdminMatches();
      closeModal('create-match-modal');
    }
  } catch (err) {}
}

// -------------------------------------------------------------------
// LIVE SCORING PANEL LOGIC
// -------------------------------------------------------------------
let currentScoringMatchId = null;

async function loadAdminScoringPanel() {
  const urlParams = new URLSearchParams(window.location.search);
  currentScoringMatchId = urlParams.get('id');

  if (!currentScoringMatchId) return;

  try {
    const res = await apiRequest(`/api/matches/${currentScoringMatchId}`);
    if (!res.success) return;

    const m = res.match;
    document.getElementById('scoring-match-title').textContent = `${m.team_a_name} vs ${m.team_b_name}`;
    document.getElementById('scoring-match-score').textContent = `${m.team_a_score} - ${m.team_b_score}`;

    // Populate Goal Scorer Player Dropdown
    const elPlayerSelect = document.getElementById('goal-scorer-select');
    const elAssistSelect = document.getElementById('goal-assist-select');

    const allPlayers = [...(res.lineups.team_a || []), ...(res.lineups.team_b || [])];
    if (elPlayerSelect) {
      elPlayerSelect.innerHTML = allPlayers.map(p => `<option value="${p.id}">${p.name} (${p.position})</option>`).join('');
    }
    if (elAssistSelect) {
      elAssistSelect.innerHTML = `<option value="">-- No Assist --</option>` + allPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
  } catch (err) {}
}

async function adminStartLiveMatch() {
  if (!currentScoringMatchId) return;
  try {
    const res = await apiRequest(`/api/matches/admin/${currentScoringMatchId}/start`, 'POST');
    if (res.success) {
      showToast('Match is now LIVE!', 'success');
      loadAdminScoringPanel();
    }
  } catch (err) {}
}

async function adminRecordGoalSubmit() {
  const playerId = document.getElementById('goal-scorer-select').value;
  const assistId = document.getElementById('goal-assist-select').value;
  const minute = document.getElementById('goal-minute-input').value;
  const teamId = document.getElementById('goal-team-select').value;

  try {
    const res = await apiRequest(`/api/matches/admin/${currentScoringMatchId}/event`, 'POST', {
      team_id: teamId,
      player_id: playerId,
      assist_player_id: assistId || null,
      event_type: 'GOAL',
      minute: minute || 1
    });

    if (res.success) {
      showToast(res.message, 'success');
      loadAdminScoringPanel();
      closeModal('record-goal-modal');
    }
  } catch (err) {}
}

async function adminFinishMatch() {
  if (!confirm('Are you sure you want to end match and automatically calculate points table standings?')) return;
  try {
    const res = await apiRequest(`/api/matches/admin/${currentScoringMatchId}/finish`, 'POST');
    if (res.success) {
      showToast(res.message, 'success');
      setTimeout(() => window.location.href = '/admin/matches.html', 1000);
    }
  } catch (err) {}
}

// -------------------------------------------------------------------
// MODAL HELPERS
// -------------------------------------------------------------------
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}
