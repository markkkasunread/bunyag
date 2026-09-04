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

const RING_CIRCUMFERENCE = 2 * Math.PI * 64;

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
      lastUpdate.textContent = formatSecondsAgo(s.lastUpdate);
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

  db.ref('/watering/history').limitToLast(30).on('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    const points = Object.keys(data).sort((a, b) => a - b).map(k => data[k].moisture);
    drawChart(points);
  });
}

function updateMoistureRing(pct) {
  pct = Math.max(0, Math.min(100, pct));
  moistureNum.textContent = Math.round(pct);
  const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
  ringFg.setAttribute('stroke-dasharray', `${RING_CIRCUMFERENCE - offset} ${RING_CIRCUMFERENCE}`);
  ringFg.classList.toggle('dry', pct < Number(threshRange.value));
}

function formatSecondsAgo(deviceUptimeSec) {
  // deviceUptimeSec is seconds since the ESP32 booted, not wall-clock time.
  // Good enough to show "reading is live" - for real timestamps, add NTP sync on the ESP32.
  return 'device uptime ' + deviceUptimeSec + 's';
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
