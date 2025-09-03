/* ================================
   CONFIGURACIÓN API y DEMO
================================ */

const API_CONFIG = {
  baseURL:
    (typeof window !== 'undefined' && window.API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) ||
    'http://localhost:3001/api',
  timeout: 10000,
  retryAttempts: 3,
  endpoints: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    budgets: '/admin/budgets',
    transactions: '/admin/transactions',
    statistics: '/admin/statistics',
    alerts: '/admin/alerts'
  }
};

// Cambia window.DEMO_MODE = false en tu HTML cuando conectes la API
const DEMO_MODE = typeof window !== 'undefined' && window.DEMO_MODE === true;

class APIService {
  constructor() {
    this.authToken = localStorage.getItem('authToken');
    this.baseURL = API_CONFIG.baseURL;
  }
  updateAuthToken(token) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
      },
      timeout: API_CONFIG.timeout
    };
    const requestOptions = { ...defaultOptions, ...options };

    for (let attempt = 0; attempt < API_CONFIG.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
        const res = await fetch(url, { ...requestOptions, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        if (attempt === API_CONFIG.retryAttempts - 1) throw e;
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  getDashboardOverview(days = 30) { return this.makeRequest(`${API_CONFIG.endpoints.dashboard}/overview?days=${days}`); }
  getUsers(filters = {}) { return this.makeRequest(`${API_CONFIG.endpoints.users}?${new URLSearchParams(filters)}`); }
  getBudgetTrends(opts = {}) { return this.makeRequest(`${API_CONFIG.endpoints.budgets}/trends?${new URLSearchParams(opts)}`); }
  getTransactions(limit = 60, offset = 0, filters = {}) {
    const params = new URLSearchParams({ limit, offset, ...filters }).toString();
    return this.makeRequest(`${API_CONFIG.endpoints.transactions}?${params}`);
  }
  getAdvancedStatistics(opts = {}) { return this.makeRequest(`${API_CONFIG.endpoints.statistics}/advanced?${new URLSearchParams(opts)}`); }
  getSystemAlerts() { return this.makeRequest(`${API_CONFIG.endpoints.alerts}/active`); }
}
const apiService = new APIService();

/* ================================
   ESTADO
================================ */

const dashboardState = {
  isDark: true,
  dateRange: 30,
  trendPeriod: 'daily',
  performanceMetric: 'efficiency',
  budgetStatusPeriod: 'current',
  loading: false,
  charts: {},
  data: null
};

/* ================================
   UTILIDADES
================================ */

const toDate = d => (d instanceof Date ? d : new Date(d));
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const csvSafe = v => {
  const s = String(v ?? '');
  const guard = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(guard) ? `"${guard.replace(/"/g,'""')}"` : guard;
};

/* ================================
   DATA DEMO
================================ */

const generateSampleOverview = () => ({
  totalBudget: 5_750_000 + Math.floor(Math.random()*500_000),
  totalSpent: 4_320_000 + Math.floor(Math.random()*400_000),
  activeTickets: 120 + Math.floor(Math.random()*40),
  activeUsers: 85 + Math.floor(Math.random()*15),
  efficiency: 82 + Math.random()*12,
  completedTickets: 340 + Math.floor(Math.random()*50),
  pendingTickets: 20 + Math.floor(Math.random()*25),
  avgProcessingTime: 3.5 + Math.random()*2.2,
  budgetUtilization: 60 + Math.random()*30,
  overbudgetAlerts: 3 + Math.floor(Math.random()*6)
});

const generateSampleUsers = () => [
  { id: 1, name: 'Juan Carlos Pérez Morales', ministry: 'education', position: 'Director de Tecnología', efficiency: 91.5, budget: 85000, spent: 72100, tickets: 18, lastActive: new Date() },
  { id: 2, name: 'María Elena García López', ministry: 'health', position: 'Coordinadora de Proyectos', efficiency: 94.2, budget: 125000, spent: 108750, tickets: 24, lastActive: new Date() },
  { id: 3, name: 'Roberto Silva Hernández', ministry: 'infrastructure', position: 'Jefe de Obras', efficiency: 76.8, budget: 280000, spent: 248200, tickets: 31, lastActive: new Date() },
  { id: 4, name: 'Ana Patricia López Rivera', ministry: 'security', position: 'Analista de Seguridad', efficiency: 88.7, budget: 95000, spent: 79800, tickets: 19, lastActive: new Date() },
  { id: 5, name: 'Carlos Eduardo Mendoza Cruz', ministry: 'agriculture', position: 'Especialista Agrícola', efficiency: 93.1, budget: 67000, spent: 58290, tickets: 16, lastActive: new Date() },
  { id: 6, name: 'Laura Sofía Morales Castillo', ministry: 'economy', position: 'Economista Senior', efficiency: 89.4, budget: 78000, spent: 67080, tickets: 14, lastActive: new Date() },
  { id: 7, name: 'Diego Alejandro Herrera Méndez', ministry: 'infrastructure', position: 'Ingeniero Civil', efficiency: 81.3, budget: 145000, spent: 132250, tickets: 22, lastActive: new Date() },
  { id: 8, name: 'Sofía Gabriela Ramírez Torres', ministry: 'health', position: 'Administradora Hospitalaria', efficiency: 96.2, budget: 89000, spent: 75650, tickets: 17, lastActive: new Date() },
  { id: 9, name: 'Miguel Ángel Rodríguez Sánchez', ministry: 'education', position: 'Coordinador Académico', efficiency: 84.9, budget: 72000, spent: 64800, tickets: 13, lastActive: new Date() },
  { id: 10, name: 'Claudia Beatriz Vargas Morales', ministry: 'security', position: 'Especialista en Ciberseguridad', efficiency: 92.7, budget: 98000, spent: 81340, tickets: 20, lastActive: new Date() }
];

const generateSampleTrendData = () => {
  const data = [];
  for (let i = 179; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const base = 15000 + (179 - i) * 50;
    const weekly = Math.sin((179 - i)/7 * Math.PI) * 1200;
    const rnd = (Math.random() - 0.5) * 2000;
    const spent = Math.max(3000, base + weekly + rnd);
    const budget = spent * (1.1 + Math.random() * 0.3);
    data.push({ date: d.toISOString().split('T')[0], spent: Math.floor(spent), budget: Math.floor(budget) });
  }
  return data;
};

const EXPENSE_TYPES = ['Hotel','Alimentación','Hospedaje','Transporte','Combustible','Peajes','Estacionamiento','Otros'];

const generateSampleTransactions = () => {
  const users = generateSampleUsers();
  const tx = [];
  for (let i = 0; i < 60; i++) {
    const u = users[Math.floor(Math.random()*users.length)];
    const type = EXPENSE_TYPES[Math.floor(Math.random()*EXPENSE_TYPES.length)];
    const date = new Date(); date.setDate(date.getDate() - Math.floor(Math.random()*180));
    tx.push({
      id: `TXN-${String(2025001+i).padStart(7,'0')}`,
      user: u.name, userId: u.id,
      ministry: 'Ministerio', ministryCode: 'MIN',
      type,
      amount: Math.floor(Math.random()*45000)+5000,
      priority: ['high','medium','low'][Math.floor(Math.random()*3)],
      status: ['completed','pending','approved','in_progress','rejected'][Math.floor(Math.random()*5)],
      date, description: `Gasto de ${type.toLowerCase()} para operaciones`, approver: 'Director', budgetCode: `MIN-${String(Math.floor(Math.random()*9999)).padStart(4,'0')}`
    });
  }
  return tx.sort((a,b)=>b.date-a.date);
};

/* ================================
   DOM & INIT
================================ */

let elements = {};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Chart === 'undefined') return; // fallback más abajo
  initializeDashboard();
});

