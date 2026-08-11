/* LIVE MATCH CENTER & SCOREBOARD LOGIC */

let currentMatchId = null;
let timerTickInterval = null;
let serverElapsedSeconds = 0;
let isTimerRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentMatchId = urlParams.get('id');

  if (currentMatchId) {
    loadMatchCenter(currentMatchId);
    setupMatchSocket(currentMatchId);
  } else {
    fetchActiveLiveMatch();
  }
});

async function fetchActiveLiveMatch() {
  try {
    const res = await apiRequest('/api/matches?status=LIVE');
    if (res.success && res.matches && res.matches.length > 0) {
      currentMatchId = res.matches[0].id;
      loadMatchCenter(currentMatchId);
      setupMatchSocket(currentMatchId);
    } else {
      const allRes = await apiRequest('/api/matches');
      if (allRes.success && allRes.matches && allRes.matches.length > 0) {
        currentMatchId = allRes.matches[0].id;
        loadMatchCenter(currentMatchId);
        setupMatchSocket(currentMatchId);
      }
    }
  } catch (err) {
    console.error('Error fetching active live match:', err);
  }
}

async function loadMatchCenter(matchId) {
  try {
    const res = await apiRequest(`/api/matches/${matchId}`);
    if (!res.success) return;

    const m = res.match;
    renderScoreboard(m);
    renderMatchEvents(res.events, m.team_a_id);
    renderFormationPitch(res.lineups);

    serverElapsedSeconds = m.elapsed_seconds || 0;
    isTimerRunning = m.status === 'LIVE';
    startClockTimer();
  } catch (err) {
    console.error('Error loading match center:', err);
  }
}

function renderScoreboard(m) {
  const container = document.getElementById('match-scoreboard-container');
  if (!container) return;

  container.innerHTML = `
    <div class="scoreboard-card">
      <div class="match-venue-header">
        EPL 3.0 — ${m.match_name || 'Match #' + m.match_number} | 📍 ${m.venue}
      </div>

      <div class="scoreboard-body">
        <div class="team-score-block">
          <img src="${m.team_a_logo}" class="team-score-logo" alt="${m.team_a_name}">
          <div class="team-score-name">${m.team_a_name}</div>
        </div>

        <div class="score-display-center">
          <div class="score-digits">
            <span id="score-team-a">${m.team_a_score}</span>
            <span class="score-divider">-</span>
            <span id="score-team-b">${m.team_b_score}</span>
          </div>

          <div id="live-match-clock-badge" class="match-clock">
            ${m.status === 'LIVE' ? '⏱ 00:00' : m.status}
          </div>
        </div>

        <div class="team-score-block">
          <img src="${m.team_b_logo}" class="team-score-logo" alt="${m.team_b_name}">
          <div class="team-score-name">${m.team_b_name}</div>
        </div>
      </div>
    </div>
  `;
}

function startClockTimer() {
  if (timerTickInterval) clearInterval(timerTickInterval);

  const clockBadge = document.getElementById('live-match-clock-badge');
  if (!clockBadge) return;

  function updateDisplay() {
    if (isTimerRunning) {
      serverElapsedSeconds++;
    }
    const mins = Math.floor(serverElapsedSeconds / 60);
    const secs = serverElapsedSeconds % 60;
    const formatted = `⏱ ${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
    clockBadge.textContent = formatted;
  }

  updateDisplay();
  if (isTimerRunning) {
    timerTickInterval = setInterval(updateDisplay, 1000);
  }
}

function renderMatchEvents(events, teamAId) {
  const container = document.getElementById('match-events-timeline');
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:2rem;">Match kickoff underway. No goal events yet.</div>`;
    return;
  }

  container.innerHTML = events.map(e => {
    const isTeamA = parseInt(e.team_id, 10) === parseInt(teamAId, 10);
    let icon = '⚽';
    if (e.event_type === 'YELLOW_CARD') icon = '🟨';
    if (e.event_type === 'RED_CARD') icon = '🟥';
    if (e.event_type === 'SUBSTITUTION') icon = '🔄';

    return `
      <div class="event-row ${isTeamA ? 'left' : 'right'}">
        <div class="event-minute-pin">${e.minute}'</div>
        <div class="event-badge-item">
          <span style="font-size:1.2rem;">${icon}</span>
          <div>
            <div style="font-weight:700;font-size:0.9rem;">${e.player_name}</div>
            ${e.assist_player_name ? `<div style="font-size:0.75rem;color:var(--text-muted);">Assist: ${e.assist_player_name}</div>` : ''}
            ${e.details ? `<div style="font-size:0.75rem;color:var(--text-dim);">${e.details}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFormationPitch(lineups) {
  const pitch = document.getElementById('formation-pitch-container');
  if (!pitch || !lineups) return;

  const a = lineups.team_a || [];
  const b = lineups.team_b || [];

  pitch.innerHTML = `
    <div class="pitch-container">
      <div class="pitch-line-center"></div>
      <div class="pitch-circle-center"></div>

      <!-- TEAM A ATTACKING HALF -->
      <div class="formation-row">
        ${a.slice(0, 4).map(p => `
          <div class="pitch-player">
            <img src="${p.image}" alt="${p.name}">
            <span class="pitch-player-name">${p.name}</span>
          </div>
        `).join('')}
      </div>

      <!-- TEAM B ATTACKING HALF -->
      <div class="formation-row" style="margin-top:4rem;">
        ${b.slice(0, 4).map(p => `
          <div class="pitch-player">
            <img src="${p.image}" alt="${p.name}">
            <span class="pitch-player-name">${p.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function setupMatchSocket(matchId) {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('join_match', matchId);

  socket.on('match_event', (data) => {
    if (String(data.match_id) === String(matchId)) {
      showToast(`⚽ EVENT! ${data.event.type} by ${data.event.player_name} (${data.event.minute}')`, 'success');
      const elA = document.getElementById('score-team-a');
      const elB = document.getElementById('score-team-b');
      if (elA) elA.textContent = data.team_a_score;
      if (elB) elB.textContent = data.team_b_score;

      loadMatchCenter(matchId);
    }
  });

  socket.on('match_started', (data) => {
    if (String(data.match_id) === String(matchId)) {
      showToast('⚽ Match Kickoff! Match is LIVE!', 'info');
      isTimerRunning = true;
      startClockTimer();
    }
  });

  socket.on('match_finished', (data) => {
    if (String(data.match_id) === String(matchId)) {
      showToast('🏁 FULL TIME! Match Completed.', 'info');
      isTimerRunning = false;
      if (timerTickInterval) clearInterval(timerTickInterval);
    }
  });
}
