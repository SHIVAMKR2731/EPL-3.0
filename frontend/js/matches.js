/* MATCH FIXTURES & RESULTS CLIENT LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  loadMatches();
});

async function loadMatches(filterStatus = '') {
  const container = document.getElementById('matches-grid-container');
  if (!container) return;

  try {
    const url = filterStatus ? `/api/matches?status=${filterStatus}` : '/api/matches';
    const res = await apiRequest(url);
    if (!res.success || !res.matches) return;

    if (res.matches.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:3rem;grid-column:1/-1;">No fixtures found.</div>`;
      return;
    }

    container.innerHTML = res.matches.map(m => `
      <div class="glass-card" style="position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;font-size:0.8rem;color:var(--text-muted);">
          <span>${m.match_name || 'Match #' + m.match_number}</span>
          ${m.status === 'LIVE' ? '<span class="live-badge"><span class="pulse-dot"></span> LIVE NOW</span>' : (m.status === 'COMPLETED' ? '<span class="badge" style="background:rgba(16,185,129,0.15);color:var(--primary-green);">FINAL RESULT</span>' : '<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);">UPCOMING</span>')}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-around;gap:1rem;margin:1.25rem 0;">
          <div style="text-align:center;flex:1;">
            <img src="${m.team_a_logo}" style="width:54px;height:54px;border-radius:50%;margin-bottom:0.4rem;" alt="${m.team_a_name}">
            <div style="font-weight:700;font-size:1rem;">${m.team_a_name}</div>
          </div>

          <div style="text-align:center;">
            ${m.status === 'UPCOMING' ? 
              `<div style="font-family:var(--font-heading);font-weight:900;font-size:1.6rem;color:var(--gold-accent);">VS</div>` :
              `<div style="font-family:var(--font-heading);font-weight:900;font-size:2.2rem;color:#fff;">${m.team_a_score} - ${m.team_b_score}</div>`
            }
          </div>

          <div style="text-align:center;flex:1;">
            <img src="${m.team_b_logo}" style="width:54px;height:54px;border-radius:50%;margin-bottom:0.4rem;" alt="${m.team_b_name}">
            <div style="font-weight:700;font-size:1rem;">${m.team_b_name}</div>
          </div>
        </div>

        <div style="text-align:center;border-top:1px solid var(--border-color);padding-top:0.85rem;margin-top:1rem;font-size:0.85rem;color:var(--text-muted);">
          <span>📅 ${m.date} at ${m.time} | 📍 ${m.venue}</span>
        </div>

        <div style="margin-top:1rem;text-align:center;">
          ${m.status === 'LIVE' ? `<a href="/live-match.html?id=${m.id}" class="btn btn-danger btn-sm" style="width:100%;">Enter Live Match Center 🔴</a>` : `<a href="/live-match.html?id=${m.id}" class="btn btn-outline btn-sm" style="width:100%;">View Match Details</a>`}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading matches:', err);
  }
}

function filterMatchesTab(status, btnElement) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  loadMatches(status);
}