function initializeDashboard() {
  cacheElements();
  attachListeners();
  setupTheme();
  loadDashboardData();
  addAnimations();
}

function cacheElements() {
  elements = {
    // layout
    loadingState: document.getElementById('loadingState'),
    mainContent: document.getElementById('mainContent'),
    body: document.getElementById('body'),
    // header controls
    dateRangeFilter: document.getElementById('dateRangeFilter'),
    refreshButton: document.getElementById('refreshButton'),
    refreshIcon: document.getElementById('refreshIcon'),
    themeToggle: document.getElementById('themeToggle'),
    moonIcon: document.getElementById('moonIcon'),
    sunIcon: document.getElementById('sunIcon'),
    // stats
    totalBudget: document.getElementById('totalBudget'),
    budgetChange: document.getElementById('budgetChange'),
    activeTickets: document.getElementById('activeTickets'),
    ticketsChange: document.getElementById('ticketsChange'),
    activeUsers: document.getElementById('activeUsers'),
    usersChange: document.getElementById('usersChange'),
    efficiency: document.getElementById('efficiency'),
    efficiencyChange: document.getElementById('efficiencyChange'),
    // charts
    monthlySpendChart: document.getElementById('monthlySpendChart') || document.getElementById('monthlyExpensesChart'),
    budgetTrendChart: document.getElementById('budgetTrendChart'),
    topUsersChart: document.getElementById('topUsersChart'),
    budgetStatusChart: document.getElementById('budgetStatusChart'),
    expenseByTypeChart: document.getElementById('expenseByTypeChart'),
    // controls
    trendDaily: document.getElementById('trendDaily'),
    trendWeekly: document.getElementById('trendWeekly'),
    trendMonthly: document.getElementById('trendMonthly'),
    budgetStatusPeriod: document.getElementById('budgetStatusPeriod'),
    expenseTypeUserFilter: document.getElementById('expenseTypeUserFilter') || document.getElementById('expenseByTypeUserFilter'),
    // tables & lists
    transactionsTable: document.getElementById('transactionsTable'),
    exportTransactions: document.getElementById('exportTransactions'),
    userPerformanceList: document.getElementById('userPerformanceList'),
    performanceMetric: document.getElementById('performanceMetric'),
    // footer
    totalTickets: document.getElementById('totalTickets'),
    completedTickets: document.getElementById('completedTickets'),
    pendingTickets: document.getElementById('pendingTickets'),
    avgProcessingTime: document.getElementById('avgProcessingTime'),
    budgetUtilization: document.getElementById('budgetUtilization'),
    overbudgetAlerts: document.getElementById('overbudgetAlerts'),
    // alerts
    systemAlerts: document.getElementById('systemAlerts')
  };
}

