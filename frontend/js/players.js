/* PUBLIC PLAYERS LISTING & STATS LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    loadPlayersList(),
    loadPlayerLeaderboards()
  ]).catch(console.error);
});

async function loadPlayersList() {
  const container = document.getElementById('players-grid-container');
  if (!container) return;

  const branch = document.getElementById('filter-branch') ? document.getElementById('filter-branch').value : '';
  const batch = document.getElementById('filter-batch') ? document.getElementById('filter-batch').value : '';
  const position = document.getElementById('filter-position') ? document.getElementById('filter-position').value : '';
  const search = document.getElementById('search-player-input') ? document.getElementById('search-player-input').value : '';

  try {
    let url = `/api/players?branch=${branch}&batch=${batch}&position=${position}&search=${search}`;
    const res = await apiRequest(url);
    if (!res.success || !res.players) return;

    if (res.players.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:3rem;">No players found matching your criteria.</div>`;
      return;
    }

    container.innerHTML = res.players.map(p => `
      <div class="glass-card" style="text-align:center;position:relative;">
        <img src="${p.image}" loading="lazy" style="width:90px;height:90px;border-radius:50%;margin-bottom:0.75rem;object-fit:cover;" alt="${p.name}" referrerpolicy="no-referrer">
        <h3 style="font-size:1.25rem;margin-bottom:0.25rem;">${p.name}</h3>
        <div style="display:flex;justify-content:center;gap:0.4rem;margin-bottom:0.75rem;">
          <span class="badge badge-position">${p.position}</span>
          <span class="badge badge-branch">${p.branch}</span>
          <span class="badge badge-batch">${p.batch}</span>
        </div>
        <div style="border-top:1px solid var(--border-color);padding-top:0.75rem;font-size:0.85rem;">
          <div style="color:var(--text-muted);">Status: <strong style="color:${p.status === 'SOLD' ? 'var(--primary-green)' : (p.status === 'UNSOLD' ? 'var(--crimson-accent)' : 'var(--gold-accent)')};">${p.status}</strong></div>
          ${p.team_name ? `<div style="font-weight:700;color:var(--cyan-accent);margin-top:0.25rem;">Team: ${p.team_name} (${p.final_price} pts)</div>` : `<div style="color:var(--text-muted);margin-top:0.25rem;">Base Price: ${p.base_price} pts</div>`}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading players:', err);
  }
}

async function loadPlayerLeaderboards() {
  const containerScorers = document.getElementById('leaderboard-top-scorers');
  const containerAssists = document.getElementById('leaderboard-top-assists');
  if (!containerScorers && !containerAssists) return;

  try {
    const res = await apiRequest('/api/stats/player-stats');
    if (!res.success) return;

    if (containerScorers && res.top_scorers) {
      containerScorers.innerHTML = res.top_scorers.map((s, idx) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-weight:900;color:${idx === 0 ? 'var(--gold-accent)' : 'var(--text-muted)'};">${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1))}</span>
            <img src="${s.image}" style="width:36px;height:36px;border-radius:50%;" alt="${s.player_name}" referrerpolicy="no-referrer">
            <div>
              <div style="font-weight:700;font-size:0.9rem;">${s.player_name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${s.team_name || 'Free Agent'}</div>
            </div>
          </div>
          <div style="font-family:var(--font-heading);font-weight:900;font-size:1.3rem;color:var(--cyan-accent);">
            ⚽ ${s.goals} <span style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">goals</span>
          </div>
        </div>
      `).join('');
    }

    if (containerAssists && res.top_assists) {
      containerAssists.innerHTML = res.top_assists.map((a, idx) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-weight:900;color:${idx === 0 ? 'var(--gold-accent)' : 'var(--text-muted)'};">${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1))}</span>
            <img src="${a.image}" style="width:36px;height:36px;border-radius:50%;" alt="${a.player_name}" referrerpolicy="no-referrer">
            <div>
              <div style="font-weight:700;font-size:0.9rem;">${a.player_name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${a.team_name || 'Free Agent'}</div>
            </div>
          </div>
          <div style="font-family:var(--font-heading);font-weight:900;font-size:1.3rem;color:var(--primary-green);">
            🎯 ${a.assists} <span style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">assists</span>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading leaderboards:', err);
  }
}
