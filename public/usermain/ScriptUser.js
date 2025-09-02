// Datos de ejemplo
const SAMPLE_TICKETS = [
    {
        id: "TK-2025-001",
        ministerio: "Ministerio de Educación",
        descripcion: "Capacitación docente en Quetzaltenango",
        monto: "2500.00",
        moneda: "Q",
        fechaCreacion: "28/08/2025",
        fechaVencimiento: "15/09/2025",
        estado: "activo",
        gastado: "850.00"
    },
    {
        id: "TK-2025-002", 
        ministerio: "Ministerio de Salud",
        descripcion: "Supervisión hospitales regionales",
        monto: "3200.00",
        moneda: "Q",
        fechaCreacion: "25/08/2025",
        fechaVencimiento: "10/09/2025",
        estado: "activo",
        gastado: "1200.00"
    },
    {
        id: "TK-2025-003",
        ministerio: "Ministerio de Agricultura",
        descripcion: "Evaluación proyectos agrícolas en Petén",
        monto: "4100.00",
        moneda: "Q",
        fechaCreacion: "20/08/2025",
        fechaVencimiento: "05/09/2025",
        estado: "proximo_vencer",
        gastado: "0.00"
    },
    {
        id: "TK-2025-004",
        ministerio: "Ministerio de Economía",
        descripcion: "Reuniones comerciales internacionales",
        monto: "1800.00",
        moneda: "Q",
        fechaCreacion: "15/08/2025",
        fechaVencimiento: "02/09/2025",
        estado: "completado",
        gastado: "1800.00"
    }
];

// Variables de estado
let isDark = true;
let selectedFilter = "todos";
let showProfile = false;

// Referencias a elementos DOM
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const statsGrid = document.getElementById('statsGrid');
const filters = document.getElementById('filters');
const ticketsGrid = document.getElementById('ticketsGrid');
const noData = document.getElementById('noData');
const noDataSubtext = document.getElementById('noDataSubtext');

// Funciones de utilidad
function getGastadoPercentage(gastado, monto) {
    return (parseFloat(gastado) / parseFloat(monto)) * 100;
}

function getEstadoColor(estado) {
    switch (estado) {
        case "activo":
            return "status-active";
        case "proximo_vencer":
            return "status-expiring";
        case "completado":
            return "status-completed";
        default:
            return "status-active";
    }
}

function getEstadoTexto(estado) {
    switch (estado) {
        case "activo":
            return "Activo";
        case "proximo_vencer":
            return "Próximo a vencer";
        case "completado":
            return "Completado";
        default:
            return "Desconocido";
    }
}

function formatNumber(num) {
    return parseFloat(num).toLocaleString();
}