function attachListeners() {
  elements.themeToggle?.addEventListener('click', toggleTheme);
  elements.refreshButton?.addEventListener('click', refreshDashboard);
  elements.dateRangeFilter?.addEventListener('change', e => { dashboardState.dateRange = parseInt(e.target.value); loadDashboardData(); });
  elements.trendDaily?.addEventListener('click', () => setTrendPeriod('daily'));
  elements.trendWeekly?.addEventListener('click', () => setTrendPeriod('weekly'));
  elements.trendMonthly?.addEventListener('click', () => setTrendPeriod('monthly'));
  elements.performanceMetric?.addEventListener('change', e => { dashboardState.performanceMetric = e.target.value; renderUserPerformance(); });
  elements.exportTransactions?.addEventListener('click', exportTransactionsToCSV);
  elements.budgetStatusPeriod?.addEventListener('change', e => { dashboardState.budgetStatusPeriod = e.target.value; renderBudgetStatusChart(); });
  elements.expenseTypeUserFilter?.addEventListener('change', () => renderExpenseByTypeChart());
}

/* ================================
   TEMA
================================ */

function setupTheme() {
  const saved = localStorage.getItem('dashboard-theme');
  dashboardState.isDark = saved ? saved === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  updateThemeClasses();
}
function toggleTheme() {
  dashboardState.isDark = !dashboardState.isDark;
  localStorage.setItem('dashboard-theme', dashboardState.isDark ? 'dark' : 'light');
  updateThemeClasses();
  Object.values(dashboardState.charts).forEach(ch => ch && updateChartTheme(ch));
}
function updateThemeClasses() {
  elements.body.className = dashboardState.isDark ? 'dark' : 'light';
  if (dashboardState.isDark) { elements.moonIcon?.classList.remove('hidden'); elements.sunIcon?.classList.add('hidden'); }
  else { elements.moonIcon?.classList.add('hidden'); elements.sunIcon?.classList.remove('hidden'); }
}

/* ================================
   CARGA DE DATOS
================================ */

async function loadDashboardData() {
  setLoadingState(true);
  try {
    if (DEMO_MODE) {
      await generateSampleDataset();
      renderAll();
      setLoadingState(false);
      return;
    }

    // API primero; si falla, demo
    const token = localStorage.getItem('authToken');
    if (token) apiService.updateAuthToken(token);

    try {
      const [ov, users, trends, stats, alerts] = await Promise.all([
        apiService.getDashboardOverview(dashboardState.dateRange),
        apiService.getUsers({}),
        apiService.getBudgetTrends({ period: dashboardState.trendPeriod, days: dashboardState.dateRange }),
        apiService.getAdvancedStatistics({ type: 'all', dateRange: dashboardState.dateRange }),
        apiService.getSystemAlerts()
      ]);
      const txResp = await apiService.getTransactions(60, 0);
      const transactions = Array.isArray(txResp) ? txResp : (txResp?.transactions || txResp?.items || []);

      dashboardState.data = {
        overview: ov.overview,
        comparison: ov.comparison,
        users: users.users,
        trendData: trends.trends,
        transactions,
        alerts: alerts.alerts
      };
      showSuccess('Datos cargados desde la API');
    } catch (e) {
      console.warn('Fallo API, usando demo:', e);
      await generateSampleDataset();
      showError('Usando datos de ejemplo (modo demo)');
    }

    renderAll();
  } catch (e) {
    console.error(e);
    await generateSampleDataset();
    renderAll();
  } finally {
    setLoadingState(false);
  }
}

async function generateSampleDataset() {
  await new Promise(r => setTimeout(r, 300));
  const overview = generateSampleOverview();
  const users = generateSampleUsers();
  const trendData = generateSampleTrendData();
  const transactions = generateSampleTransactions();

  // Prepara estructura mensual (últimos 6 meses) para el donut
  const now = new Date();
  const months = [];
  const palette = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#0EA5E9'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('es-GT', { month: 'short' });
    const year = d.getFullYear();
    // suma de spent de ese mes (a partir de trendData)
    const monthSpent = trendData
      .filter(t => {
        const td = toDate(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      })
      .reduce((acc, t) => acc + t.spent, 0);
    months.push({ label: `${key} ${year}`, value: Math.round(monthSpent), color: palette[(5 - i) % palette.length]+'E6', stroke: palette[(5 - i) % palette.length] });
  }

  dashboardState.data = {
    overview,
    comparison: { budgetChange: 12.5, ticketsChange: -3.2, usersChange: 8.1, efficiencyChange: 5.7 },
    users,
    trendData,
    monthly: months,
    transactions,
    alerts: [
      { type: 'warning', title: 'Presupuesto Alto', message: `${users.filter(u => (u.spent/u.budget)>0.9).length} usuarios superan 90%.` },
      { type: 'info', title: 'Mantenimiento', message: 'Domingo 2:00–6:00 AM.' },
      { type: 'error', title: 'Tickets Pendientes', message: `${transactions.filter(t => t.status==='pending').length} por aprobar.` }
    ]
  };
}

