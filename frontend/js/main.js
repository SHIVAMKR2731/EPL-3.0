/* HOME PAGE & GENERAL UI LOGIC WITH GLOBAL REAL-TIME TICKER */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadHomeWidgets();
  initGlobalAuctionTicker();
});

function initNavbar() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
}

async function loadHomeWidgets() {
  try {
    const res = await apiRequest('/api/stats/home-widgets');
    if (!res.success) return;

    // Metric counters
    const elTotalPlayers = document.getElementById('metric-total-players');
    const elSoldPlayers = document.getElementById('metric-sold-players');
    const elTotalTeams = document.getElementById('metric-total-teams');

    if (elTotalPlayers) elTotalPlayers.textContent = res.summary.total_players;
    if (elSoldPlayers) elSoldPlayers.textContent = res.summary.sold_players;
    if (elTotalTeams) elTotalTeams.textContent = res.summary.total_teams;

    // Live Indicator Badge in Navbar
    const navLiveBadge = document.getElementById('nav-live-badge');
    if (navLiveBadge) {
      if (res.live_event === 'AUCTION') {
        navLiveBadge.innerHTML = `<a href="/auction.html" class="live-badge"><span class="pulse-dot"></span> 🔴 LIVE AUCTION</a>`;
      } else if (res.live_event === 'MATCH') {
        navLiveBadge.innerHTML = `<a href="/live-match.html?id=${res.live_match ? res.live_match.id : ''}" class="live-badge"><span class="pulse-dot"></span> 🔴 LIVE MATCH</a>`;
      } else {
        navLiveBadge.innerHTML = '';
      }
    }

    // Current League Leader Widget
    const leaderContainer = document.getElementById('widget-league-leader');
    if (leaderContainer && res.league_leader) {
      const l = res.league_leader;
      leaderContainer.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;">
          <img src="${l.team_logo}" style="width:50px;height:50px;border-radius:50%;" alt="${l.team_name}">
          <div>
            <h3 style="font-size:1.25rem;">🏆 ${l.team_name}</h3>
            <p style="color:var(--text-muted);font-size:0.85rem;">Points: <strong style="color:var(--cyan-accent);">${l.points}</strong> | Matches: ${l.played} | Wins: ${l.won}</p>
          </div>
        </div>
      `;
    }

    // Upcoming Clash Countdown Card
    const upcomingContainer = document.getElementById('widget-upcoming-clash');
    if (upcomingContainer && res.upcoming_match) {
      const m = res.upcoming_match;
      upcomingContainer.innerHTML = `
        <div style="text-align:center;">
          <span class="badge badge-batch" style="margin-bottom:0.5rem;display:inline-block;">🔥 UPCOMING CLASH</span>
          <div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;margin:1rem 0;">
            <div style="text-align:center;">
              <img src="${m.team_a_logo}" style="width:48px;height:48px;border-radius:50%;" alt="${m.team_a_name}">
              <div style="font-weight:700;font-size:0.95rem;margin-top:0.25rem;">${m.team_a_name}</div>
            </div>
            <div style="font-family:var(--font-heading);font-weight:900;font-size:1.5rem;color:var(--gold-accent);">VS</div>
            <div style="text-align:center;">
              <img src="${m.team_b_logo}" style="width:48px;height:48px;border-radius:50%;" alt="${m.team_b_name}">
              <div style="font-weight:700;font-size:0.95rem;margin-top:0.25rem;">${m.team_b_name}</div>
            </div>
          </div>
          <p style="color:var(--text-muted);font-size:0.85rem;">📅 ${m.date} at ${m.time} | 📍 ${m.venue}</p>
          <a href="/matches.html" class="btn btn-outline btn-sm" style="margin-top:0.85rem;">View Full Fixtures</a>
        </div>
      `;
    }
  } catch (err) {
    console.error('Home widgets error:', err);
  }
}

/* GLOBAL REAL-TIME LIVE AUCTION BROADCAST TICKER */
function initGlobalAuctionTicker() {
  const socket = getSocket();
  if (!socket) return;

  socket.on('auction_started', (data) => {
    updateGlobalTicker(data.current_player, data.current_bid, data.current_team, data.status);
  });

  socket.on('bid_updated', (data) => {
    updateGlobalTicker(null, data.current_bid, data.current_team, 'AUCTION_RUNNING');
  });

  socket.on('auction_timer_tick', (data) => {
    updateGlobalTickerTimer(data.timer_seconds);
  });

  socket.on('player_sold', () => {
    removeGlobalTicker();
  });

  socket.on('player_unsold', () => {
    removeGlobalTicker();
  });
}

function updateGlobalTicker(player, bidAmount, team, status) {
  if (window.location.pathname.endsWith('/auction.html')) return;

  let banner = document.getElementById('global-live-auction-ticker');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'global-live-auction-ticker';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: linear-gradient(90deg, #0f172a, rgba(6,182,212,0.95), #0f172a);
      color: #fff;
      padding: 0.6rem 1rem;
      text-align: center;
      font-size: 0.9rem;
      font-weight: 700;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(6,182,212,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    `;
    document.body.appendChild(banner);
    document.body.style.paddingTop = '45px';
  }

  const pName = player ? player.name : (banner.dataset.playerName || 'Live Player');
  if (player) banner.dataset.playerName = player.name;

  const tName = team ? team.name : 'No Bids';
  const bidVal = bidAmount ? `₹${bidAmount.toLocaleString()}` : 'Base Price';

  banner.innerHTML = `
    <span class="pulse-dot" style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;"></span>
    <span>🔴 LIVE AUCTION: <strong>${pName}</strong> | Bid: <strong style="color:#f59e0b;">${bidVal}</strong> (${tName})</span>
    <span id="global-ticker-timer" style="background:rgba(0,0,0,0.3);padding:0.2rem 0.6rem;border-radius:12px;">⏱ 00:30</span>
    <a href="/auction.html" style="background:#10b981;color:#fff;padding:0.25rem 0.75rem;border-radius:12px;text-decoration:none;font-size:0.8rem;">WATCH LIVE ➔</a>
  `;
}

function updateGlobalTickerTimer(seconds) {
  const elTimer = document.getElementById('global-ticker-timer');
  if (elTimer) {
    elTimer.textContent = `⏱ 00:${seconds < 10 ? '0' + seconds : seconds}`;
  }
}

function removeGlobalTicker() {
  const banner = document.getElementById('global-live-auction-ticker');
  if (banner) {
    banner.remove();
    document.body.style.paddingTop = '0px';
  }
}
