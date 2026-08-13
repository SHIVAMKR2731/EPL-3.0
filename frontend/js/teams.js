/* TEAMS & SQUAD VIEWER LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  loadTeamsList();
});

async function loadTeamsList() {
  const container = document.getElementById('teams-grid-container');
  if (!container) return;

  try {
    const res = await apiRequest('/api/teams');
    if (!res.success || !res.teams) return;

    container.innerHTML = res.teams.map(t => `
      <div class="glass-card" style="text-align:center;cursor:pointer;" onclick="openTeamSquadModal(${t.id})">
        <img src="${t.logo}" style="width:80px;height:80px;border-radius:50%;margin-bottom:1rem;" alt="${t.name}">
        <h3 style="font-size:1.4rem;margin-bottom:0.25rem;">${t.name}</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;">Captain: <strong>${t.captain_name || 'N/A'}</strong></p>
        
        <div style="display:flex;justify-content:space-between;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border-color);font-size:0.85rem;">
          <div>
            <div style="color:var(--text-muted);">SQUAD</div>
            <div style="font-weight:800;font-size:1.1rem;color:var(--cyan-accent);">${t.squad_count || 0} Players</div>
          </div>
          <div>
            <div style="color:var(--text-muted);">BUDGET</div>
            <div style="font-weight:800;font-size:1.1rem;color:var(--gold-accent);">${(t.remaining_budget || 0).toLocaleString()} pts</div>
          </div>
        </div>

        <button class="btn btn-outline btn-sm" style="width:100%;margin-top:1rem;">View Squad & Formation</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading teams list:', err);
  }
}

async function openTeamSquadModal(teamId) {
  try {
    const res = await apiRequest(`/api/teams/${teamId}`);
    if (!res.success) return;

    const modal = document.getElementById('team-squad-modal');
    const content = document.getElementById('team-squad-content');
    if (!modal || !content) return;

    const t = res.team;
    const sq = res.squadByPosition;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color);">
        <img src="${t.logo}" style="width:70px;height:70px;border-radius:50%;" alt="${t.name}">
        <div>
          <h2 style="font-size:1.8rem;">${t.name}</h2>
          <p style="color:var(--text-muted);">Captain: ${t.captain_name} | Owner: ${t.owner_name}</p>
          <p style="color:var(--cyan-accent);font-size:0.9rem;font-weight:700;">Remaining Budget: ${(t.remaining_budget || 0).toLocaleString()} pts | Squad Value: ${(t.total_squad_value || 0).toLocaleString()} pts</p>
        </div>
      </div>

      <!-- FOOTBALL SQUAD FORMATION LIST -->
      <div style="display:flex;flex-direction:column;gap:1.25rem;">
        ${renderPositionSquadGroup('🧤 GOALKEEPERS', sq.Goalkeepers)}
        ${renderPositionSquadGroup('🛡️ DEFENDERS', sq.Defenders)}
        ${renderPositionSquadGroup('⚙️ MIDFIELDERS', sq.Midfielders)}
        ${renderPositionSquadGroup('⚽ FORWARDS', sq.Forwards)}
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    console.error('Error fetching team squad:', err);
  }
}

function renderPositionSquadGroup(title, players) {
  if (!players || players.length === 0) {
    return `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;"><strong>${title}</strong>: None acquired</div>`;
  }

  return `
    <div>
      <h4 style="color:var(--cyan-accent);font-size:0.9rem;margin-bottom:0.5rem;">${title} (${players.length})</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:0.75rem;">
        ${players.map(p => `
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;display:flex;align-items:center;gap:0.65rem;">
            <img src="${p.image}" style="width:36px;height:36px;border-radius:50%;" alt="${p.name}">
            <div>
              <div style="font-weight:700;font-size:0.85rem;">${p.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${p.branch} (${p.batch}) | ${p.final_price || p.base_price} pts</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function closeTeamModal() {
  const modal = document.getElementById('team-squad-modal');
  if (modal) modal.classList.remove('active');
}