// Funciones de renderizado
function renderStats() {
    const activosCount = SAMPLE_TICKETS.filter(t => t.estado === "activo").length;
    const totalMonto = SAMPLE_TICKETS.reduce((sum, t) => sum + parseFloat(t.monto), 0);
    const totalGastado = SAMPLE_TICKETS.reduce((sum, t) => sum + parseFloat(t.gastado), 0);
    const proximosVencer = SAMPLE_TICKETS.filter(t => t.estado === "proximo_vencer").length;

    const stats = [
        {
            icon: "green",
            svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
            number: activosCount,
            label: "Tickets activos"
        },
        {
            icon: "blue",
            svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />`,
            number: `Q${formatNumber(totalMonto)}`,
            label: "Total disponible"
        },
        {
            icon: "purple",
            svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />`,
            number: `Q${formatNumber(totalGastado)}`,
            label: "Total gastado"
        },
        {
            icon: "yellow",
            svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`,
            number: proximosVencer,
            label: "Por vencer"
        }
    ];

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-content">
                <div class="stat-icon ${stat.icon}">
                    <svg class="stat-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        ${stat.svg}
                    </svg>
                </div>
                <div>
                    <p class="stat-number">${stat.number}</p>
                    <p class="stat-label">${stat.label}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderFilters() {
    const filterOptions = [
        { key: "todos", label: "Todos", count: SAMPLE_TICKETS.length },
        { key: "activos", label: "Activos", count: SAMPLE_TICKETS.filter(t => t.estado === "activo").length },
        { key: "proximo_vencer", label: "Por vencer", count: SAMPLE_TICKETS.filter(t => t.estado === "proximo_vencer").length },
        { key: "completados", label: "Completados", count: SAMPLE_TICKETS.filter(t => t.estado === "completado").length }
    ];

    filters.innerHTML = filterOptions.map(filter => `
        <button class="filter-btn ${selectedFilter === filter.key ? 'active' : ''}" 
                data-filter="${filter.key}">
            ${filter.label} (${filter.count})
        </button>
    `).join('');

    // Agregar event listeners a los filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedFilter = e.target.dataset.filter;
            renderFilters();
            renderTickets();
        });
    });
}

function renderTickets() {
    // Filtrar tickets
    const filteredTickets = SAMPLE_TICKETS.filter(ticket => {
        if (selectedFilter === "todos") return true;
        if (selectedFilter === "activos") return ticket.estado === "activo";
        if (selectedFilter === "proximo_vencer") return ticket.estado === "proximo_vencer";
        if (selectedFilter === "completados") return ticket.estado === "completado";
        return true;
    });

    if (filteredTickets.length === 0) {
        ticketsGrid.style.display = 'none';
        noData.style.display = 'block';
        noDataSubtext.textContent = selectedFilter !== "todos" 
            ? "Prueba cambiando el filtro" 
            : "Espera a que un administrador te asigne tickets";
    } else {
        ticketsGrid.style.display = 'grid';
        noData.style.display = 'none';

        ticketsGrid.innerHTML = filteredTickets.map(ticket => {
            const disponible = parseFloat(ticket.monto) - parseFloat(ticket.gastado);
            const porcentaje = getGastadoPercentage(ticket.gastado, ticket.monto);
            const estadoClass = getEstadoColor(ticket.estado);
            const estadoTexto = getEstadoTexto(ticket.estado);
            const isCompleted = ticket.estado === "completado";

            return `
                <div class="ticket-card">
                    <!-- Header del ticket -->
                    <div class="ticket-header">
                        <div>
                            <h3 class="ticket-title">${ticket.id}</h3>
                            <p class="ticket-ministry">${ticket.ministerio}</p>
                        </div>
                        <span class="ticket-status ${estadoClass}">
                            ${estadoTexto}
                        </span>
                    </div>

                    <!-- Descripción -->
                    <p class="ticket-description">${ticket.descripcion}</p>

                    <!-- Información financiera -->
                    <div class="ticket-budget">
                        <div class="budget-row">
                            <span class="budget-label">Presupuesto</span>
                            <span class="budget-amount budget-total">${ticket.moneda}${formatNumber(ticket.monto)}</span>
                        </div>
                        <div class="budget-row">
                            <span class="budget-label">Gastado</span>
                            <span class="budget-amount budget-spent">${ticket.moneda}${formatNumber(ticket.gastado)}</span>
                        </div>
                        <div class="budget-row">
                            <span class="budget-label">Disponible</span>
                            <span class="budget-amount budget-available">
                                ${ticket.moneda}${formatNumber(disponible.toFixed(2))}
                            </span>
                        </div>

                        <!-- Barra de progreso -->
                        <div class="budget-progress">
                            <div class="budget-fill" style="width: ${porcentaje}%"></div>
                        </div>
                        <p class="budget-percentage">
                            ${porcentaje.toFixed(1)}% utilizado
                        </p>
                    </div>

                    <!-- Fechas -->
                    <div class="ticket-dates">
                        <span>Creado: ${ticket.fechaCreacion}</span>
                        <span>Vence: ${ticket.fechaVencimiento}</span>
                    </div>

                    <!-- Botones de acción -->
                    <div class="ticket-actions">
                        <button class="action-btn primary" ${isCompleted ? 'disabled' : ''}>
                            Agregar Gasto
                        </button>
                        <button class="action-btn secondary">
                            Ver Detalles
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Función para cambiar tema
function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light-theme', !isDark);
    
    // Cambiar icono del tema
    if (isDark) {
        themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
    } else {
        themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />`;
    }
}

// Función para mostrar/ocultar dropdown de perfil
function toggleProfile() {
    showProfile = !showProfile;
    profileDropdown.classList.toggle('show', showProfile);
}

// Event Listeners
themeToggle.addEventListener('click', toggleTheme);
profileBtn.addEventListener('click', toggleProfile);

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        showProfile = false;
        profileDropdown.classList.remove('show');
    }
});

// Inicialización
function init() {
    renderStats();
    renderFilters();
    renderTickets();
}

// Cargar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);