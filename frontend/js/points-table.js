/* POINTS TABLE / LEAGUE STANDINGS LOGIC */

document.addEventListener('DOMContentLoaded', () => {
  loadPointsTable();
});

async function loadPointsTable() {
  const container = document.getElementById('points-table-body');
  if (!container) return;

  try {
    const res = await apiRequest('/api/stats/points-table');
    if (!res.success || !res.standings) return;

    container.innerHTML = res.standings.map((t, idx) => `
      <tr style="${idx === 0 ? 'background:rgba(245,158,11,0.08);font-weight:bold;' : ''}">
        <td style="font-weight:900;color:${idx === 0 ? 'var(--gold-accent)' : 'var(--text-muted)'};">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <img src="${t.team_logo}" style="width:32px;height:32px;border-radius:50%;" alt="${t.team_name}">
            <span style="font-weight:700;">${t.team_name}</span>
          </div>
        </td>
        <td style="text-align:center;">${t.played}</td>
        <td style="text-align:center;color:var(--primary-green);">${t.won}</td>
        <td style="text-align:center;color:var(--gold-accent);">${t.drawn}</td>
        <td style="text-align:center;color:var(--crimson-accent);">${t.lost}</td>
        <td style="text-align:center;">${t.goals_for}</td>
        <td style="text-align:center;">${t.goals_against}</td>
        <td style="text-align:center;font-weight:700;color:${t.goal_difference >= 0 ? 'var(--primary-green)' : 'var(--crimson-accent)'};">
          ${t.goal_difference > 0 ? '+' + t.goal_difference : t.goal_difference}
        </td>
        <td style="text-align:center;font-family:var(--font-heading);font-weight:900;font-size:1.1rem;color:var(--cyan-accent);">${t.points}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading points table:', err);
  }
}