function setLoadingState(loading) {
  dashboardState.loading = loading;
  elements.loadingState?.classList.toggle('hidden', !loading);
  elements.mainContent?.classList.toggle('hidden', loading);
  elements.refreshIcon?.classList.toggle('animate-spin', loading);
}
async function refreshDashboard() { await loadDashboardData(); }

function renderAll() {
  renderOverviewCards();
  renderMonthlySpendChart();
  renderBudgetTrendChart();
  renderTopUsersChart();
  renderBudgetStatusChart();
  populateExpenseByTypeUserFilter();
  renderExpenseByTypeChart();
  renderTransactionsTable();
  renderUserPerformance();
  renderFooterStats();
  renderSystemAlerts();
}

/* ================================
   RENDER: CARDS
================================ */

function animateCounter(el, target, prefix = '', suffix = '') {
  if (!el) return;
  const dur = 900, inc = target / (dur/16); let cur = 0;
  el.classList.add('loading');
  const t = setInterval(() => {
    cur += inc; if (cur >= target) { cur = target; clearInterval(t); el.classList.remove('loading'); }
    if (prefix==='Q') el.textContent = `Q${Math.floor(cur).toLocaleString()}`;
    else if (suffix==='%') el.textContent = `${cur.toFixed(1)}%`;
    else el.textContent = `${Math.floor(cur)}`;
  },16);
}

function updateChangeIndicator(el, pct, isPos) {
  if (!el) return;
  el.textContent = `${isPos?'+':''}${Number(pct).toFixed(1)}%`;
  el.className = 'stat-change';
  if (isPos) { el.style.background='rgba(16,185,129,0.2)'; el.style.color='#10b981'; el.style.borderColor='rgba(16,185,129,0.3)'; }
  else { el.style.background='rgba(239,68,68,0.2)'; el.style.color='#ef4444'; el.style.borderColor='rgba(239,68,68,0.3)'; }
}

function renderOverviewCards() {
  const d = dashboardState.data.overview, c = dashboardState.data.comparison || {};
  animateCounter(elements.totalBudget, d.totalBudget, 'Q');
  animateCounter(elements.activeTickets, d.activeTickets);
  animateCounter(elements.activeUsers, d.activeUsers);
  animateCounter(elements.efficiency, d.efficiency, '', '%');
  updateChangeIndicator(elements.budgetChange, c.budgetChange ?? 12.5, (c.budgetChange ?? 12.5) > 0);
  updateChangeIndicator(elements.ticketsChange, c.ticketsChange ?? -3.2, (c.ticketsChange ?? -3.2) > 0);
  updateChangeIndicator(elements.usersChange, c.usersChange ?? 8.1, (c.usersChange ?? 8.1) > 0);
  updateChangeIndicator(elements.efficiencyChange, c.efficiencyChange ?? 5.7, (c.efficiencyChange ?? 5.7) > 0);
}

/* ================================
   RENDER: CHARTS
================================ */

