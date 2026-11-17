const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.querySelector('span').textContent = isOpen ? '×' : '+';
});

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (menuButton) menuButton.querySelector('span').textContent = '+';
  });
});


const themeButton = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let selectedTheme;
try { selectedTheme = localStorage.getItem('theme'); } catch (_) {}
if (selectedTheme !== 'light' && selectedTheme !== 'dark') selectedTheme = null;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const action = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
  themeButton?.setAttribute('aria-label', action);
  themeButton?.setAttribute('title', action);
}

applyTheme(document.documentElement.dataset.theme);
themeButton?.addEventListener('click', () => {
  selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(selectedTheme);
  try { localStorage.setItem('theme', selectedTheme); } catch (_) {}
});

systemTheme.addEventListener('change', (event) => {
  if (!selectedTheme) applyTheme(event.matches ? 'dark' : 'light');
});

const dashboard = document.querySelector('.analytics-preview');
const dashboardContent = dashboard?.querySelector('.dashboard-content');
const dashboardLoading = dashboard?.querySelector('.dashboard-loading');
const dashboardEmpty = dashboard?.querySelector('.dashboard-empty');
const chartCanvas = document.querySelector('#registration-chart');
let registrationChart;

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function showDashboardEmptyState() {
  dashboardLoading?.setAttribute('hidden', '');
  dashboardContent?.setAttribute('hidden', '');
  dashboardEmpty?.removeAttribute('hidden');
}

function showDashboardContent() {
  dashboardLoading?.setAttribute('hidden', '');
  dashboardEmpty?.setAttribute('hidden', '');
  dashboardContent?.removeAttribute('hidden');
}

function validRecord(record) {
  return record && typeof record.registration_month === 'string'
    && ['EV', 'ICE', 'Hybrid', 'Other'].includes(record.vehicle_category)
    && Number.isFinite(Number(record.total_registrations));
}

function createIndexedSeries(rows, category, labels) {
  const values = new Map(rows.filter((row) => row.vehicle_category === category)
    .map((row) => [row.registration_month, Number(row.total_registrations)]));
  const firstValue = labels.map((label) => values.get(label)).find((value) => Number.isFinite(value) && value > 0);
  return {
    data: labels.map((label) => {
      const absolute = values.get(label);
      if (!Number.isFinite(absolute) || !Number.isFinite(firstValue)) return null;
      return { x: label, y: (absolute / firstValue) * 100, absolute };
    }),
    hasData: Number.isFinite(firstValue),
  };
}

function renderRegistrationDashboard(rows) {
  const cleanRows = rows.filter(validRecord);
  if (!cleanRows.length || !window.Chart || !chartCanvas) {
    showDashboardEmptyState();
    return;
  }

  const labels = [...new Set(cleanRows.map((row) => row.registration_month))].sort();
  const total = cleanRows.reduce((sum, row) => sum + Number(row.total_registrations), 0);
  const evTotal = cleanRows.filter((row) => row.vehicle_category === 'EV')
    .reduce((sum, row) => sum + Number(row.total_registrations), 0);
  document.querySelector('#kpi-total').textContent = numberFormatter.format(total);
  document.querySelector('#kpi-ev').textContent = numberFormatter.format(evTotal);
  document.querySelector('#kpi-share').textContent = total ? `${percentFormatter.format((evTotal / total) * 100)}%` : '—';

  const evSeries = createIndexedSeries(cleanRows, 'EV', labels);
  const iceSeries = createIndexedSeries(cleanRows, 'ICE', labels);
  showDashboardContent();
  registrationChart?.destroy();
  registrationChart = new Chart(chartCanvas, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'EV', data: evSeries.data, borderColor: '#b9f06d', backgroundColor: '#b9f06d', pointRadius: 2, pointHoverRadius: 4, borderWidth: 2, tension: 0.25, spanGaps: false },
      { label: 'ICE', data: iceSeries.data, borderColor: '#62d6cc', backgroundColor: '#62d6cc', pointRadius: 2, pointHoverRadius: 4, borderWidth: 2, tension: 0.25, spanGaps: false },
    ] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (context) => {
          const point = context.raw;
          return `${context.dataset.label}: ${numberFormatter.format(point.absolute)} registrations`;
        } } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8ab9af', maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { family: 'DM Mono', size: 9 } } },
        y: { beginAtZero: false, grid: { color: 'rgba(140, 205, 192, 0.12)' }, ticks: { color: '#8ab9af', callback: (value) => `${value}`, font: { family: 'DM Mono', size: 9 } }, title: { display: true, text: 'INDEX', color: '#8ab9af', font: { family: 'DM Mono', size: 9 } } },
      },
    },
  });
}

if (dashboard) {
  fetch('data/monthly_summary.json')
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((rows) => { if (!Array.isArray(rows)) throw new Error('Expected an array'); renderRegistrationDashboard(rows); })
    .catch(() => showDashboardEmptyState());
}


/* =========================================
   Custom cursor trail animation
   ========================================= */

(() => {
  // Disable on touch devices and reduced-motion settings.
  const finePointer = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  );

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  if (!finePointer.matches || reducedMotion.matches) return;

  const trailCount = 7;
  const trailElements = [];
  const positions = [];

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let visible = false;

  // Create the trail elements dynamically.
  for (let i = 0; i < trailCount; i++) {
    const dot = document.createElement('div');

    dot.className = 'cursor-trail';

    if (i === 0) {
      dot.classList.add('cursor-main');
    }

    dot.setAttribute('aria-hidden', 'true');

    const progress = i / (trailCount - 1);

    dot.style.setProperty(
      '--trail-size',
      `${9 - progress * 4}px`
    );

    dot.style.setProperty(
      '--trail-opacity',
      `${0.75 - progress * 0.6}`
    );

    dot.classList.add('is-hidden');

    document.body.appendChild(dot);

    trailElements.push(dot);

    positions.push({
      x: mouseX,
      y: mouseY
    });
  }

  // Capture cursor position.
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;

    mouseX = event.clientX;
    mouseY = event.clientY;
    visible = true;
  });

  // Hide when the cursor leaves the browser window.
  document.addEventListener('pointerleave', () => {
    visible = false;
  });

  document.addEventListener('pointerenter', () => {
    visible = true;
  });

  // Smooth animation loop.
  function animate() {
    positions[0].x += (mouseX - positions[0].x) * 0.35;
    positions[0].y += (mouseY - positions[0].y) * 0.35;

    for (let i = 1; i < trailCount; i++) {
      const previous = positions[i - 1];
      const current = positions[i];

      current.x += (previous.x - current.x) * 0.28;
      current.y += (previous.y - current.y) * 0.28;
    }

    trailElements.forEach((dot, index) => {
      const position = positions[index];

      dot.style.transform =
        `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;

      dot.classList.toggle('is-hidden', !visible);
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Handle accessibility setting changes.
  reducedMotion.addEventListener('change', (event) => {
    trailElements.forEach((dot) => {
      dot.style.display = event.matches ? 'none' : '';
    });
  });
})();
