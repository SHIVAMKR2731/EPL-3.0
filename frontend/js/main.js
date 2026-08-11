/* HOME PAGE & GENERAL UI LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadHomeWidgets();
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