/** Dona: Gastos por Mes (últimos 6) con texto central auto-ajustable */
function renderMonthlySpendChart() {
  if (!elements.monthlySpendChart) return;
  const ctx = elements.monthlySpendChart.getContext('2d');
  const months = dashboardState.data.monthly || [];
  const labels = months.map(m => `${m.label} (Q${m.value.toLocaleString()})`);
  const values = months.map(m => m.value);
  const bg = months.map(m => m.color);
  const stroke = months.map(m => m.stroke);

  if (dashboardState.charts.monthlySpend) dashboardState.charts.monthlySpend.destroy();

  const total = values.reduce((a,b)=>a+b,0);
  // estado interno para mostrar total/mes al hover
  let center = { title: 'Total', value: total };

  dashboardState.charts.monthlySpend = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: bg, borderColor: stroke, borderWidth: 0, hoverOffset: 10 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: dashboardState.isDark ? '#E2E8F0' : '#374151',
            padding: 18,
            usePointStyle: true,
            generateLabels(chart) {
              const ds = chart.data.datasets[0];
              return chart.data.labels.map((l, i) => ({
                text: l,
                fillStyle: ds.backgroundColor[i],
                strokeStyle: ds.borderColor[i],
                lineWidth: 0,
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: dashboardState.isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)',
          titleColor: dashboardState.isDark ? '#E2E8F0' : '#374151',
          bodyColor: dashboardState.isDark ? '#E2E8F0' : '#374151',
          borderColor: dashboardState.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          callbacks: {
            label: c => `${c.label.split(' (')[0]}: Q${Number(c.raw).toLocaleString()}`
          }
        }
      },
      // Cambia el contenido del centro al pasar/retirar hover
      onHover: (evt, activeEls) => {
        if (activeEls && activeEls.length) {
          const i = activeEls[0].index;
          center = { title: months[i].label, value: values[i] };
        } else {
          center = { title: 'Total', value: total };
        }
        dashboardState.charts.monthlySpend.draw();
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta?.data?.length) return;
        const cx = meta.data[0].x;
        const cy = meta.data[0].y;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = `Q${center.value.toLocaleString()}`;
        const title = center.title;

        // Tamaño máximo basado en el radio interior (cutout)
        const arc = meta.data[0];
        const innerRadius = arc.innerRadius || (arc.circumference ? arc.circumference : 0) || 0;

        // Ajuste dinámico de fuente para que el número no se desborde
        let fontPx = Math.max(12, Math.floor(innerRadius * 0.35)); // número grande
        ctx.font = `600 ${fontPx}px sans-serif`;

        // Reduce hasta que quepa dentro del diámetro interno * 0.9
        const maxWidth = innerRadius * 1.8 * 0.9;
        while (ctx.measureText(label).width > maxWidth && fontPx > 12) {
          fontPx -= 2;
          ctx.font = `600 ${fontPx}px sans-serif`;
        }

        ctx.fillStyle = dashboardState.isDark ? '#E2E8F0' : '#374151';
        ctx.fillText(label, cx, cy - fontPx * 0.2);

        // Título (mes o "Total")
        ctx.font = `400 ${Math.max(10, Math.floor(fontPx * 0.5))}px sans-serif`;
        ctx.fillStyle = dashboardState.isDark ? '#94A3B8' : '#6B7280';
        ctx.fillText(title, cx, cy + fontPx * 0.65);

        ctx.restore();
      }
    }]
  });
}

function renderBudgetTrendChart() {
  if (!elements.budgetTrendChart) return;
  const ctx = elements.budgetTrendChart.getContext('2d');
  const data = dashboardState.data.trendData.slice(-30);
  dashboardState.charts.budgetTrend?.destroy();
  dashboardState.charts.budgetTrend = new Chart(ctx, {
    type:'line',
    data:{
      labels:data.map(i=>new Date(i.date).toLocaleDateString('es-GT',{month:'short',day:'numeric'})),
      datasets:[
        { label:'Gastado', data:data.map(i=>i.spent), borderColor:'#3B82F6', backgroundColor:'rgba(59,130,246,0.1)', fill:true, tension:0.4, pointRadius:4, pointBackgroundColor:'#3B82F6', pointBorderColor:'#1E40AF', pointBorderWidth:2 },
        { label:'Presupuesto', data:data.map(i=>i.budget), borderColor:'#8B5CF6', backgroundColor:'rgba(139,92,246,0.1)', fill:false, tension:0.4, pointRadius:4, pointBackgroundColor:'#8B5CF6', pointBorderColor:'#7C3AED', pointBorderWidth:2, borderDash:[5,5] }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color: dashboardState.isDark?'#E2E8F0':'#374151', usePointStyle:true, padding:20 } },
        tooltip:{ backgroundColor: dashboardState.isDark?'rgba(0,0,0,0.9)':'rgba(255,255,255,0.95)', titleColor: dashboardState.isDark?'#E2E8F0':'#374151', bodyColor: dashboardState.isDark?'#E2E8F0':'#374151', borderColor: dashboardState.isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)', borderWidth:1, callbacks:{ label: c => `${c.dataset.label}: Q${c.raw.toLocaleString()}` } } },
      scales:{ y:{ beginAtZero:true, grid:{ color: dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.8)' }, ticks:{ color: dashboardState.isDark?'#94A3B8':'#6B7280', callback:v=>'Q'+Number(v).toLocaleString() } }, x:{ grid:{ color: dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.8)' }, ticks:{ color: dashboardState.isDark?'#94A3B8':'#6B7280' } } },
      animation:{ duration:1000, easing:'easeOutQuart' }
    }
  });
}

function renderTopUsersChart() {
  if (!elements.topUsersChart) return;
  const ctx = elements.topUsersChart.getContext('2d');
  const users = [...dashboardState.data.users].sort((a,b)=>b.spent-a.spent).slice(0,8);
  dashboardState.charts.topUsers?.destroy();
  dashboardState.charts.topUsers = new Chart(ctx, {
    type:'bar',
    data:{ labels: users.map(u=>u.name.split(' ').slice(0,2).join(' ')),
      datasets:[{ label:'Gasto Total', data: users.map(u=>u.spent), backgroundColor: users.map((_,i)=>`hsl(${(220+i*30)%360},70%,${Math.max(30,60-i*3)}%)`), borderRadius:6, borderSkipped:false }] },
    options:{
      responsive:true, maintainAspectRatio:false, indexAxis:'y',
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor: dashboardState.isDark?'rgba(0,0,0,0.9)':'rgba(255,255,255,0.95)', titleColor: dashboardState.isDark?'#E2E8F0':'#374151', bodyColor: dashboardState.isDark?'#E2E8F0':'#374151', borderColor: dashboardState.isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)', borderWidth:1,
        callbacks:{ label(c){ const u=users[c.dataIndex]; const p=((u.spent/u.budget)*100).toFixed(1); return [`Gastado: Q${c.raw.toLocaleString()}`, `Presupuesto: Q${u.budget.toLocaleString()}`, `Utilización: ${p}%`, `Eficiencia: ${u.efficiency.toFixed(1)}%`]; } } } },
      scales:{ x:{ beginAtZero:true, grid:{ color: dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.8)' }, ticks:{ color: dashboardState.isDark?'#94A3B8':'#6B7280', callback:v=>'Q'+(Number(v)/1000).toFixed(0)+'K' } }, y:{ grid:{display:false}, ticks:{ color: dashboardState.isDark?'#94A3B8':'#6B7280' } } },
      animation:{ duration:1200, easing:'easeOutBack' }
    }
  });
}

