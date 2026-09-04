firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
 
const connDot = document.getElementById('connDot');
const connText = document.getElementById('connText');
const ringFg = document.getElementById('ringFg');
const moistureNum = document.getElementById('moistureNum');
const pumpBadge = document.getElementById('pumpBadge');
const lastUpdate = document.getElementById('lastUpdate');
const rawVal = document.getElementById('rawVal');
const autoToggle = document.getElementById('autoToggle');
const threshRange = document.getElementById('threshRange');
const threshVal = document.getElementById('threshVal');
const durationInput = document.getElementById('durationInput');
const cooldownInput = document.getElementById('cooldownInput');
const manualBtn = document.getElementById('manualBtn');
const chartHolder = document.getElementById('chartHolder');
const lastWateredVal = document.getElementById('lastWateredVal');
const wateringsTodayVal = document.getElementById('wateringsTodayVal');
const wateringsTotalVal = document.getElementById('wateringsTotalVal');
const rangeFilter = document.getElementById('rangeFilter');
const pumpOnlyFilter = document.getElementById('pumpOnlyFilter');
const rowCount = document.getElementById('rowCount');
const recordsBody = document.getElementById('recordsBody');
 
const RING_CIRCUMFERENCE = 2 * Math.PI * 64;
 
let historyRecords = []; // { timestamp, moisture, pumpOn }
let sortKey = 'timestamp';
let sortDir = -1; // -1 = newest first
 
// ---------- Auth ----------
// Sign in with the same email/password registered in Firebase Authentication
// (must match Authentication > Sign-in method > Email/Password, and the device credentials).
auth.signInWithEmailAndPassword(DASHBOARD_LOGIN.email, DASHBOARD_LOGIN.password)
  .then(() => {
    connText.textContent = 'Connected';
    connDot.classList.add('live');
    attachListeners();
  })
  .catch((err) => {
    connText.textContent = 'Sign-in failed: ' + err.message;
  });
 
// ---------- Live data ----------
function attachListeners() {
  db.ref('/watering/status').on('value', (snap) => {
    const s = snap.val();
    if (!s) return;
    updateMoistureRing(s.moisture ?? 0);
    rawVal.textContent = s.raw ?? '--';
    if (s.lastUpdate) {
      lastUpdate.textContent = formatDateTime(s.lastUpdate);
    }
    if (s.pumpOn) {
      pumpBadge.textContent = 'Pump running';
      pumpBadge.classList.remove('off');
    } else {
      pumpBadge.textContent = 'Pump idle';
      pumpBadge.classList.add('off');
    }
  });
 
  db.ref('/watering/config').on('value', (snap) => {
    const c = snap.val() || {};
    autoToggle.checked = c.autoMode !== false;
    threshRange.value = c.threshold ?? 30;
    threshVal.textContent = c.threshold ?? 30;
    durationInput.value = c.durationSec ?? 5;
    cooldownInput.value = c.cooldownSec ?? 60;
    manualBtn.disabled = c.autoMode !== false ? false : false;
    manualBtn.textContent = c.manualPumpOn ? 'Stop watering' : 'Water now';
  });
 
  db.ref('/watering/history').limitToLast(500).on('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    historyRecords = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
    drawChart(historyRecords.slice(-30).map(r => r.moisture));
    renderTable();
  });
 
  db.ref('/watering/events').limitToLast(1000).on('value', (snap) => {
    const data = snap.val();
    updateWateringStats(data ? Object.values(data) : []);
  });
}
 
function updateWateringStats(events) {
  if (!events.length) {
    lastWateredVal.textContent = '--';
    wateringsTodayVal.textContent = '0';
    wateringsTotalVal.textContent = '0';
    return;
  }
  events.sort((a, b) => a.timestamp - b.timestamp);
  const last = events[events.length - 1];
  lastWateredVal.textContent = formatDateTime(last.timestamp);
 
  const todayStr = new Date().toDateString();
  const todayCount = events.filter(e => new Date(e.timestamp * 1000).toDateString() === todayStr).length;
  wateringsTodayVal.textContent = todayCount;
  wateringsTotalVal.textContent = events.length;
}
 
function formatDateTime(epochSec) {
  return new Date(epochSec * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
 
// ---------- Records table: filtering + sorting ----------
rangeFilter.addEventListener('change', renderTable);
pumpOnlyFilter.addEventListener('change', renderTable);
 
document.querySelectorAll('#recordsTable thead th').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = 1;
    }
    renderTable();
  });
});
 
function renderTable() {
  const hours = Number(rangeFilter.value);
  const cutoff = hours > 0 ? (Date.now() / 1000) - hours * 3600 : 0;
  const pumpOnly = pumpOnlyFilter.checked;
 
  let rows = historyRecords.filter(r => r.timestamp >= cutoff);
  if (pumpOnly) rows = rows.filter(r => r.pumpOn);
 
  rows = rows.slice().sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1) * sortDir);
 
  rowCount.textContent = rows.length + (rows.length === 1 ? ' record' : ' records');
 
  recordsBody.innerHTML = rows.map(r => `
    <tr>
      <td>${formatDateTime(r.timestamp)}</td>
      <td>${Math.round(r.moisture)}%</td>
      <td class="${r.pumpOn ? 'pump-yes' : 'pump-no'}">${r.pumpOn ? 'Running' : '—'}</td>
    </tr>
  `).join('');
}
 
function updateMoistureRing(pct) {
  pct = Math.max(0, Math.min(100, pct));
  moistureNum.textContent = Math.round(pct);
  const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
  ringFg.setAttribute('stroke-dasharray', `${RING_CIRCUMFERENCE - offset} ${RING_CIRCUMFERENCE}`);
  ringFg.classList.toggle('dry', pct < Number(threshRange.value));
}
 
// ---------- Controls -> write back to Firebase ----------
let writeTimer = null;
function pushConfig(partial) {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    db.ref('/watering/config').update(partial);
  }, 300);
}
 
autoToggle.addEventListener('change', () => pushConfig({ autoMode: autoToggle.checked }));
 
threshRange.addEventListener('input', () => {
  threshVal.textContent = threshRange.value;
  pushConfig({ threshold: Number(threshRange.value) });
});
 
durationInput.addEventListener('change', () => pushConfig({ durationSec: Number(durationInput.value) }));
cooldownInput.addEventListener('change', () => pushConfig({ cooldownSec: Number(cooldownInput.value) }));
 
manualBtn.addEventListener('click', () => {
  db.ref('/watering/config/manualPumpOn').once('value').then((snap) => {
    const next = !snap.val();
    db.ref('/watering/config').update({ autoMode: false, manualPumpOn: next });
    autoToggle.checked = false;
  });
});
 
// ---------- Simple inline SVG line chart, no external chart library ----------
function drawChart(points) {
  if (points.length < 2) {
    chartHolder.innerHTML = '<p class="chart-empty">Waiting for more readings…</p>';
    return;
  }
  const w = 900, h = 140, pad = 10;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const stepX = (w - pad * 2) / (points.length - 1);
 
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
 
  const path = 'M' + coords.join(' L');
 
  chartHolder.innerHTML = `
    <svg id="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${coords.join(' ')}" fill="none" stroke="#3F7D5C" stroke-width="2" />
      <path d="${path} L${w - pad},${h - pad} L${pad},${h - pad} Z" fill="#3F7D5C" opacity="0.08" stroke="none" />
    </svg>`;
}
