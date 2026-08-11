/* PUBLIC LIVE AUCTION CLIENT LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  loadAuctionState();
  setupSocketListeners();
});

async function loadAuctionState() {
  try {
    const res = await apiRequest('/api/auction/current');
    if (!res.success) return;

    renderCurrentPlayer(res.auction.current_player);
    renderBidStage(res.auction.current_bid, res.auction.current_team, res.auction.status);
    renderTimer(res.auction.timer_seconds);
    renderTeamBudgets(res.teams, res.auction.current_team ? res.auction.current_team.id : null);
    renderSoldPlayers(res.sold_players);
    renderUnsoldPlayers(res.unsold_players);
  } catch (err) {
    console.error('Error loading public auction state:', err);
  }
}

function renderCurrentPlayer(player) {
  const container = document.getElementById('current-player-card');
  if (!container) return;

  if (!player) {
    container.innerHTML = `
      <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">⏱️</div>
        <h3>AUCTION STANDBY</h3>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Waiting for admin to initiate next player auction...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="player-auction-card">
      <div class="player-img-wrapper">
        <img src="${player.image}" alt="${player.name}" referrerpolicy="no-referrer">
      </div>
      <h2 class="player-name">${player.name}</h2>
      <div class="player-meta-badges">
        <span class="badge badge-position">${player.position}</span>
        <span class="badge badge-branch">${player.branch}</span>
        <span class="badge badge-batch">${player.batch}</span>
      </div>
      <div class="base-price-box">
        <div class="base-price-label">BASE PRICE</div>
        <div class="base-price-val">₹${player.base_price}</div>
      </div>
    </div>
  `;
}

function renderBidStage(currentBid, currentTeam, status) {
  const elBid = document.getElementById('current-bid-amount');
  const elBidder = document.getElementById('highest-bidder-info');
  const elStatus = document.getElementById('auction-status-banner');

  if (elStatus) {
    elStatus.textContent = status === 'AUCTION_RUNNING' ? '🔴 LIVE BIDDING IN PROGRESS' : (status === 'PAUSED' ? '⏸️ AUCTION PAUSED' : 'AUCTION IDLE');
  }

  if (elBid) {
    const oldVal = elBid.textContent;
    const newVal = `₹${(currentBid || 0).toLocaleString()}`;
    elBid.textContent = newVal;

    if (oldVal !== newVal) {
      elBid.classList.remove('bid-pulse');
      void elBid.offsetWidth; // Trigger reflow for animation
      elBid.classList.add('bid-pulse');
    }
  }

  if (elBidder) {
    if (currentTeam) {
      elBidder.innerHTML = `
        <span style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">HIGHEST BIDDER:</span>
        <img src="${currentTeam.logo}" class="bidder-logo" alt="${currentTeam.name}">
        <span class="bidder-name">${currentTeam.name}</span>
      `;
      elBidder.style.display = 'flex';
    } else {
      elBidder.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem;">NO BIDS PLACED YET</span>`;
      elBidder.style.display = 'flex';
    }
  }
}

let currentTimerSeconds = 30;
let localTimerInterval = null;
let isAuctionRunning = false;

function startLocalTimer(seconds) {
  if (seconds !== undefined && seconds !== null) {
    currentTimerSeconds = seconds;
  }
  renderTimer(currentTimerSeconds);

  if (!localTimerInterval) {
    localTimerInterval = setInterval(() => {
      if (isAuctionRunning && currentTimerSeconds > 0) {
        currentTimerSeconds--;
        renderTimer(currentTimerSeconds);
      }
    }, 1000);
  }
}

function renderTimer(seconds) {
  const elTimer = document.getElementById('auction-timer');
  if (!elTimer) return;

  const secs = seconds !== undefined && seconds !== null ? seconds : 30;
  const formatted = `⏱ 00:${secs < 10 ? '0' + secs : secs}`;
  elTimer.textContent = formatted;

  if (secs <= 5) {
    elTimer.classList.add('urgent');
  } else {
    elTimer.classList.remove('urgent');
  }
}

function renderTeamBudgets(teams, activeTeamId) {
  const container = document.getElementById('team-budgets-list');
  if (!container || !teams) return;

  container.innerHTML = teams.map(t => `
    <div class="team-budget-item ${t.id === activeTeamId ? 'active-bidder' : ''}">
      <div class="team-meta">
        <img src="${t.logo}" class="team-logo-sm" alt="${t.name}">
        <span class="team-title">${t.name}</span>
      </div>
      <div class="budget-val">₹${(t.remaining_budget || 0).toLocaleString()}</div>
    </div>
  `).join('');
}

function renderSoldPlayers(soldList) {
  const container = document.getElementById('sold-players-grid');
  if (!container) return;

  if (!soldList || soldList.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem;">No players sold yet.</div>`;
    return;
  }

  container.innerHTML = soldList.map(p => `
    <div class="sold-card-mini">
      <img src="${p.image}" class="mini-img" alt="${p.name}" referrerpolicy="no-referrer">
      <div class="mini-info">
        <div class="mini-name">${p.name}</div>
        <div class="mini-sub">${p.position} | <strong style="color:var(--primary-green);">${p.team_name}</strong> (₹${p.final_price})</div>
      </div>
    </div>
  `).join('');
}

function renderUnsoldPlayers(unsoldList) {
  const container = document.getElementById('unsold-players-grid');
  if (!container) return;

  if (!unsoldList || unsoldList.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem;">No unsold players yet.</div>`;
    return;
  }

  container.innerHTML = unsoldList.map(p => `
    <div class="unsold-card-mini">
      <img src="${p.image}" class="mini-img" alt="${p.name}" referrerpolicy="no-referrer">
      <div class="mini-info">
        <div class="mini-name">${p.name}</div>
        <div class="mini-sub">${p.position} | Base: ₹${p.base_price}</div>
      </div>
    </div>
  `).join('');
}

function setupSocketListeners() {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('join_auction');

  socket.on('auction_started', (data) => {
    showToast(`📢 Auction Started for ${data.current_player.name}!`, 'info');
    isAuctionRunning = true;
    renderCurrentPlayer(data.current_player);
    renderBidStage(data.current_bid, data.current_team, data.status);
    startLocalTimer(data.timer_seconds || 30);
  });

  socket.on('bid_updated', (data) => {
    isAuctionRunning = true;
    renderBidStage(data.current_bid, data.current_team, 'AUCTION_RUNNING');
    currentTimerSeconds = data.timer_seconds !== undefined ? data.timer_seconds : 30;
    startLocalTimer(currentTimerSeconds);
  });

  socket.on('auction_timer_tick', (data) => {
    isAuctionRunning = true;
    currentTimerSeconds = data.timer_seconds;
    startLocalTimer(currentTimerSeconds);
  });

  socket.on('player_sold', (data) => {
    isAuctionRunning = false;
    showToast(`🟢 SOLD! ${data.player.name} sold to ${data.team.name} for ₹${data.player.final_price}!`, 'success');
    loadAuctionState();
  });

  socket.on('player_unsold', (data) => {
    isAuctionRunning = false;
    showToast(`🔴 Player Marked UNSOLD`, 'warning');
    loadAuctionState();
  });

  socket.on('auction_status_changed', (data) => {
    if (data.status !== 'AUCTION_RUNNING') isAuctionRunning = false;
    loadAuctionState();
  });
}