function renderBudgetStatusChart() {
  if (!elements.budgetStatusChart) return;
  const ctx = elements.budgetStatusChart.getContext('2d');
  const o = dashboardState.data.overview;
  const used = (o.totalSpent / o.totalBudget) * 100; const rem = 100 - used;
  dashboardState.charts.budgetStatus?.destroy();
  dashboardState.charts.budgetStatus = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:['Utilizado','Disponible'], datasets:[{ data:[used,rem], backgroundColor:[ used>80?'#EF4444': used>60?'#F59E0B':'#10B981', dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.5)'], borderWidth:0, cutout:'70%' }] },
    options:{ responsive:true, maintainAspectRatio:false, rotation:-90, circumference:180, plugins:{ legend:{display:false}, tooltip:{ backgroundColor: dashboardState.isDark?'rgba(0,0,0,0.9)':'rgba(255,255,255,0.95)', titleColor: dashboardState.isDark?'#E2E8F0':'#374151', bodyColor: dashboardState.isDark?'#E2E8F0':'#374151', borderColor: dashboardState.isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)', borderWidth:1, callbacks:{ label(ctx){ if(ctx.dataIndex===0) return `Utilizado: ${used.toFixed(1)}% (Q${o.totalSpent.toLocaleString()})`; const avail=o.totalBudget-o.totalSpent; return `Disponible: ${rem.toFixed(1)}% (Q${avail.toLocaleString()})`; } } } }, animation:{ duration:800 } },
    plugins:[{ id:'centerText', beforeDraw(chart){ const {width,height,ctx}=chart; ctx.save(); const f=(height/114).toFixed(2); ctx.font=`bold ${f}em sans-serif`; ctx.textBaseline='middle'; ctx.fillStyle=dashboardState.isDark?'#E2E8F0':'#374151'; const t=`${used.toFixed(1)}%`; const x=(width-ctx.measureText(t).width)/2; const y=height/2+20; ctx.fillText(t,x,y); ctx.font=`${(f*0.6)}em sans-serif`; ctx.fillStyle=dashboardState.isDark?'#94A3B8':'#6B7280'; const sub='Utilizado'; const sx=(width-ctx.measureText(sub).width)/2; ctx.fillText(sub,sx,y+25); ctx.restore(); } }]
  });
}

/* ===== Gasto por tipo (todos/usuario) ===== */

const EXPENSE_COLORS = {
  'Hotel': ['rgba(59,130,246,0.8)', '#3B82F6'],
  'Alimentación': ['rgba(16,185,129,0.8)', '#10B981'],
  'Hospedaje': ['rgba(245,158,11,0.8)', '#F59E0B'],
  'Transporte': ['rgba(239,68,68,0.8)', '#EF4444'],
  'Combustible': ['rgba(139,92,246,0.8)', '#8B5CF6'],
  'Peajes': ['rgba(236,72,153,0.8)', '#EC4899'],
  'Estacionamiento': ['rgba(34,197,94,0.8)', '#22C55E'],
  'Otros': ['rgba(14,165,233,0.8)', '#0EA5E9']
};

function computeExpenseByType(userVal='all') {
  const tx = dashboardState.data.transactions || [];
  const filtered = userVal==='all' ? tx : tx.filter(t => String(t.userId)===String(userVal));
  const totals = new Map(EXPENSE_TYPES.map(k => [k, { amount:0, count:0 }]));
  let total = 0;
  for (const t of filtered) {
    const k = totals.has(t.type) ? t.type : 'Otros';
    const ref = totals.get(k); const a = Number(t.amount)||0;
    ref.amount += a; ref.count += 1; total += a;
  }
  return { items: EXPENSE_TYPES.map(k=>({ label:k, ...totals.get(k) })), total };
}

function renderExpenseByTypeChart() {
  if (!elements.expenseByTypeChart) return;
  const userVal = elements.expenseTypeUserFilter?.value || 'all';
  const { items, total } = computeExpenseByType(userVal);
  const ctx = elements.expenseByTypeChart.getContext('2d');
  dashboardState.charts.expenseByType?.destroy();
  dashboardState.charts.expenseByType = new Chart(ctx, {
    type:'polarArea',
    data:{ labels: items.map(i=>i.label), datasets:[{ data: items.map(i=>i.amount), backgroundColor: items.map(i=>EXPENSE_COLORS[i.label][0]), borderColor: items.map(i=>EXPENSE_COLORS[i.label][1]), borderWidth:2 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color: dashboardState.isDark?'#E2E8F0':'#374151', padding:15, usePointStyle:true } },
        tooltip:{ backgroundColor: dashboardState.isDark?'rgba(0,0,0,0.9)':'rgba(255,255,255,0.95)', titleColor: dashboardState.isDark?'#E2E8F0':'#374151', bodyColor: dashboardState.isDark?'#E2E8F0':'#374151', borderColor: dashboardState.isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)', borderWidth:1,
          callbacks:{ label(ctx){ const i=items[ctx.dataIndex]; const pct = total>0 ? (i.amount/total*100).toFixed(1) : '0.0'; return [`${ctx.label}`, `Monto: Q${Number(ctx.raw).toLocaleString()}`, `Participación: ${pct}%`, `# Transacciones: ${i.count}`]; }, footer:()=>`Total: Q${Number(total).toLocaleString()}` } } },
      scales:{ r:{ beginAtZero:true, grid:{ color: dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.8)' }, angleLines:{ color: dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.8)' }, pointLabels:{ color: dashboardState.isDark?'#94A3B8':'#6B7280', font:{ size:11 } }, ticks:{ color: dashboardState.isDark?'#94A3B8':'#6B7280', backdropColor:'transparent', callback:v=>'Q'+(Number(v)/1000).toFixed(0)+'K' } } },
      animation:{ duration:1200, easing:'easeOutElastic' }
    }
  });
}

function populateExpenseByTypeUserFilter() {
  if (!elements.expenseTypeUserFilter) return;
  const sel = elements.expenseTypeUserFilter;
  const users = dashboardState.data.users || [];
  sel.innerHTML = `<option value="all" selected>Todos los usuarios</option>` +
    users.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
}

/* ================================
   TABLAS / LISTAS / ALERTAS
================================ */

function renderTransactionsTable() {
  if (!elements.transactionsTable) return;
  const tx = (dashboardState.data.transactions || []).slice(0,10);
  elements.transactionsTable.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Usuario</th><th>Ministerio</th><th>Tipo</th>
        <th>Monto</th><th>Prioridad</th><th>Estado</th><th>Fecha</th>
      </tr></thead>
      <tbody>
        ${tx.map(t=>`
          <tr onclick="showTransactionDetail('${esc(t.id)}')">
            <td class="font-mono text-xs">${esc(t.id)}</td>
            <td class="font-medium">${esc(t.user)}</td>
            <td class="text-sm">${esc(t.ministryCode)}</td>
            <td class="text-sm">${esc(t.type)}</td>
            <td class="font-mono font-semibold">Q${Number(t.amount).toLocaleString()}</td>
            <td><span class="status-icon status-${esc(t.priority)}"></span>${t.priority==='high'?'Alta':t.priority==='medium'?'Media':'Baja'}</td>
            <td><span class="status-icon status-${esc(t.status)}"></span>${getStatusText(t.status)}</td>
            <td class="text-xs opacity-70">${toDate(t.date).toLocaleDateString('es-GT',{month:'short',day:'numeric',year:'2-digit'})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderUserPerformance() {
  if (!elements.userPerformanceList) return;
  const metric = dashboardState.performanceMetric;
  const users = [...(dashboardState.data.users||[])].sort((a,b)=>{
    if (metric==='efficiency') return b.efficiency - a.efficiency;
    if (metric==='budget') return (b.spent/b.budget) - (a.spent/a.budget);
    return b.tickets - a.tickets;
  });

  const metricVal = u => metric==='efficiency' ? `${u.efficiency.toFixed(1)}%` : metric==='budget' ? `${((u.spent/u.budget)*100).toFixed(1)}%` : u.tickets;
  const progress = u => metric==='efficiency' ? u.efficiency : metric==='budget' ? (u.spent/u.budget)*100 : (u.tickets/35)*100;

  elements.userPerformanceList.innerHTML = users.map((u,i)=>{
    const initials = u.name.split(' ').map(n=>n[0]).join('');
    return `
      <div class="performance-item stagger-${i+1}">
        <div class="performance-avatar">${esc(initials)}</div>
        <div class="flex-1 mx-4">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-sm">${esc(u.name)}</span>
            <span class="text-sm font-mono font-semibold">${metricVal(u)}</span>
          </div>
          <div class="performance-progress"><div class="performance-bar" style="width:${Math.min(progress(u),100)}%"></div></div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs opacity-70">${esc(u.position||'Usuario')}</span>
            <span class="text-xs opacity-70">#${i+1}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFooterStats() {
  const d = dashboardState.data.overview;
  animateCounter(elements.totalTickets, d.activeTickets + d.completedTickets);
  animateCounter(elements.completedTickets, d.completedTickets);
  animateCounter(elements.pendingTickets, d.pendingTickets);
  animateCounter(elements.budgetUtilization, d.budgetUtilization, '', '%');
  animateCounter(elements.overbudgetAlerts, d.overbudgetAlerts);
  setTimeout(()=>{ if (elements.avgProcessingTime) elements.avgProcessingTime.textContent = `${d.avgProcessingTime.toFixed(1)}d`; }, 300);
}

function renderSystemAlerts() {
  if (!elements.systemAlerts) return;
  const alerts = dashboardState.data.alerts || [];
  elements.systemAlerts.innerHTML = alerts.map(a=>`<div class="alert alert-${esc(a.type)}"><strong>${esc(a.title)}:</strong> ${esc(a.message)}</div>`).join('');
}

/* ================================
   OTROS HELPERS
================================ */

function getStatusText(s) {
  const map = { completed:'Completado', pending:'Pendiente', approved:'Aprobado', in_progress:'En Proceso', rejected:'Rechazado' };
  return map[s] || s;
}
function showTransactionDetail(id) {
  const t = (dashboardState.data.transactions||[]).find(x=>x.id===id);
  if (!t) return;
  alert(`Detalles de ${id}:\n\nUsuario: ${t.user}\nTipo: ${t.type}\nMonto: Q${Number(t.amount).toLocaleString()}\nDescripción: ${t.description}\nFecha: ${toDate(t.date).toLocaleDateString('es-GT')}\nAprobador: ${t.approver}`);
}
function setTrendPeriod(p) {
  dashboardState.trendPeriod = p;
  document.querySelectorAll('[id^="trend"]').forEach(b=>b.className='chart-btn btn-secondary');
  const active = document.getElementById(`trend${p.charAt(0).toUpperCase()+p.slice(1)}`);
  if (active) active.className = 'chart-btn btn-primary';
  renderBudgetTrendChart();
}
function updateChartTheme(chart){
  if (chart.options?.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = dashboardState.isDark ? '#E2E8F0' : '#374151';
  if (chart.options?.scales) Object.values(chart.options.scales).forEach(s=>{ if (s.grid) s.grid.color = dashboardState.isDark?'rgba(71,85,105,0.3)':'rgba(229,231,235,0.8)'; if (s.ticks) s.ticks.color = dashboardState.isDark?'#94A3B8':'#6B7280'; });
  chart.update('none');
}

function exportTransactionsToCSV() {
  const tx = dashboardState.data.transactions || [];
  const headers = ['ID','Usuario','Ministerio','Tipo','Monto','Prioridad','Estado','Fecha','Descripcion','Codigo_Presupuesto'];
  const rows = tx.map(t=>[ t.id, t.user, t.ministry, t.type, Number(t.amount), t.priority, t.status, toDate(t.date).toISOString().split('T')[0], t.description, t.budgetCode ].map(csvSafe).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`transacciones_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  showSuccess('Archivo CSV exportado correctamente');
}

/* ================================
   UI Helpers
================================ */

function addAnimations(){ document.querySelectorAll('.grid > div').forEach((c,i)=>c.classList.add('fade-in-up',`stagger-${i+1}`)); }
function showSuccess(m){ showNotification(m,'success'); }
function showError(m){ showNotification(m,'error'); }
function showNotification(message,type){
  const n=document.createElement('div'); n.className='fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg max-w-md transition-all duration-300';
  if (type==='success'){ n.style.background='rgba(16,185,129,0.1)'; n.style.border='1px solid rgba(16,185,129,0.2)'; n.style.color='#10b981'; }
  else { n.style.background='rgba(239,68,68,0.1)'; n.style.border='1px solid rgba(239,68,68,0.2)'; n.style.color='#ef4444'; }
  n.innerHTML = `<div style="display:flex;align-items:center;gap:12px;"><span>${type==='success'?'✓':'⚠'}</span><span>${esc(message)}</span></div>`;
  n.style.transform='translateX(100%)'; document.body.appendChild(n);
  setTimeout(()=>{ n.style.transform='translateX(0)'; },100);
  setTimeout(()=>{ n.style.opacity='0'; n.style.transform='translateX(20px)'; setTimeout(()=>{ n.remove(); },300); },4000);
}

/* ================================
   GLOBAL & FALLBACK CHART.JS
================================ */

window.DashboardApp = { dashboardState, refreshDashboard, loadDashboardData };

if (typeof Chart === 'undefined') {
  const sources = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js',
    'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js'
  ];
  const tryLoad = (i=0) => {
    if (i>=sources.length) return showError('No se pudo cargar Chart.js');
    const s=document.createElement('script'); s.src=sources[i];
    s.onload=()=>{ (document.readyState==='complete'||document.readyState==='interactive') ? initializeDashboard() : document.addEventListener('DOMContentLoaded',initializeDashboard); };
    s.onerror=()=>tryLoad(i+1); document.head.appendChild(s);
  };
  (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded',()=>tryLoad(0)) : tryLoad(0);
}
